import { memoForward } from "@/component";
import { useIsActive } from "@/components/StackNavigator";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useValueEffect } from "@/hooks/useValueEffect";
import { useTree, type Tree } from "@/tree-state";
import { style } from "css-in-bun" with { type: "macro" };
import { emulateTab } from "emulate-tab";
import {
  useEffect,
  useRef,
  useState,
  type ElementRef,
  type ForwardedRef,
} from "react";
import { Field, type BaseFieldProps } from "./Field";
import { useToastMessage } from "./ToastManager";

export const NumberField = memoForward(function TextField(
  {
    tree,
    label,
    placeholder,
    required,
    enterKeyAction = "done",
    min = -Infinity,
    max = Infinity,
    initialLines = 1,
    autoFocusIfEmpty,
    disabled,
    ...rest
  }: {
    tree: Tree<number>;
    placeholder?: string;
    enterKeyAction?: "next" | "previous" | "done";
    min?: number;
    max?: number;
    initialLines?: number;
    autoFocusIfEmpty?: boolean;
    disabled?: boolean;
  } & BaseFieldProps,
  ref: ForwardedRef<ElementRef<"label">>
) {
  const [value, setValue] = useTree(tree);
  const [text, setText] = useState(
    () => (Number.isFinite(value) ? value : "") + ""
  );
  const handleChange = useEventHandler(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if ((e.nativeEvent as InputEvent).inputType === "insertLineBreak") {
        switch (enterKeyAction) {
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
      setText(e.target.value);
      const trimed = e.target.value.trim();
      const parsed = parseFloat(trimed);
      if (Number.isFinite(parsed)) {
        setValue(parsed);
      }
    }
  );
  const input = useRef<ElementRef<"input">>(null);
  useEffect(() => {
    input.current!.enterKeyHint = enterKeyAction ?? "";
  }, [enterKeyAction]);
  const toast = useToastMessage();
  const setValidityMessage = useEventHandler((text: string) => {
    input.current?.setCustomValidity(text);
    toast(text);
  });
  const check = useEventHandler(() => {
    setValidityMessage(value < min || value > max ? "值超出范围" : "");
  });
  useValueEffect(value, (value) => {
    const parsed = parseFloat(text.toString());
    if (parsed !== value) setText(value + "");
  });
  useEffect(() => {
    if (autoFocusIfEmpty && !value) input.current!.focus();
  }, []);
  const active = useIsActive();
  return (
    <Field {...rest} label={label} required={required} ref={ref}>
      <input
        value={text}
        onChange={handleChange}
        onBlur={check}
        ref={input}
        required={required}
        placeholder={placeholder}
        inputMode="numeric"
        className={style({
          minHeight: "calc(1.5em + 8px)",
          width: "100%",
          padding: "4px 8px",
          lineHeight: "1.5em",
        })}
        disabled={!active || disabled}
      />
    </Field>
  );
});
