import { bot, deleteMessageSafe, unrestrictChatMember } from "@lib/bot";
import { syncenv, type WorkerEnv } from "@lib/env";
import {
  DefaultChatConfig,
  type ChatConfig,
  type QueueData,
} from "@shared/types";

export interface Env {
  DB: D1Database;
}

export default {
  async queue(batch: MessageBatch<QueueData>, env: Env): Promise<void> {
    syncenv(env as WorkerEnv);
    for (const message of batch.messages) {
      const data = message.body;
      if (data.type === "welcome") {
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
      }
    }
  },
};
