import { type WorkerEnv } from "@lib/env";
import { TRPCError, initTRPC, type inferAsyncReturnType } from "@trpc/server";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import { type FetchCreateContextWithCloudflareEnvFnOptions } from "cloudflare-pages-plugin-trpc";
import * as z from "zod";
import { verify } from "./verify";

export const createContext = async ({
  req,
}: FetchCreateContextWithCloudflareEnvFnOptions<WorkerEnv>) => {
  const initData = req.headers.get("X-WebApp-InitData");
  if (!initData)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No initData" });
  let result;
  try {
    result = verify(initData);
  } catch (e) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: e + "" });
  }
  if (!result) throw new TRPCError({ code: "UNAUTHORIZED" });
  return result;
};

type Context = inferAsyncReturnType<typeof createContext>;
export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    let cause = error.cause;
    while (cause instanceof TRPCError) {
      cause = cause.cause;
    }
    if (cause instanceof z.ZodError) {
      const firstError = cause.errors[0];
      return {
        message: firstError.path.join(".") + ":" + firstError.message,
        code: TRPC_ERROR_CODES_BY_KEY.BAD_REQUEST,
        data: {
          type: "ZodError",
          detail: cause.format(),
        },
      };
    }
    return shape;
  },
});
