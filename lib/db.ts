import {
  DefaultChatConfig,
  type ChatConfig,
  type FormType,
} from "@shared/types";
import type { Chat, PhotoSize, User } from "grammy/types";
import { WorkersCacheStorage } from "workers-cache-storage";
import { globalEnv } from "./env";
import { jsonAggQb, jsonQb, qb } from "./qb" with { type: "macro" };

const cache = WorkersCacheStorage.json("db");
cache.defaultTtl = 60 * 5;

export async function queryChatConfig(chat: number) {
  const ret = await globalEnv.DB.prepare(
    qb(
      {
        config: {
          from: { table: "chat_config" },
          where: "config.chat = ?1",
        },
      },
      { value: "config.value" }
    )
  )
    .bind(chat)
    .first<{ value: string }>();
  const temp = ret?.value ? (JSON.parse(ret.value) as Partial<ChatConfig>) : {};
  return {
    ...DefaultChatConfig,
    ...temp,
  } as ChatConfig;
}

export async function queryChatInfo(chat: number, user: number) {
  const ret = await globalEnv.DB.prepare(
    jsonQb(
      {
        info: { from: { table: "chat_info" }, where: "info.chat = ?1" },
        session: {
          join: {
            table: "session",
            on: ["session.chat = info.chat", "session.user = ?2"],
            type: "left",
          },
        },
        config: {
          join: {
            table: "chat_config",
            on: ["info.chat = config.chat"],
            type: "left",
          },
        },
      },
      {
        chat: "info.info",
        nonce: "json_quote(session.nonce)",
        form: "session.form",
        config: "config.value",
        answer: "session.answer",
      }
    )
  )
    .bind(chat, user)
    .first<{ json: string }>();
  if (!ret) throw new Error(`chat not found: ${chat} ${user}`);
  return JSON.parse(ret.json) as {
    chat: Chat.SupergroupGetChat;
    nonce: string | null;
    form: FormType | null;
    config: ChatConfig | null;
    answer: Record<string, string | boolean> | null;
  };
}

export async function listChat(user: number) {
  const result = await globalEnv.DB.prepare(
    qb(
      {
        chat_admin: { from: { table: "chat_admin" }, where: "user = ?1" },
        chat_info: {
          join: {
            table: "chat_info",
            on: ["chat_admin.chat = chat_info.chat"],
            type: "left",
          },
        },
      },
      {
        chat: "chat_admin.chat",
        info: "chat_info.info",
        sessions: jsonAggQb(
          {
            session: {
              from: { table: "session" },
              where: "session.chat = chat_admin.chat",
            },
          },
          {
            user: "session.user_info",
            user_detail: "session.user_chat_info",
            nonce: "json_quote(session.nonce)",
            form: "session.form",
            answer: "session.answer",
            created_at: "json_quote(session.created_at)",
            updated_at: "json_quote(session.updated_at)",
          }
        ),
      }
    )
  )
    .bind(user)
    .all<{ chat: number; info: string; sessions: string }>();
  return result.results.map((r) => ({
    chat: {
      ...(r.info ? JSON.parse(r.info) : {}),
      id: r.chat,
    } as Chat.SupergroupGetChat,
    sessions: JSON.parse(r.sessions) as {
      user: User & { photos: PhotoSize[] };
      user_detail: Chat.PrivateGetChat | null;
      nonce: string;
      form: FormType;
      answer: Record<string, string | boolean>;
      created_at: string;
      updated_at: string;
    }[],
  }));
}

export async function listSession(user: number, chat: number) {
  const result = await globalEnv.DB.prepare(
    jsonQb(
      {
        session: {
          from: { table: "session" },
          where: [
            "session.chat = ?1",
            "EXISTS (SELECT 1 FROM chat_admin WHERE chat = ?1 AND user = ?2)",
          ],
        },
      },
      {
        user: "session.user_info",
        form: "session.form",
        answer: "session.answer",
        created_at: "json_quote(session.created_at)",
        updated_at: "json_quote(session.updated_at)",
      }
    )
  )
    .bind(chat, user)
    .all<{ json: string }>();
  return result.results.map(
    (r) =>
      JSON.parse(r.json) as {
        user: User;
        form: FormType;
        answer: Record<string, string | boolean>;
        created_at: string;
        updated_at: string;
      }
  );
}
