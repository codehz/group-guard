import { queryChatConfig } from "@lib/db";
import { html } from "@lib/html-format";
import { DefaultChatConfig, type ChatConfig } from "@shared/types";
import { Bot, InlineKeyboard } from "grammy";
import type { Chat, User } from "grammy/types";
import { nanoid } from "nanoid";
import { WorkersCacheStorage } from "workers-cache-storage";
import { globalEnv, waitUntil } from "./env";

export const bot = new Bot(Bun.env.BOT_TOKEN, {
  botInfo: JSON.parse(Bun.env.BOT_INFO),
});

const cached = WorkersCacheStorage.void("bot-request-dedup");
cached.defaultTtl = 60 * 60 * 24;

export function unrestrictChatMember(chatId: number, userId: number) {
  return bot.api.restrictChatMember(chatId, userId, {
    can_send_messages: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
    can_change_info: true,
    can_invite_users: true,
    can_manage_topics: true,
    can_pin_messages: true,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_polls: true,
    can_send_video_notes: true,
    can_send_videos: true,
    can_send_voice_notes: true,
  });
}

export async function deleteMessageSafe(chatId: number, messageId: number) {
  try {
    await bot.api.deleteMessage(chatId, messageId);
    return true;
  } catch {
    return false;
  }
}

async function sendWelcomeMessage(chatId: number, user: User) {
  await bot.api.restrictChatMember(chatId, user.id, {
    can_send_messages: false,
  });
  const nonce = nanoid();
  const config = await queryChatConfig(chatId);
  const {
    photos: [photos = []],
  } = await bot.api.getUserProfilePhotos(user.id, { limit: 1 });
  const sent = await bot.api.sendMessage(
    chatId,
    html`欢迎 <a href="tg://user?id=${user.id}">${user.first_name}</a>`,
    {
      reply_markup: new InlineKeyboard()
        .row(
          InlineKeyboard.url(
            "验证",
            `https://t.me/${bot.botInfo.username}?start=${chatId}`
          )
        )
        .row(InlineKeyboard.text("直接踢出")),
      protect_content: true,
      disable_notification: true,
      parse_mode: "HTML",
    }
  );
  await globalEnv.DB.prepare(
    "INSERT INTO session (chat, user, user_info, welcome_message, nonce, form) VALUES (?1, CAST(?2 -> 'id' AS INTEGER), ?2, ?3, ?4, COALESCE((SELECT content FROM form WHERE form.chat = ?1 AND form.enabled AND form.deleted_at is null LIMIT 1), (SELECT content FROM form WHERE form.chat = ?1 AND form.enabled AND form.deleted_at is null LIMIT 1)))"
  )
    .bind(chatId, JSON.stringify({ ...user, photos }), sent.message_id, nonce)
    .run();
  await globalEnv.QUEUE.send(
    {
      type: "welcome",
      chat_id: chatId,
      nonce,
      welcome_message: sent.message_id,
      target_user: user.id,
    },
    { delaySeconds: config.challenge_timeout }
  );
}

async function updateFullChat(id: number) {
  const fullchat = await bot.api.getChat(id);
  return globalEnv.DB.prepare(
    "INSERT INTO chat_info(chat, info) VALUES (?, ?) ON CONFLICT DO UPDATE SET info = excluded.info, updated_at = CURRENT_TIMESTAMP"
  ).bind(id, JSON.stringify(fullchat));
}

async function reloadChatAdminList(id: number) {
  const admins = await bot.api.getChatAdministrators(id);
  const validAdmins = admins
    .filter((admin) => admin.status === "creator" || admin.can_restrict_members)
    .map((admin) => admin.user.id);
  await globalEnv.DB.batch([
    await updateFullChat(id),
    globalEnv.DB.prepare("DELETE FROM chat_admin WHERE chat = ?").bind(id),
    globalEnv.DB.prepare(
      "INSERT INTO chat_admin(chat, user) SELECT ?, json_extract(value, '$') FROM json_each(?)"
    ).bind(id, JSON.stringify(validAdmins)),
  ]);
  return validAdmins;
}

