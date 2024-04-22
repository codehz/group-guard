import type { AppRouter } from "./api-server";
import { createSWRProxyHooks } from "@trpc-swr/client";
import { httpBatchLink } from "@trpc/client";

export const api = createSWRProxyHooks<AppRouter>({
  links:
    typeof Telegram === "undefined"
      ? []
      : [
          httpBatchLink({
            url: Bun.env.BOT_HOST + "/api",
            headers: { "X-WebApp-InitData": Telegram.WebApp.initData },
          }),
        ],
});
