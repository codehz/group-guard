import { bot } from "@lib/bot";
import type { WorkerEnv } from "@lib/env";

export const onRequestPost: PagesFunction<WorkerEnv> = async () => {
  await bot.api.setWebhook(Bun.env.BOT_HOST + "/webhook", {
    secret_token: Bun.env.BOT_SECRET,
    allowed_updates: [
      "message",
      "my_chat_member",
      "chat_member",
      "chat_join_request",
      "callback_query",
    ],
    drop_pending_updates: true,
  });
  await bot.api.setChatMenuButton({
    menu_button: { type: "default" },
  });
  return new Response("OK", {});
};
