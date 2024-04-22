import {
  forwardRef,
  memo,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
} from "react";

const supports = globalThis.window?.CSS?.supports ?? (() => false);

const nativeSupportFormSizing =
  supports("form-sizing: normal") || supports("field-sizing: content");

export const AutoSizeTextArea = nativeSupportFormSizing
  ? "textarea"
  : memo(
      forwardRef(function AutoSizeTextArea(
        {
          className,
          style,
          value,
          defaultValue,
          ...props
        }: ComponentPropsWithoutRef<"textarea">,
        ref: ForwardedRef<HTMLTextAreaElement>
      ) {
        return (
          <div
            className={className}
            style={{
              ...style,
              position: "relative",
              boxShadow: "none",
            }}
          >
            <span
              style={{
                opacity: 0,
                zIndex: -1,
                whiteSpace: "pre-wrap",
                pointerEvents: "none",
              }}
            >
              {value ?? defaultValue}
              {typeof value === "string" && value.endsWith("\n") && <br />}
            </span>
            <textarea
              {...props}
              ref={ref}
              className={className}
              value={value}
              defaultValue={defaultValue}
              style={{
                ...style,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                margin: 0,
                fontSize: "inherit",
                borderWidth: 0,
              }}
            />
          </div>
        );
      })
    );
