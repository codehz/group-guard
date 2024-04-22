import { EmbedDialog } from "@/components/EmbedDialog";
import { usePageContext, useStackNavigator } from "@/components/StackNavigator";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useInstance } from "@/hooks/useInstance";
import { style } from "css-in-bun" with { type: "macro" };
import { createContext, use, useEffect, type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { SWRConfig, useSWRConfig, type Key } from "swr";

const ErrorContext = createContext(new Set<Key>());

export function SWRErrorBoundary({
  errorMode,
  children,
}: {
  errorMode: "refresh" | "pop" | "inline";
  children: ReactNode;
}) {
  const keys = useInstance(() => new Set<Key>());
  return (
    <SWRConfig
      value={{
        onError: useEventHandler((_err, key, config) => {
          if (config.suspense) {
            keys.add(key);
          }
        }),
      }}
    >
      <ErrorContext.Provider value={keys}>
        <ErrorBoundary
          FallbackComponent={
            errorMode === "inline"
              ? ErrorFallbackInline
              : errorMode === "pop"
                ? ErrorFallbackPop
                : ErrorFallbackRefresh
          }
        >
          {children}
        </ErrorBoundary>
      </ErrorContext.Provider>
    </SWRConfig>
  );
}

function ErrorFallbackInline({ error, resetErrorBoundary }: FallbackProps) {
  const config = useSWRConfig();
  const keys = use(ErrorContext);
  return (
    <div className={style({ padding: 16, display: "grid", gap: 8 })}>
      <div className={style({ fontSize: 12, textAlign: "center" })}>
        {error + ""}
      </div>
      <button
        onClick={() => {
          for (const key of keys) {
            config.cache.delete(key as any);
          }
          resetErrorBoundary();
        }}
      >
        刷新
      </button>
    </div>
  );
}

function ErrorFallback({
  error,
  children,
}: {
  error: any;
  children: ReactNode;
}) {
  const update = usePageContext();
  useEffect(() => {
    update({
      mainButton: undefined,
      mainButtonClicked: undefined,
      backButtonClicked: undefined,
      preventClose: false,
    });
  }, []);
  return (
    <EmbedDialog title="出错啦">
      <div className={style({ display: "grid", gap: 8 })}>
        <div className={style({ fontSize: 12, textAlign: "center" })}>
          {error + ""}
        </div>
        {children}
      </div>
    </EmbedDialog>
  );
}

function ErrorFallbackRefresh({ error, resetErrorBoundary }: FallbackProps) {
  const config = useSWRConfig();
  const keys = use(ErrorContext);
  return (
    <ErrorFallback error={error}>
      <button
        onClick={() => {
          for (const key of keys) {
            config.cache.delete(key as any);
          }
          resetErrorBoundary();
        }}
      >
        刷新
      </button>
    </ErrorFallback>
  );
}

function ErrorFallbackPop({ error }: FallbackProps) {
  const config = useSWRConfig();
  const navigator = useStackNavigator();
  const keys = use(ErrorContext);
  return (
    <ErrorFallback error={error}>
      <button
        onClick={() => {
          for (const key of keys) {
            config.cache.delete(key as any);
          }
          navigator.pop(true);
        }}
      >
        返回
      </button>
    </ErrorFallback>
  );
}
