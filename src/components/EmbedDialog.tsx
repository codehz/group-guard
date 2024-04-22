import { useEventHandler } from "@/hooks/useEventHandler";
import { create } from "css-in-bun" with { type: "macro" };
import { motion, type Variants } from "framer-motion";
import type { ReactElement } from "react";
import { useStackNavigator } from "./StackNavigator";

export function EmbedDialog({
  title,
  children,
}: {
  title: string;
  children: ReactElement;
}) {
  const navigator = useStackNavigator();
  const exit = useEventHandler(() => {
    navigator.pop();
  });
  return (
    <div className={styles.Container}>
      <motion.div
        variants={backdrop}
        className={styles.Backdrop}
        onClick={exit}
      />
      <div className={styles.Viewport}>
        <motion.div
          role="dialog"
          variants={dialog}
          className={styles.EmbedDialog}
        >
          <div className={styles.Title}>{title}</div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

const backdrop: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 0.5 },
  exit: { opacity: 0 },
};

const dialog: Variants = {
  enter: { opacity: 0, scale: 0.75 },
  present: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.75 },
};

const styles = create({
  EmbedDialog: {
    display: "grid",
    gap: 16,
    padding: 16,
    gridTemplateRows: "auto minmax(0, 1fr)",
    backgroundColor: "var(--tg-theme-bg-color)",
    zIndex: 1,
    borderRadius: 16,
    minWidth: 200,
    pointerEvents: "all",
  },
  Container: {
    height: "100%",
    position: "relative",
    padding: 16,
  },
  Backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--tg-theme-secondary-bg-color)",
  },
  Title: {
    fontSize: 12,
    color: "var(--tg-theme-hint-color)",
    textAlign: "center",
  },
  Content: {
    display: "grid",
    gap: 4,
    overflowY: "auto",
  },
  Viewport: {
    display: "grid",
    placeItems: "center",
    height: "var(--tg-viewport-height)",
    pointerEvents: "none",
  },
});
