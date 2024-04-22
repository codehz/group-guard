import { bot } from "@lib/bot";
import { syncenv, type WorkerEnv } from "@lib/env";
import { webhookCallback } from "grammy";

export const onRequest: PagesFunction<WorkerEnv> = ({
  env,
  request,
  waitUntil,
}) => {
  syncenv(env, waitUntil);
  return webhookCallback(bot, "cloudflare-mod", {
    secretToken: Bun.env.BOT_SECRET,
  })(request);
};
