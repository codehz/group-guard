import { memoMotion } from "@/component";
import { useEventHandler } from "@/hooks/useEventHandler";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FormEvent,
  type ForwardedRef,
} from "react";
import forkRef from "react-fork-ref";
import {
  useMainButtonClicked,
  useMainButtonLoadingIndicator,
} from "./StackNavigator";

type Context = { submit: () => void };
const Context = createContext<Context>({ submit: () => {} });

export const Form = memoMotion(function Form(
  {
    children,
    onSubmit,
    ...props
  }: Omit<ComponentPropsWithoutRef<"form">, "onSubmit"> & {
    onSubmit(): void | Promise<void>;
  },
  ref: ForwardedRef<ElementRef<"form">>
) {
  const localref = useRef<ElementRef<"form">>(null);
  const [loading, setLoading] = useState(false);
  const submit = useEventHandler(async () => {
    if (loading) return;
    const current = localref.current;
    if (!current) return;
    if (!current.checkValidity()) {
      current.reportValidity();
      return;
    }
    setLoading(true);
    try {
      await onSubmit();
    } catch (e) {
      Telegram.WebApp.showPopup({
        title: "提交失败",
        message: e + "",
        buttons: [{ type: "close", text: "关闭" }],
      });
    }
    setLoading(false);
    return;
  });
  const context = useMemo(() => ({ submit }), []);
  const handleSubmit = useEventHandler((e: FormEvent) => {
    e.preventDefault();
    submit();
  });
  useMainButtonClicked(submit);
  useMainButtonLoadingIndicator(loading);
  return (
    <form {...props} onSubmit={handleSubmit} ref={forkRef(localref, ref)}>
      <Context.Provider value={context}>{children}</Context.Provider>
    </form>
  );
});

export function useForm() {
  return useContext(Context);
}
