import {
  bot,
  deleteMessageSafe,
  getChatInfo,
  unrestrictChatMember,
} from "@lib/bot";
import { audit, globalEnv, waitUntil } from "@lib/env";
import { html } from "@lib/html-format";
import { qb } from "@lib/qb";
import { ChatConfig, DefaultChatConfig, FormType } from "@shared/types";
import { InlineKeyboard } from "grammy";
import type { Chat } from "grammy/types";
import { WorkersCacheStorage } from "workers-cache-storage";
import * as z from "zod";
import { t } from "./api-context";
import { listChat, listChatAdmin, queryChatConfig, queryChatInfo } from "./db";

const messageCache = WorkersCacheStorage.typed<{
  [K in `answer:${string}:${number}`]: number;
}>("message");
messageCache.defaultTtl = 60 * 60 * 24;

async function sendAnswerMessage(chat: number, message: string, nonce: string) {
  const last = await messageCache.get(`answer:${nonce}:${chat}`);
  if (last) {
    waitUntil(deleteMessageSafe(chat, last));
  }
  const reply_markup = new InlineKeyboard().add(
    InlineKeyboard.text("通过", "accept:" + nonce),
    InlineKeyboard.text("拒绝", "reject:" + nonce),
    InlineKeyboard.text("封禁", "ban:" + nonce)
  );
  const result = await bot.api.sendMessage(chat, message, {
    reply_markup,
    parse_mode: "HTML",
  });
  waitUntil(messageCache.put(`answer:${nonce}:${chat}`, result.message_id));
  return result;
}

const challengeProcedure = t.procedure.use(({ ctx, next }) => {
  const target = Number.parseInt(ctx.start_param ?? "");
  if (isNaN(target)) {
    throw new Error("invalid start_param");
  }
  return next({ ctx: { ...ctx, target_chat: target } });
});
const chatProcedure = t.procedure.input(z.object({ chat_id: z.number() }));
const formProcedure = chatProcedure.input(
  z.object({ form_id: z.string().length(21) })
);

