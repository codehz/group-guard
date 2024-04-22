import { memoMotion } from "@/component";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useValueEffect } from "@/hooks/useValueEffect";
import { useTree, type Tree } from "@/tree-state";
import { format } from "date-fns";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ForwardedRef,
} from "react";
import forkRef from "react-fork-ref";
import { AutoSizeTextArea } from "./AutoSizeTextArea";
import { useToastMessage } from "./ToastManager";
import { emulateTab } from "emulate-tab";

export namespace tree {
  export const input = memoMotion(function Input(
    {
      tree,
      onChange,
      defaultValue,
      onValidate,
      maxLength,
      ...props
    }: Omit<ComponentPropsWithoutRef<"input">, "value"> & {
      tree: Tree<string> | Tree<string | undefined>;
      onValidate?: (value: string) => string;
    },
    ref: ForwardedRef<ElementRef<"input">>
  ) {
    const [value, setValue] = useTree(tree as Tree<string>);
    const localref = useRef<ElementRef<"input">>(null);
    const toast = useToastMessage();
    const setValidityMessage = useEventHandler((text: string) => {
      localref.current?.setCustomValidity(text);
      toast(text);
    });
    useValueEffect(value, (value): void => {
      if (maxLength && value) {
        if (value.length > maxLength) {
          setValidityMessage("超过最大长度:" + maxLength);
          return;
        } else setValidityMessage("");
      }
      if (onValidate) setValidityMessage(onValidate(value));
    });
    const handleChange = useCallback(
      (e: React.ChangeEvent<ElementRef<"input">>) => {
        setValue(e.currentTarget.value);
        onChange?.(e);
      },
      [onChange]
    );
    return (
      <input
        {...props}
        value={value ?? defaultValue ?? ""}
        onChange={handleChange}
        ref={forkRef(ref, localref)}
        maxLength={maxLength}
      />
    );
  });

  export const number = memoMotion(function NumberInput(
    {
      tree,
      onChange,
      defaultValue = 0,
      onValidate,
      ...props
    }: Omit<ComponentPropsWithoutRef<"input">, "value" | "defaultValue"> & {
      tree: Tree<number> | Tree<number | undefined>;
      defaultValue?: number;
      onValidate?: (value: number) => string;
    },
    ref: ForwardedRef<ElementRef<"input">>
  ) {
    const [value, setValue] = useTree(tree as Tree<number>);
    const [text, setText] = useState(
      (Number.isFinite(value) ? value : defaultValue) + ""
    );
    const localref = useRef<ElementRef<"input">>(null);
    const toast = useToastMessage();
    useValueEffect(value, (value) => {
      const parsed = parseFloat(text.toString());
      if (parsed !== value) setText(parsed + "");
      if (onValidate) {
        const message = onValidate?.(parsed);
        localref.current?.setCustomValidity(message);
        toast(message);
      }
    });
    return (
      <input
        {...props}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const trimed = e.target.value.trim();
          const parsed = parseFloat(trimed);
          if (Number.isFinite(parsed)) setValue(parsed);
        }}
        ref={forkRef(ref, localref)}
      />
    );
  });
  export const datetime = memoMotion(function DateTimeInput(
    {
      tree,
      onChange,
      defaultValue = new Date(),
      onValidate,
      ...props
    }: Omit<ComponentPropsWithoutRef<"input">, "value" | "defaultValue"> & {
      tree: Tree<Date> | Tree<Date | undefined>;
      defaultValue?: Date;
      onValidate?: (value: Date) => string;
    },
    ref: ForwardedRef<ElementRef<"input">>
  ) {
    const [value, setValue] = useTree(tree as Tree<Date>);
    const [text, setText] = useState(() => {
      try {
        return format(value, "yyyy-MM-dd'T'HH:mm");
      } catch {
        return "";
      }
    });
    const localref = useRef<ElementRef<"input">>(null);
    const toast = useToastMessage();
    useValueEffect(value, (value) => {
      if (onValidate) {
        const message = onValidate?.(value);
        localref.current?.setCustomValidity(message);
        toast(message);
      }
      try {
        setText(format(value, "yyyy-MM-dd'T'HH:mm"));
      } catch {}
    });
    return (
      <input
        {...props}
        type="datetime-local"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const date = new Date(e.target.value);
          setValue(date);
        }}
        ref={forkRef(ref, localref)}
      />
    );
  });
  export const textarea = memoMotion(function TextArea(
    {
      tree,
      onChange,
      onValidate,
      maxLength,
      enterKeyHint = "enter",
      ...props
    }: Omit<ComponentPropsWithoutRef<"textarea">, "value" | "defaultValue"> & {
      tree: Tree<string> | Tree<string | undefined>;
      onValidate?: (value: string) => string;
      enterKeyHint?:
        | "enter"
        | "done"
        | "go"
        | "next"
        | "previous"
        | "search"
        | "send";
    },
    ref: ForwardedRef<ElementRef<"textarea">>
  ) {
    const [value, setValue] = useTree(tree as Tree<string>);
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (
          enterKeyHint !== "enter" &&
          (e.nativeEvent as InputEvent).inputType === "insertLineBreak"
        ) {
          switch (enterKeyHint) {
            case "next":
              emulateTab();
              break;
            case "previous":
              emulateTab.backwards();
              break;
            case "done":
              e.currentTarget.blur();
              break;
            default:
              e.currentTarget.form?.requestSubmit(e.currentTarget);
              break;
          }
          return;
        }
        setValue(
          enterKeyHint !== "enter"
            ? e.currentTarget.value.replaceAll("\n", "")
            : e.currentTarget.value
        );
        onChange?.(e);
      },
      [onChange]
    );
    const localref = useRef<ElementRef<"textarea">>(null);
    useEffect(() => {
      localref.current!.enterKeyHint = enterKeyHint ?? "";
    }, [enterKeyHint]);
    const toast = useToastMessage();
    const setValidityMessage = useEventHandler((text: string) => {
      localref.current?.setCustomValidity(text);
      toast(text);
    });
    useValueEffect(value, (value): void => {
      if (maxLength && value) {
        if (value.length > maxLength) {
          setValidityMessage("超过最大长度:" + maxLength);
          return;
        } else setValidityMessage("");
      }
      if (onValidate) setValidityMessage(onValidate(value));
    });
    return (
      <AutoSizeTextArea
        {...props}
        value={value ?? ""}
        onChange={handleChange}
        ref={forkRef(ref, localref)}
        maxLength={maxLength}
      />
    );
  });
}
