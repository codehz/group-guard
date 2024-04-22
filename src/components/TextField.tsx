import { memoForward } from "@/component";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useValueEffect } from "@/hooks/useValueEffect";
import { useTree, type Tree } from "@/tree-state";
import { style } from "css-in-bun" with { type: "macro" };
import { emulateTab } from "emulate-tab";
import { useEffect, useRef, type ElementRef, type ForwardedRef } from "react";
import { AutoSizeTextArea } from "./AutoSizeTextArea";
import { Field, type BaseFieldProps } from "./Field";
import { useToastMessage } from "./ToastManager";
import { useIsActive } from "@/components/StackNavigator";

export const TextField = memoForward(function TextField(
  {
    tree,
    label,
    placeholder,
    required,
    enterKeyAction = "enter",
    minLength,
    maxLength,
    initialLines = 1,
    autoFocusIfEmpty,
    onDone,
    disabled,
    ...rest
  }: {
    tree: Tree<string>;
    placeholder?: string;
    enterKeyAction?: "enter" | "next" | "previous" | "done";
    minLength?: number;
    maxLength?: number;
    initialLines?: number;
    autoFocusIfEmpty?: boolean;
    onDone?: () => void;
    disabled?: boolean;
  } & BaseFieldProps,
  ref: ForwardedRef<ElementRef<"label">>
) {
  const [value, setValue] = useTree(tree as Tree<string>);
  const handleChange = useEventHandler(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (
        enterKeyAction !== "enter" &&
        (e.nativeEvent as InputEvent).inputType === "insertLineBreak"
      ) {
        switch (enterKeyAction) {
          case "next":
            emulateTab();
            break;
          case "previous":
            emulateTab.backwards();
            break;
          case "done":
            e.currentTarget.blur();
            onDone?.();
            break;
          default:
            e.currentTarget.form?.requestSubmit(e.currentTarget);
            break;
        }
        return;
      }
      setValue(
        enterKeyAction === "enter"
          ? e.currentTarget.value
          : e.currentTarget.value.replaceAll("\n", "")
      );
    }
  );
  const textarea = useRef<ElementRef<"textarea">>(null);
  useEffect(() => {
    textarea.current!.enterKeyHint = enterKeyAction ?? "";
  }, [enterKeyAction]);
  const toast = useToastMessage();
  const setValidityMessage = useEventHandler((text: string) => {
    textarea.current?.setCustomValidity(text);
    toast(text);
  });
  const check = useEventHandler(() => {
    if (maxLength && value) {
      if (value.length > maxLength) {
        setValidityMessage("超过最大长度:" + maxLength);
        return;
      } else setValidityMessage("");
    }
  });
  useEffect(() => {
    if (autoFocusIfEmpty && !value) textarea.current!.focus();
  }, []);
  const active = useIsActive();
  return (
    <Field {...rest} label={label} required={required} ref={ref}>
      <AutoSizeTextArea
        value={value ?? ""}
        onChange={handleChange}
        onBlur={check}
        ref={textarea}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        style={{ "--initial-lines": initialLines }}
        className={style({
          minHeight: "calc(var(--initial-lines) * 1.5em + 8px)",
          width: "100%",
          padding: "4px 8px",
          lineHeight: "1.5em",
          ":disabled": { opacity: 0.5 },
        })}
        disabled={!active || disabled}
      />
    </Field>
  );
});
