import { memoForward } from "@/component";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useTree, type Tree } from "@/tree-state";
import { create } from "css-in-bun" with { type: "macro" };
import type { ElementRef, ForwardedRef } from "react";
import { Field, type BaseFieldProps } from "./Field";

export const ToggleField = memoForward(function ToggleField(
  { label, required, tree, ...rest }: BaseFieldProps & { tree: Tree<boolean> },
  ref: ForwardedRef<ElementRef<"label">>
) {
  const [checked, setChecked] = useTree(tree);
  const handleChange = useEventHandler(
    (e: React.ChangeEvent<HTMLInputElement>) => setChecked(e.target.checked)
  );
  return (
    <Field {...rest} label={label} required={required} ref={ref} flat>
      <input
        type="checkbox"
        required={required}
        checked={checked}
        onChange={handleChange}
        className={styles.Switch}
      />
    </Field>
  );
});
const styles = create({
  Switch: {
    WebkitAppearance: "none",
    MozAppearance: "none",
    appearance: "none",
    width: "3.5em",
    height: "1.5em",
    backgroundColor: "var(--tg-theme-secondary-bg-color)",
    borderRadius: 100,
    position: "relative",
    outline: "none",
    transition: "all .2s ease-in-out",
    boxShadow: "inset 0 0 .1em rgba(0,0,0,.3)",
    cursor: "pointer",
    "::after": {
      position: "absolute",
      content: "''",
      width: "1.5em",
      height: "1.5em",
      borderRadius: 100,
      backgroundColor: "var(--tg-theme-button-text-color)",
      boxShadow: "0 0 .25em rgba(0,0,0,.3)",
      transform: "scale(0.7)",
      transition: "all .2s ease-in-out",
      left: 0,
    },
    ":checked": {
      backgroundColor: "var(--tg-theme-button-color)",
      boxShadow: "inset 0 0 0 rgba(0,0,0,.3)",
      "::after": {
        left: "calc(100% - 1.5em)",
      },
    },
  },
});
