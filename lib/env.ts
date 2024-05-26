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
  | { type: "chat_config_update"; value: Record<string, unknown> }
  | { type: "chat_config_reset" }
  | { type: "form_enable"; id: string }
  | { type: "form_update"; id: string; content: Record<string, unknown> }
  | { type: "form_delete"; id: string }
  | { type: "form_recover"; id: string }
  | { type: "form_delete_forever"; id: string };

export function audit(chat: number, user: number, action: DbAction) {
  return globalEnv.DB.prepare(
    `INSERT INTO audit (chat, id, user, action) VALUES (?, ?, ?, ?)`
  ).bind(chat, nanoid(), user, JSON.stringify(action));
}
