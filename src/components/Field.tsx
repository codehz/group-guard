import { memoForward } from "@/component";
import { cssClipPath } from "@/svg" with { type: "macro" };
import classNames from "classnames";
import { create } from "css-in-bun" with { type: "macro" };
import { motion, type Variants } from "framer-motion";
import {
  type ElementRef,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";

export type BaseFieldProps = {
  label: string;
  required?: boolean;
  description?: string;
};
export const Field = memoForward(function Field(
  {
    label,
    required,
    children,
    description,
    flat,
  }: BaseFieldProps & { children: ReactNode; flat?: true },
  ref: ForwardedRef<ElementRef<"label">>
) {
  return (
    <motion.label
      data-swipe
      variants={variants}
      className={styles.Field}
      ref={ref}
    >
      <div
        data-swipe
        className={classNames(styles.Label, required && styles.Required)}
      >
        {label}
      </div>
      {flat ? children : <div className={styles.Border}>{children}</div>}
      {description && <div className={styles.Description}>{description}</div>}
    </motion.label>
  );
});

const variants: Variants = {
  enter: { y: 12, opacity: 0 },
  present: { y: 0, opacity: 1 },
  exit: { opacity: 0 },
};

const styles = create({
  Field: { display: "grid", gap: 4 },
  Label: {
    fontSize: 12,
    color: "var(--tg-theme-subtitle-text-color)",
    fontWeight: 200,
  },
  Border: {
    position: "relative",
    contain: "paint",
    backgroundColor: "var(--tg-theme-bg-color)",
    "::before": {
      content: "''",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      boxShadow: "inset 0 0 0 1px var(--tg-theme-accent-text-color)",
      opacity: 0.2,
      borderRadius: 4,
    },
  },
  Required: {
    "::after": {
      content: "''",
      display: "inline-block",
      width: "1em",
      height: "1em",
      backgroundColor: "currentcolor",
      clipPath: cssClipPath(
        "m14 6a1 1 0 00-4 0l0 12a1 1 0 004 0zm4.2 4.7a1 1 60 00-2-3.4l-10.4 6a1 1 60 002 3.4zm-10.4-3.4a1 1-60 00-2 3.4l10.4 6a1 1-60 002-3.4z"
      ),
    },
  },
  TextArea: {
    minHeight: "calc(var(--initial-lines) * 1.5em + 8px)",
    width: "100%",
    padding: "4px 8px",
    lineHeight: "1.5em",
  },
  Description: {
    fontSize: 10,
    color: "var(--tg-theme-hint-color)",
    "::before": {
      content: "''",
      display: "inline-block",
      width: "1em",
      height: "1em",
      backgroundColor: "currentcolor",
      clipPath: cssClipPath(
        "m14 6a1 1 0 00-4 0l0 12a1 1 0 004 0zm4.2 4.7a1 1 60 00-2-3.4l-10.4 6a1 1 60 002 3.4zm-10.4-3.4a1 1-60 00-2 3.4l10.4 6a1 1-60 002-3.4z"
      ),
    },
  },
});
