import { useEventHandler } from "@/hooks/useEventHandler";
import { useInstance } from "@/hooks/useInstance";
import { useTruthyEffect } from "@/hooks/useTruthyEffect";
import { style } from "css-in-bun" with { type: "macro" };
import { AnimatePresence } from "framer-motion";
import { create } from "mutative";
import { nanoid } from "nanoid";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type Dispatch,
  type EffectCallback,
  type ElementRef,
  type ForwardedRef,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { stdMotion } from "../component";
import { EmbedDialog } from "./EmbedDialog";
import { useSWRConfig } from "swr";
import { SWRErrorBoundary } from "@/components/SWRErrorBoundary";

export type PageOptions = {
  preventClose?: boolean;
  mainButton?: MainButtonParams & { is_loading?: boolean };
  mainButtonClicked?: () => void;
  backButtonClicked?: () => boolean;
  settingsButtonClicked?: () => void;
};

type Context = {
  push: (page: ReactNode, options?: PageOptions) => void;
  pop(skip?: boolean): void;
  replace: (page: ReactNode, options?: PageOptions) => void;
};
const Context = createContext<Context>({
  push() {},
  pop() {},
  replace() {},
});

const PageContext = createContext<Dispatch<SetStateAction<PageOptions>>>(
  () => {}
);

const ActiveContext = createContext(false);

const Frame = stdMotion(function Frame(
  {
    active,
    updater,
    errorMode,
    setPages,
    children,
  }: {
    active: boolean;
    errorMode: "refresh" | "pop";
    setPages: Dispatch<SetStateAction<Page[]>>;
    updater:
      | { idx: number; token: string }
      | { setInitialPage: Dispatch<SetStateAction<Page>> };
    children: ReactNode;
  },
  ref: ForwardedRef<ElementRef<"div">>
) {
  const update = useCallback((opts: SetStateAction<PageOptions>) => {
    if ("idx" in updater)
      setPages((pages) => {
        const newPages = [...pages];
        const page = newPages[updater.idx];
        if (!page || page.token !== updater.token) return pages;
        newPages[updater.idx] = {
          ...page,
          ...(opts instanceof Function ? opts(page) : opts),
        };
        return newPages;
      });
    else updater.setInitialPage((old) => ({ ...old, ...opts }));
  }, []);
  const context = useInstance<Context>(() => ({
    push: (page, options) => {
      setPages((pages) => {
        if ("token" in updater) {
          if (updater.token !== pages[updater.idx]?.token) {
            return pages;
          }
        } else if (pages.length > 0) return pages;
        return [...pages, { ...options, page, token: nanoid() }];
      });
    },
    pop: (skip?: boolean) => {
      if ("token" in updater)
        setPages((pages) => {
          const lastPage = pages[pages.length - 1];
          if (!lastPage) return pages;
          if (updater.token !== lastPage.token) {
            return pages;
          }
          const remain = pages.slice(0, -1);
          if (!skip && lastPage.preventClose) {
            warnClose(() => {
              setPages(remain);
            });
            return pages;
          }
          return remain;
        });
    },
    replace: (page, options) => {
      if ("token" in updater)
        setPages((pages) => {
          const lastPage = pages[pages.length - 1];
          if (!lastPage) return pages;
          if (updater.token !== lastPage.token) {
            return pages;
          }
          return [...pages.slice(0, -1), { ...options, page, token: nanoid() }];
        });
      else updater.setInitialPage({ ...options, page, token: nanoid() });
    },
  }));
  return (
    <div ref={ref} className={style({ height: "100vh" })}>
      <Context.Provider value={context}>
        <ActiveContext.Provider value={active}>
          <PageContext.Provider value={update}>
            <SWRErrorBoundary errorMode={errorMode}>
              {children}
            </SWRErrorBoundary>
          </PageContext.Provider>
        </ActiveContext.Provider>
      </Context.Provider>
    </div>
  );
});

type Page = {
  page: ReactNode;
  token: string;
} & PageOptions;

