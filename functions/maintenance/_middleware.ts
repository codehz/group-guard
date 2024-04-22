import { syncenv, type WorkerEnv } from "@lib/env";

export const onRequest: PagesFunction<WorkerEnv> = (ctx) => {
  syncenv(ctx.env, ctx.waitUntil);
  const secret = (ctx.request as Request).headers.get("X-Bot-Secret");
  if (secret !== Bun.env.BOT_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  return ctx.next();
};
