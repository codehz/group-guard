import { AnimatePresence, motion, type Variants } from "framer-motion";
import { nanoid } from "nanoid";
import {
  createContext,
  use,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastApi = {
  show(
    node: ReactNode,
    options?: {
      timeout?: number;
      key?: string;
    }
  ): void;
  hide(key: string): void;
};

const ToastContext = createContext<ToastApi>({
  show() {},
  hide() {},
});

type ToastState = {
  node: ReactNode;
  handle: number;
};

export const useToast = () => use(ToastContext);

export const useToastMessage = () => {
  const toast = use(ToastContext);
  const key = useId();
  return (node: ReactNode, timeout = 1000) =>
    node ? toast.show(node, { key, timeout }) : toast.hide(key);
};

export const ToastManager = function ToastManager({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Record<string, ToastState>>(() => ({}));
  const api = useMemo<ToastApi>(
    () => ({
      show: (node, { timeout = 1000, key = nanoid() } = {}) =>
        setToasts(({ [key]: selected, ...toasts }) => {
          if (selected) {
            clearTimeout(selected.handle);
          }
          return {
            ...toasts,
            [key]: {
              node,
              handle: setTimeout(() => {
                setToasts(({ [key]: _, ...toasts }) => toasts);
              }, timeout) as never as number,
            },
          };
        }),
      hide: (key: string) =>
        setToasts(({ [key]: selected, ...toasts }) => {
          if (selected) {
            clearTimeout(selected.handle);
          }
          return toasts;
        }),
    }),
    []
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div id="toast-host">
        <AnimatePresence>
          {Object.entries(toasts).map(([key, { node }]) => (
            <motion.div
              layout="position"
              key={key}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="toast"
            >
              {node}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const variants = {
  enter: {
    opacity: 0,
    scale: 0.75,
  },
  center: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 1.2,
  },
} satisfies Variants;
