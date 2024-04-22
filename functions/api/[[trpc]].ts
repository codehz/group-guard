import { createContext } from "@lib/api-context";
import { router } from "@lib/api-server";
import { syncenv, type WorkerEnv } from "@lib/env";
import tRPCPlugin from "cloudflare-pages-plugin-trpc";

const plugin = tRPCPlugin({
  endpoint: "/api",
  router,
  createContext,
});

export const onRequest: PagesFunction<WorkerEnv> = (ctx) => {
  syncenv(ctx.env, ctx.waitUntil);
  return plugin(ctx);
};