const callbackHandler = bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    waitUntil(
      ctx
        .answerCallbackQuery({
          show_alert: true,
          text: (e + "").slice(0, 200),
        })
        .catch(() => {})
    );
  }
});

callbackHandler.callbackQuery(/^accept:.*/, async (ctx) => {
  const nonce = ctx.callbackQuery.data.slice("accept:".length);
  const res = await globalEnv.DB.prepare(
    "DELETE FROM session WHERE nonce = ?1 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = session.chat AND user = ?2) RETURNING chat, user"
  )
    .bind(nonce, ctx.from.id)
    .first<{ chat: number; user: number }>();
  if (res) {
    await unrestrictChatMember(res.chat, res.user);
    if (ctx.callbackQuery.message) {
      const message = ctx.callbackQuery.message;
      waitUntil(
        ctx.api.editMessageReplyMarkup(message.chat.id, message.message_id, {
          reply_markup: new InlineKeyboard().add(
            InlineKeyboard.url("查看用户", `tg://user?id=${res.user + ""}`)
          ),
        })
      );
    }
  } else {
    await ctx.answerCallbackQuery("目标会话不存在或已被其他管理员处理");
    if (ctx.callbackQuery.message) {
      const message = ctx.callbackQuery.message;
      waitUntil(
        ctx.api.editMessageReplyMarkup(message.chat.id, message.message_id, {
          reply_markup: new InlineKeyboard(),
        })
      );
    }
  }
});
callbackHandler.callbackQuery(/^reject:.*/, async (ctx) => {
  const nonce = ctx.callbackQuery.data.slice("reject:".length);
  const res = await globalEnv.DB.prepare(
    "DELETE FROM session WHERE nonce = ? AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = session.chat AND user = ?2) RETURNING chat, user, (SELECT value FROM chat_config WHERE chat_config.chat = session.chat) AS config"
  )
    .bind(nonce, ctx.from.id)
    .first<{ chat: number; user: number; config?: string }>();
  if (res) {
    const { ban_duration } = {
      ...DefaultChatConfig,
      ...(res.config ? JSON.parse(res.config) : {}),
    } as ChatConfig;
    await ctx.api.banChatMember(res.chat, res.user, {
      until_date: (Date.now() / 1000 + ban_duration) | 0,
    });
    if (ctx.callbackQuery.message) {
      const message = ctx.callbackQuery.message;
      waitUntil(
        ctx.api.editMessageReplyMarkup(message.chat.id, message.message_id, {
          reply_markup: new InlineKeyboard().add(
            InlineKeyboard.url("查看用户", `tg://user?id=${res.user + ""}`)
          ),
        })
      );
    }
  } else {
    await ctx.answerCallbackQuery("目标会话不存在或已被其他管理员处理");
    if (ctx.callbackQuery.message) {
      const message = ctx.callbackQuery.message;
      waitUntil(
        ctx.api.editMessageReplyMarkup(message.chat.id, message.message_id, {
          reply_markup: new InlineKeyboard(),
        })
      );
    }
  }
});
bot.command("start", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  if (ctx.chat.type !== "private") return;
  await cached.wrap(
    `user_private_chat:${user.id}:${ctx.chat.id}`,
    waitUntil,
    async () => {
      await globalEnv.DB.prepare(
        "INSERT INTO user_private_chat (user, private_chat) VALUES (?1, ?2) ON CONFLICT DO NOTHING"
      )
        .bind(user.id, ctx.chat.id)
        .run();
    }
  );
  if (ctx.match) {
    const chatId = parseInt(ctx.match);
    if (Number.isFinite(chatId)) {
      const userDetail = (await ctx.api.getChat(
        ctx.chat.id
      )) as Chat.PrivateGetChat;
      const [session, admin] = await globalEnv.DB.batch([
        globalEnv.DB.prepare(
          "UPDATE session SET user_chat_info = ?3 WHERE chat = ?1 AND user = ?2 RETURNING session.welcome_message, (SELECT chat_info.info FROM chat_info WHERE chat_info.chat = session.chat) AS info"
        ).bind(chatId, user.id, JSON.stringify(userDetail)),
        globalEnv.DB.prepare(
          "SELECT user_info FROM session WHERE chat = ?1 AND EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?2)"
        ).bind(chatId, user.id),
      ]);
      if (session.results.length) {
        const [{ welcome_message, info }] = session.results as [
          { welcome_message: number; info: string },
        ];
        const chat = JSON.parse(info) as Chat.SupergroupGetChat;
        waitUntil(deleteMessageSafe(chat.id, welcome_message));
        const title = `正在加入${chat.title}`;
        const reply_markup = new InlineKeyboard().add(
          InlineKeyboard.url(
            "验证",
            Bun.env.BOT_CHALLENGE_URL + `?startapp=${chatId}`
          )
        );
        await ctx.reply(title, { reply_markup });
      } else if (admin.results.length) {
        ctx.reply(
          "请使用左下角的菜单管理加群请求 (如果没有出现，请使用命令 /menu )"
        );
      }
      return;
    }
  }
});
bot.command("menu", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  if (ctx.match === "remove")
    waitUntil(
      ctx.api.setChatMenuButton({
        chat_id: ctx.chat.id,
        menu_button: { type: "default" },
      })
    );
  else
    waitUntil(
      ctx.api.setChatMenuButton({
        chat_id: ctx.chat.id,
        menu_button: {
          type: "web_app",
          text: "管理",
          web_app: {
            url: Bun.env.BOT_HOST + "/admin",
          },
        },
      })
    );
});
bot.command("reload", async (ctx) => {
  const validAdmins = await reloadChatAdminList(ctx.chat.id);
  if (ctx.from?.id && validAdmins.includes(ctx.from.id)) {
    await ctx.reply("reloaded");
  }
});
bot.command("langtest", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  ctx.reply("language: " + user.language_code);
});
bot.command("test", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  if (ctx.chat.type !== "supergroup") return;
  try {
    await sendWelcomeMessage(ctx.chat.id, user);
  } catch (e) {
    console.error(e);
  }
});
bot.on("my_chat_member", async (ctx) => {
  if (ctx.myChatMember.chat.type === "supergroup") {
    const member = ctx.myChatMember.new_chat_member;
    if (member.status === "administrator") {
      if (
        !member.can_delete_messages ||
        !member.can_restrict_members ||
        !member.can_manage_chat
      ) {
        await ctx.api.sendMessage(
          ctx.chat.id,
          "权限不足，需要删除消息，限制成员和管理群组的权限"
        );
      }
    } else if (member.status === "left") {
      await globalEnv.DB.prepare("DELETE FROM chat_config WHERE chat = ?")
        .bind(ctx.chat.id)
        .run();
      return;
    }
    await reloadChatAdminList(ctx.chat.id);
  } else if (ctx.myChatMember.chat.type === "private") {
    const member = ctx.myChatMember.new_chat_member;
    if (member.status === "kicked") {
      await globalEnv.DB.prepare(
        "DELETE FROM user_private_chat WHERE private_chat = ?"
      )
        .bind(ctx.chat.id)
        .run();
    }
  }
  return;
});
bot.on("chat_member", async (ctx) => {
  const old_state = ctx.chatMember.old_chat_member;
  const new_state = ctx.chatMember.new_chat_member;
  if (!new_state || new_state.user.is_bot) return;
  if (new_state.status === "administrator") {
    if (new_state.can_restrict_members) {
      await globalEnv.DB.prepare(
        "INSERT INTO chat_admin(chat, user) VALUES (?, ?) ON CONFLICT DO NOTHING"
      )
        .bind(ctx.chat.id, new_state.user.id)
        .run();
    } else {
      await globalEnv.DB.prepare(
        "DELETE FROM chat_admin WHERE chat = ? AND user = ?"
      )
        .bind(ctx.chat.id, new_state.user.id)
        .run();
    }
  } else if (new_state.status === "member" && old_state.status === "left") {
    try {
      await sendWelcomeMessage(ctx.chat.id, new_state.user);
    } catch (e) {
      console.error(e);
    }
  } else if (new_state.status === "left") {
    await globalEnv.DB.prepare(
      "DELETE FROM session WHERE chat = ? AND user = ?"
    )
      .bind(ctx.chat.id, new_state.user.id)
      .run();
  }
});
