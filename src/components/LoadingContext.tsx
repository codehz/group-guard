import { AnimatePresence } from "framer-motion";
import {
  createContext,
  use,
  useId,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useCompute } from "../hooks/useCompute";
import { useTruthyEffect } from "../hooks/useTruthyEffect";
import { FloatLoading } from "./Loading";

const Context = createContext<Dispatch<SetStateAction<Record<string, true>>>>(
  () => {}
);

export function LoadingContext({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Record<string, true>>({});
  const showLoading = useCompute(
    (state) => Object.keys(state).length > 0,
    state
  );
  return (
    <>
      <Context.Provider value={setState}>{children}</Context.Provider>
      <AnimatePresence>
        {showLoading && (
          <FloatLoading initial="enter" animate="present" exit="exit" />
        )}
      </AnimatePresence>
    </>
  );
}

export function useLoading(loading: boolean) {
  const setState = use(Context);
  const id = useId();
  useTruthyEffect(loading, () => {
    setState((old) => ({ ...old, [id]: true }));
    return () => setState(({ [id]: _, ...rest }) => rest);
  });
}
