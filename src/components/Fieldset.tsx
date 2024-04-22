import { style } from "css-in-bun" with { type: "macro" };
import type { ElementRef, ForwardedRef, ReactNode } from "react";
import { memoForward } from "../component";

export const Fieldset = memoForward(function Fieldset(
  {
    legend,
    children,
  }: {
    legend: string;
    children: ReactNode;
  },
  ref: ForwardedRef<ElementRef<"fieldset">>
) {
  return (
    <fieldset
      className={style({
        display: "grid",
        gap: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "var(--tg-theme-button-color)",
        borderStyle: "solid",
      })}
      ref={ref}
    >
      <legend
        className={style({
          fontSize: 12,
          backgroundColor: "var(--tg-theme-button-color)",
          color: "var(--tg-theme-button-text-color)",
          borderRadius: 4,
          padding: "2px 4px",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        })}
      >
        {legend}
      </legend>
      {children}
    </fieldset>
  );
});