export const router = t.router({
  test: t.router({
    hello: t.procedure
      .input(z.string())
      .query(({ input }) => input.split("").toReversed().join("")),
  }),
  challenge: t.router({
    info: challengeProcedure.query(async ({ ctx }) => {
      if (!ctx.start_param) {
        return;
      }
      return await queryChatInfo(ctx.target_chat, ctx.user.id);
    }),
    config: challengeProcedure.query(async ({ ctx }) => {
      const value = await globalEnv.DB.prepare(
        "SELECT value as json FROM chat_config WHERE chat = ?1"
      )
        .bind(ctx.target_chat)
        .first<{ json: string }>();
      return value ? (JSON.parse(value.json) as ChatConfig) : DefaultChatConfig;
    }),
    reload: challengeProcedure
      .input(z.object({ nonce: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await globalEnv.DB.prepare(
          "UPDATE session SET form = coalesce((SELECT form FROM form WHERE form.chat = ?1), session.form) WHERE chat = ?1 AND user = ?2 AND nonce = ?3"
        )
          .bind(ctx.target_chat, ctx.user.id, input.nonce)
          .run();
        return result.meta.changes;
      }),
    submit: challengeProcedure
      .input(
        z.object({
          nonce: z.string(),
          answer: z.record(z.union([z.string(), z.boolean()])),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const config = await queryChatConfig(ctx.target_chat);
        const [
          { results: chat_info },
          { results: form_info },
          { results: admins },
        ] = await globalEnv.DB.batch([
          globalEnv.DB.prepare(
            qb(
              {
                chat_info: {
                  from: { table: "chat_info" },
                  where: "chat_info.chat = ?1",
                },
              },
              { chat_info: "info" }
            )
          ).bind(ctx.target_chat),
          globalEnv.DB.prepare(
            "UPDATE session SET answer = ?4 WHERE chat = ?1 AND user = ?2 AND nonce = ?3 RETURNING form, nonce"
          ).bind(
            ctx.target_chat,
            ctx.user.id,
            input.nonce,
            JSON.stringify(input.answer)
          ),
          globalEnv.DB.prepare(
            "SELECT private_chat FROM chat_admin JOIN user_private_chat ON chat_admin.user = user_private_chat.user WHERE chat_admin.chat = ?1 AND receive_notification"
          ).bind(ctx.target_chat),
        ]);
        if (form_info.length) {
          const chat = JSON.parse(
            (chat_info[0] as { chat_info: string }).chat_info
          ) as Chat.SupergroupGetChat;
          const lines = [
            // prettier-ignore
            html`用户 <a href="tg://user?id=${ctx.user.id}">${ctx.user.first_name}</a> 在 <b>${chat.title}</b> 群完成了答题`,
          ];
          const [{ form, nonce }] = form_info as {
            form: string;
            nonce: string;
          }[];
          const form_parsed = JSON.parse(form) as FormType;
          for (const page of form_parsed.pages) {
            for (const field of page.fields) {
              if (field.type === "text") {
                lines.push(html`<b>${page.subtitle}:${field.title}</b>`);
                const answer = (input.answer[field.id] + "").trim();
                if (answer)
                  lines.push(html`<blockquote>${answer}</blockquote>`);
                else lines.push(html`<i>内容为空</i>`);
              }
            }
          }
          const message = lines.join("\n").trim().slice(0, 4096);
          console.log(message);
          switch (config.notification_mode) {
            case "private":
              for (const { private_chat: admin } of admins as [
                { private_chat: number },
              ]) {
                waitUntil(
                  sendAnswerMessage(admin, message, nonce).catch(console.error)
                );
              }
              break;
            case "external":
              waitUntil(
                sendAnswerMessage(
                  config.notification_external_chat_id,
                  message,
                  nonce
                ).catch(console.error)
              );
              break;
            case "direct":
              waitUntil(
                (async () => {
                  const result = await sendAnswerMessage(
                    ctx.target_chat,
                    message,
                    nonce
                  );
                  await globalEnv.QUEUE.send(
                    {
                      type: "direct_notification_expired",
                      chat_id: ctx.target_chat,
                      nonce: input.nonce,
                      message_id: result.message_id,
                      target_user: ctx.user.id,
                    },
                    { delaySeconds: config.notification_direct_timeout }
                  );
                  return;
                })().catch(console.error)
              );
              break;
          }
        }
      }),
  }),
  admin: t.router({
    /** 列出所有群 */
    list_chat: t.procedure.query(({ ctx }) => {
      return listChat(ctx.user.id);
    }),
    chat: t.router({
      /** 列出所有管理员 */
      list_admin: chatProcedure.query(async ({ input }) => {
        const list = await listChatAdmin(input.chat_id);
        return Promise.all(
          list.map(async ({ user, private_chat, receive_notification }) => ({
            user,
            info: (await getChatInfo(private_chat)) as Chat.PrivateGetChat,
            receive_notification,
          }))
        );
      }),
      /** 切换通知 */
      toggle_notification: chatProcedure
        .input(z.object({ value: z.boolean(), user: z.number().optional() }))
        .mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "chat_admin_toggle_notification",
            value: input.value,
            user: input.user,
          }).run();
          return input.value;
        }),
      accept: chatProcedure
        .input(z.object({ nonce: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const result = await globalEnv.DB.prepare(
            "DELETE FROM session WHERE chat = ?1 AND nonce = ?2 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?3) RETURNING user, welcome_message"
          )
            .bind(input.chat_id, input.nonce, ctx.user.id)
            .first<{ user: number; welcome_message?: number }>();
          if (!result) throw new Error("no such session");
          if (result.welcome_message)
            waitUntil(deleteMessageSafe(input.chat_id, result.welcome_message));
          await unrestrictChatMember(input.chat_id, result.user);
          return;
        }),
      reject: chatProcedure
        .input(z.object({ nonce: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const result = await globalEnv.DB.prepare(
            "DELETE FROM session WHERE chat = ?1 AND nonce = ?2 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?3) RETURNING user, welcome_message, (SELECT value FROM chat_config WHERE chat_config.chat = session.chat) AS config"
          )
            .bind(input.chat_id, input.nonce, ctx.user.id)
            .first<{
              user: number;
              welcome_message?: number;
              config?: string;
            }>();
          if (!result) throw new Error("no such session");
          if (result.welcome_message)
            waitUntil(deleteMessageSafe(input.chat_id, result.welcome_message));
          const { ban_duration } = {
            ...DefaultChatConfig,
            ...(result.config ? JSON.parse(result.config) : {}),
          } as ChatConfig;
          await bot.api.banChatMember(input.chat_id, result.user, {
            until_date: (Date.now() / 1000 + ban_duration) | 0,
          });
          return;
        }),
      ban: chatProcedure
        .input(z.object({ nonce: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const result = await globalEnv.DB.prepare(
            "DELETE FROM session WHERE chat = ?1 AND nonce = ?2 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?3) RETURNING user, welcome_message"
          )
            .bind(input.chat_id, input.nonce, ctx.user.id)
            .first<{
              user: number;
              welcome_message?: number;
            }>();
          if (!result) throw new Error("no such session");
          if (result.welcome_message)
            waitUntil(deleteMessageSafe(input.chat_id, result.welcome_message));
          await bot.api.banChatMember(input.chat_id, result.user);
          return;
        }),
      /** 读取配置信息 */
      config: chatProcedure.query(async ({ ctx, input }) => {
        const result = await globalEnv.DB.prepare(
          "SELECT value FROM chat_config WHERE chat = ?1 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?2)"
        )
          .bind(input.chat_id, ctx.user.id)
          .first<{ value: string }>();
        return result?.value
          ? (JSON.parse(result.value) as Partial<ChatConfig>)
          : {};
      }),
      /** 更新配置 */
      update_config: chatProcedure
        .input(
          z.object({
            config: ChatConfig.partial(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "chat_config_update",
            value: input.config,
          }).run();
          await queryChatConfig.reset(input.chat_id);
          return;
        }),
      /** 列出表单 */
      list_form: chatProcedure.query(async ({ ctx, input }) => {
        const result = await globalEnv.DB.prepare(
          "SELECT id, content, enabled, (deleted_at is not null) as deleted, created_at, updated_at FROM form WHERE chat = ?1 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?2) ORDER BY deleted ASC, updated_at DESC"
        )
          .bind(input.chat_id, ctx.user.id)
          .all<{
            id: string;
            content: string;
            enabled: boolean;
            deleted: boolean;
            created_at: string;
            updated_at: string;
          }>();
        return result.results.map((item) => ({
          ...item,
          enabled: !!item.enabled,
          content: JSON.parse(item.content) as FormType,
        }));
      }),
      /** 表单编辑api */
      form: t.router({
        /** 启用表单 */
        enable: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_enable",
            id: input.form_id,
          }).run();
          return;
        }),
        /** 更新表单 */
        update: formProcedure
          .input(z.object({ content: FormType }))
          .mutation(async ({ ctx, input }) => {
            await audit(input.chat_id, ctx.user.id, {
              type: "form_update",
              id: input.form_id,
              content: input.content,
            }).run();
            return;
          }),
        /** 删除表单(仅标记) */
        delete: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_delete",
            id: input.form_id,
          }).run();
          return;
        }),
        /** 恢复表单 */
        recover: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_recover",
            id: input.form_id,
          }).run();
          return;
        }),
        /** 永久删除表单 */
        delete_forever: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_delete_forever",
            id: input.form_id,
          }).run();
          return;
        }),
      }),
    }),
  }),
});

export type AppRouter = typeof router;
