import { bot } from "@lib/bot";
import { syncenv, type WorkerEnv } from "@lib/env";
import { WorkersCacheStorage } from "workers-cache-storage";

const cache = WorkersCacheStorage.forHttpResponse("telegram-file");

export const onRequest: PagesFunction<WorkerEnv, "id"> = async ({
  env,
  waitUntil,
  request,
  params,
}) => {
  syncenv(env, waitUntil);
  const fileid = params.id as string;
  try {
    return await cache.wrap(request, waitUntil, async () => {
      const info = await bot.api.getFile(fileid);
      const url = `https://api.telegram.org/file/bot${Bun.env.BOT_TOKEN}/${info.file_path}`;
      return await fetch(url);
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
