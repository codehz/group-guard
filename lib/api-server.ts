import { bot, deleteMessageSafe, unrestrictChatMember } from "@lib/bot";
import { audit, globalEnv, waitUntil } from "@lib/env";
import { html } from "@lib/html-format";
import { ChatConfig, DefaultChatConfig, FormType } from "@shared/types";
import { InlineKeyboard } from "grammy";
import * as z from "zod";
import { t } from "./api-context";
import { listChat, queryChatInfo } from "./db";

const challengeProcedure = t.procedure.use(({ ctx, next }) => {
  const target = Number.parseInt(ctx.start_param ?? "");
  if (isNaN(target)) {
    throw new Error("invalid start_param");
  }
  return next({ ctx: { ...ctx, target_chat: target } });
});
const chatProcedure = t.procedure.input(z.object({ chat_id: z.number() }));
const formProcedure = chatProcedure.input(
  z.object({ form_id: z.string().length(21), language: z.string().optional() })
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
        "SELECT json_group_object(language, json(value)) json FROM chat_config WHERE chat = ?1"
      )
        .bind(ctx.target_chat)
        .first<{ json: string }>();
      return value
        ? (JSON.parse(value.json) as Record<string, ChatConfig>)
        : {};
    }),
    reload: challengeProcedure
      .input(z.object({ language: z.string().optional(), nonce: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await globalEnv.DB.prepare(
          "UPDATE session SET form = coalesce((SELECT form FROM form WHERE form.chat = ?1 AND form.language = coalesce(?4, '')), session.form) WHERE chat = ?1 AND user = ?2 AND nonce = ?3"
        )
          .bind(ctx.target_chat, ctx.user.id, input.nonce, input.language)
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
        const [form_info, admins] = await globalEnv.DB.batch([
          globalEnv.DB.prepare(
            "UPDATE session SET answer = ?4 WHERE chat = ?1 AND user = ?2 AND nonce = ?3 RETURNING form, nonce"
          ).bind(
            ctx.target_chat,
            ctx.user.id,
            input.nonce,
            JSON.stringify(input.answer)
          ),
          globalEnv.DB.prepare(
            "SELECT private_chat FROM chat_admin JOIN user_private_chat ON chat_admin.user = user_private_chat.user WHERE chat_admin.chat = ?1"
          ).bind(ctx.target_chat),
        ]);
        if (form_info.results.length) {
          const userid = ctx.user.id + "";
          const lines = [
            // prettier-ignore
            html`用户 <a href="tg://user?id=${userid}">${ctx.user.first_name}</a>完成了答题`,
          ];
          const [{ form, nonce }] = form_info.results as {
            form: string;
            nonce: string;
          }[];
          const form_parsed = JSON.parse(form) as FormType;
          for (const page of form_parsed.pages) {
            lines.push(html`页面：<b>${page.subtitle}</b>`);
            let written = false;
            for (const field of page.fields) {
              if (field.type === "text") {
                written = true;
                lines.push(html`<b>${field.title}</b>`);
                const answer = (input.answer[field.id] + "").trim();
                lines.push(html`<blockquote>${answer}</blockquote>`);
              }
            }
            if (!written) lines.push(html`<i>该页面没有需要填写的内容</i>`);
          }
          const message = lines.join("\n").trim().slice(0, 4096);
          const reply_markup = new InlineKeyboard().add(
            InlineKeyboard.text("通过", "accept:" + nonce),
            InlineKeyboard.text("拒绝", "reject:" + nonce)
          );
          for (const { private_chat: admin } of admins.results as [
            { private_chat: number },
          ]) {
            waitUntil(
              bot.api
                .sendMessage(admin, message, {
                  reply_markup,
                  parse_mode: "HTML",
                })
                .catch(() => {})
            );
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
      /** 获取配置语言列表 */
      config_languages: chatProcedure.query(async ({ ctx, input }) => {
        const result = await globalEnv.DB.prepare(
          "SELECT language FROM chat_config WHERE chat = ?1 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?2)"
        )
          .bind(input.chat_id, ctx.user.id)
          .all<{ language: string }>();
        return result.results.map((item) => item.language);
      }),
      /** 读取配置信息 */
      config: chatProcedure
        .input(z.object({ language: z.string().optional() }))
        .query(async ({ ctx, input }) => {
          const result = await globalEnv.DB.prepare(
            "SELECT value FROM chat_config WHERE chat = ?1 AND language = ?2 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?3)"
          )
            .bind(input.chat_id, input.language ?? "", ctx.user.id)
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
            language: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "chat_config_update",
            language: input.language,
            value: input.config,
          }).run();
          return;
        }),
      /** 列出表单 */
      list_form: chatProcedure
        .input(z.object({ language: z.string().optional() }))
        .query(async ({ ctx, input }) => {
          const result = await globalEnv.DB.prepare(
            "SELECT id, content, enabled, (deleted_at is not null) as deleted, created_at, updated_at FROM form WHERE chat = ?1 AND language = ?2 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?3) ORDER BY deleted ASC, updated_at DESC"
          )
            .bind(input.chat_id, input.language ?? "", ctx.user.id)
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
      /** 删除语言配置 */
      drop_language: chatProcedure
        .input(z.object({ language: z.string().min(1, "不能删除默认语言") }))
        .mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "drop_language",
            language: input.language,
          }).run();
          return;
        }),
      /** 表单编辑api */
      form: t.router({
        /** 启用表单 */
        enable: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_enable",
            language: input.language,
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
              language: input.language,
              content: input.content,
            }).run();
            return;
          }),
        /** 删除表单(仅标记) */
        delete: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_delete",
            language: input.language,
            id: input.form_id,
          }).run();
          return;
        }),
        /** 恢复表单 */
        recover: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_recover",
            language: input.language,
            id: input.form_id,
          }).run();
          return;
        }),
        /** 永久删除表单 */
        delete_forever: formProcedure.mutation(async ({ ctx, input }) => {
          await audit(input.chat_id, ctx.user.id, {
            type: "form_delete_forever",
            language: input.language,
            id: input.form_id,
          }).run();
          return;
        }),
      }),
    }),
  }),
});

export type AppRouter = typeof router;
