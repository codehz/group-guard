import { bot, deleteMessageSafe } from "@lib/bot";
import { syncenv, type WorkerEnv } from "@lib/env";
import { qb } from "@lib/qb" with { type: "macro" };
import {
  DefaultChatConfig,
  type ChatConfig,
  type QueueData,
} from "@shared/types";
import { InlineKeyboard } from "grammy";

export interface Env {
  DB: D1Database;
}

export default {
  async queue(batch: MessageBatch<QueueData>, env: Env): Promise<void> {
    syncenv(env as WorkerEnv);
    for (const message of batch.messages) {
      const data = message.body;
      switch (data.type) {
        case "welcome": {
          await deleteMessageSafe(data.chat_id, data.welcome_message);
          const res = await env.DB.prepare(
            "DELETE FROM session WHERE chat = ? AND user = ? AND answer IS NULL AND nonce = ? RETURNING (SELECT value FROM chat_config WHERE chat_config.chat = session.chat) AS config"
          )
            .bind(data.chat_id, data.target_user, data.nonce)
            .first<{ config?: string }>();
          if (!res) {
            message.ack();
            return;
          }
          const { ban_duration } = {
            ...DefaultChatConfig,
            ...(res.config ? JSON.parse(res.config) : {}),
          } as ChatConfig;
          await bot.api.banChatMember(data.chat_id, data.target_user, {
            until_date: (Date.now() / 1000 + ban_duration) | 0,
          });
          message.ack();
          break;
        }
        case "direct_notification_expired": {
          const { results } = await env.DB.prepare(
            qb(
              {
                chat_admin: {
                  from: { table: "chat_admin" },
                  where:
                    "chat_admin.chat = ?1 AND chat_admin.receive_notification",
                },
                user_private_chat: {
                  join: {
                    table: "user_private_chat",
                    on: ["chat_admin.user = user_private_chat.user"],
                    type: "left",
                  },
                  where: "user_private_chat.private_chat IS NOT NULL",
                },
              },
              {
                private_chat: "user_private_chat.private_chat",
              }
            )
          )
            .bind(data.chat_id)
            .all<{ private_chat: number }>();
          try {
            const reply_markup = new InlineKeyboard().add(
              InlineKeyboard.text("通过", "accept:" + data.nonce),
              InlineKeyboard.text("拒绝", "reject:" + data.nonce)
            );
            for (const { private_chat } of results) {
              await bot.api.copyMessage(
                private_chat,
                data.chat_id,
                data.message_id,
                {
                  reply_markup,
                  reply_parameters: {
                    message_id: data.message_id,
                    chat_id: data.chat_id,
                  },
                }
              );
            }
            await deleteMessageSafe(data.chat_id, data.message_id);
          } catch (e) {
            console.error(e);
          }
          message.ack();
          break;
        }
      }
    }
  },
};