export function StackNavigator({ children }: { children: ReactNode }) {
  const [initialPage, setInitialPage] = useState<Page>(() => ({
    page: children,
    token: "",
  }));
  const [pages, setPages] = useState<Page[]>([]);
  const pop = useEventHandler((skip = false) => {
    const lastPage = pages[pages.length - 1];
    if (!lastPage) return;
    if (!skip && lastPage.preventClose) {
      warnClose(() => {
        setPages((pages) => pages.slice(0, -1));
      });
      return;
    }
    setPages((pages) => pages.slice(0, -1));
  });
  const onBackButtonClicked = useEventHandler(() => {
    if (currentPage.backButtonClicked) {
      if (currentPage.backButtonClicked()) return;
      pop(true);
      return;
    }
    pop();
  });
  useEffect(() => {
    if (!pages.length) return;
    Telegram.WebApp.BackButton.isVisible = true;
    Telegram.WebApp.BackButton.onClick(onBackButtonClicked);
    return () => {
      Telegram.WebApp.BackButton.isVisible = false;
      Telegram.WebApp.BackButton.offClick(onBackButtonClicked);
    };
  }, [!!pages.length]);
  useTruthyEffect(
    pages.some(({ preventClose }) => preventClose),
    () => {
      Telegram.WebApp.isClosingConfirmationEnabled = true;
      return () => {
        Telegram.WebApp.isClosingConfirmationEnabled = false;
      };
    }
  );
  useTruthyEffect(pages[pages.length - 1]?.settingsButtonClicked, (cb) => {
    Telegram.WebApp.SettingsButton.isVisible = true;
    Telegram.WebApp.SettingsButton.onClick(cb);
    return () => {
      Telegram.WebApp.SettingsButton.isVisible = false;
      Telegram.WebApp.SettingsButton.offClick(cb);
    };
  });
  const currentPage: PageOptions = pages[pages.length - 1] ?? initialPage;
  useEffect(() => {
    const mainButton = currentPage.mainButton;
    if (!mainButton) {
      Telegram.WebApp.MainButton.hide();
      return;
    }
    const { is_loading: progressIndicator, ...params } = {
      is_visible: true,
      color: Telegram.WebApp.themeParams.button_color,
      text_color: Telegram.WebApp.themeParams.button_text_color,
      is_active: true,
      text: undefined,
      ...mainButton,
    };
    Telegram.WebApp.MainButton.setParams(params);
    if (params.is_visible) {
      if (progressIndicator) {
        if (!Telegram.WebApp.MainButton.isProgressVisible) {
          Telegram.WebApp.MainButton.showProgress();
        }
      } else if (Telegram.WebApp.MainButton.isProgressVisible) {
        Telegram.WebApp.MainButton.hideProgress();
      }
    }
  }, [currentPage.mainButton]);
  const onMainButtonClicked = useEventHandler(() => {
    currentPage?.mainButtonClicked?.();
  });
  useEffect(() => {
    Telegram.WebApp.MainButton.onClick(onMainButtonClicked);
    return () => void Telegram.WebApp.MainButton.offClick(onMainButtonClicked);
  }, []);
  return (
    <>
      <Frame
        initial="enter"
        animate="present"
        active={!pages.length}
        setPages={setPages}
        updater={{ setInitialPage }}
        errorMode="refresh"
      >
        {initialPage.page}
      </Frame>
      <AnimatePresence>
        {pages.map(({ page, token }, idx) => (
          <Frame
            key={token}
            initial="enter"
            animate="present"
            exit="exit"
            active={idx === pages.length - 1}
            setPages={setPages}
            updater={{ token, idx }}
            errorMode="pop"
          >
            {page}
          </Frame>
        ))}
      </AnimatePresence>
    </>
  );
}

export function usePageContext() {
  return useContext(PageContext);
}

export function useMainButtonClicked(
  mainButtonClicked: () => void,
  dependencies: DependencyList = []
) {
  const update = usePageContext();
  useEffect(() => update({ mainButtonClicked }), dependencies);
}

export function useBackButtonClicked(
  backButtonClicked: () => boolean,
  dependencies: DependencyList = []
) {
  const update = usePageContext();
  useEffect(() => update({ backButtonClicked }), dependencies);
}

export function useSettingsButtonClicked(
  settingsButtonClicked: () => void,
  dependencies: DependencyList = []
) {
  const update = usePageContext();
  useEffect(() => {
    update({ settingsButtonClicked });
    return () => update({ settingsButtonClicked: undefined });
  }, dependencies);
}

export function usePreventClose(preventClose: boolean) {
  const update = usePageContext();
  useEffect(() => update({ preventClose }), [preventClose]);
}

export function useMainButtonLoadingIndicator(loading: boolean) {
  const update = usePageContext();
  useEffect(
    () =>
      update((old) =>
        create(old, (draft) => {
          if (draft.mainButton) draft.mainButton.is_loading = loading;
        })
      ),
    [loading]
  );
}

export function useStackNavigator() {
  return useContext(Context);
}

export function useIsActive() {
  return useContext(ActiveContext);
}

export function useActiveEffect(fn: EffectCallback) {
  const active = useIsActive();
  useEffect(() => {
    if (active) return fn();
  }, [active]);
}

function warnClose(cb: () => void) {
  Telegram.WebApp.showPopup(
    {
      message: "所作的更改可能不会被保存",
      title: "提示",
      buttons: [
        { type: "cancel", text: "取消", id: "cancel" },
        { type: "default", text: "仍然关闭", id: "close" },
      ],
    },
    (id) => {
      if (id === "close") {
        cb();
      }
    }
  );
}
