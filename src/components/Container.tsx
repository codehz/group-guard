import "@/polyfill";
import { useEffect, type ReactNode } from "react";
import {
  SWRConfig,
  type Key,
  type Middleware,
  type RevalidatorOptions,
  type SWRHook,
} from "swr";
import { api } from "../api";
import { LoadingContext } from "./LoadingContext";
import { StackNavigator } from "./StackNavigator";
import { ToastManager } from "./ToastManager";

const client = api.createClient();

const retrySuspenseSWRMiddleware: Middleware = (useSWRNext: SWRHook) => {
  return (key: Key, fetcher, options) => {
    if (options.suspense && options.shouldRetryOnError != false) {
      const suspenseFetcher: typeof fetcher = async (fetcherOptions) =>
        new Promise(async (resolve, reject) => {
          async function revalidate(
            revalidateOpts?: RevalidatorOptions
          ): Promise<boolean> {
            const { retryCount = 0, dedupe = true } = revalidateOpts ?? {};
            try {
              const data = await fetcher!(fetcherOptions);
              resolve(data);
              return true;
            } catch (error) {
              options.onErrorRetry?.(
                error as any,
                key + "",
                options as any,
                revalidate,
                {
                  retryCount: retryCount + 1,
                  dedupe,
                }
              );
              return false;
            }
          }

          try {
            return await revalidate();
          } catch (error) {
            reject(error);
          }
        });
      return useSWRNext(key, suspenseFetcher, options);
    }
    return useSWRNext(key, fetcher, options);
  };
};

export function Container({ children }: { children: ReactNode }) {
  useEffect(() => {
    Telegram.WebApp.setHeaderColor("secondary_bg_color");
    Telegram.WebApp.ready();
  }, []);
  return (
    <SWRConfig
      value={{
        use: [retrySuspenseSWRMiddleware],
      }}
    >
      <api.Provider client={client}>
        <ToastManager>
          <LoadingContext>
            <StackNavigator>{children}</StackNavigator>
          </LoadingContext>
        </ToastManager>
      </api.Provider>
    </SWRConfig>
  );
}
