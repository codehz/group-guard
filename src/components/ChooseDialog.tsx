import { useEventHandler } from "@/hooks/useEventHandler";
import { create } from "css-in-bun" with { type: "macro" };
import type { ReactNode } from "react";
import { EmbedDialog } from "./EmbedDialog";
import { useStackNavigator } from "./StackNavigator";

export function ChooseDialog({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <EmbedDialog title={title}>
      <ul className={styles.OptionList}>{children}</ul>
    </EmbedDialog>
  );
}

ChooseDialog.Item = function Item({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  const navigator = useStackNavigator();
  const handleClick = useEventHandler((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.pop();
    onClick();
  });
  return (
    <li onClick={handleClick} className={styles.Option}>
      {children}
    </li>
  );
};

const styles = create({
  OptionList: {
    display: "grid",
    gap: 4,
    overflowY: "auto",
  },
  Option: {
    position: "relative",
    contain: "paint",
    padding: "4px 8px",
    textAlign: "center",
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
});
