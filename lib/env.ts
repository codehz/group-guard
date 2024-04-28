import type { QueueData } from "@shared/types";
import { nanoid } from "nanoid";

export interface WorkerEnv {
  DB: D1Database;
  QUEUE: Queue<QueueData>;
  AI: Fetcher;
}

export const globalEnv: WorkerEnv = {} as any;

let waitUntilImpl: undefined | ((promise: Promise<any>) => void);

export const waitUntil: (promise: Promise<any>) => void = (promise) => {
  waitUntilImpl?.(promise);
};

export function syncenv(
  env: WorkerEnv,
  waitUntil?: (promise: Promise<any>) => void
) {
  Object.assign(globalEnv, env);
  waitUntilImpl = waitUntil;
}

type DbAction =
  | {
      type: "chat_config_update";
      language?: string;
      value: Record<string, unknown>;
    }
  | { type: "chat_config_reset"; language?: string }
  | { type: "drop_language"; language: string }
  | { type: "form_enable"; language?: string; id: string }
  | {
      type: "form_update";
      language?: string;
      id: string;
      content: Record<string, unknown>;
    }
  | { type: "form_delete"; language?: string; id: string }
  | { type: "form_recover"; language?: string; id: string }
  | { type: "form_delete_forever"; language?: string; id: string };

export function audit(chat: number, user: number, action: DbAction) {
  return globalEnv.DB.prepare(
    `INSERT INTO audit (chat, id, user, action) VALUES (?, ?, ?, ?)`
  ).bind(chat, nanoid(), user, JSON.stringify(action));
}
