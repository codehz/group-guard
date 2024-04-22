import classNames from "classnames";
import { style } from "css-in-bun" with { type: "macro" };
import {
  motion,
  useAnimate,
  useDragControls,
  type PanInfo,
  type Variants,
} from "framer-motion";
import { memo, useEffect, type ReactNode } from "react";
import { useEventHandler } from "../hooks/useEventHandler";
import { useStackNavigator } from "./StackNavigator";

export const WindowFrame = memo(function WindowFrame({
  title,
  children,
  expandOnMount,
  className,
  locked,
}: {
  title: string;
  children: ReactNode;
  expandOnMount?: boolean;
  className?: string;
  locked?: boolean;
}) {
  useEffect(() => {
    if (expandOnMount) Telegram.WebApp.expand();
  }, [expandOnMount]);
  const [scope, animate] = useAnimate();
  const navigator = useStackNavigator();
  const handleDragEnd = useEventHandler((_, info: PanInfo) => {
    if (!locked && (info.offset.x > 100 || info.velocity.x > 500)) {
      animate(scope.current, { x: "100vw" }, { velocity: info.velocity.x });
      navigator.pop();
    } else {
      animate(scope.current, { x: 0 }, { velocity: info.velocity.x });
    }
  });
  const controls = useDragControls();
  const handlePointerDown = useEventHandler((e: React.PointerEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).dataset.swipe != null
    ) {
      controls.start(e);
    }
  });
  return (
    <motion.div
      variants={container}
      className={style({
        display: "grid",
        contain: "strict",
        width: "100%",
        height: "100%",
        gridTemplateRows: "auto 1fr",
        "::before": {
          content: "''",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--tg-theme-secondary-bg-color)",
          zIndex: -1,
          opacity: 0.5,
        },
      })}
    >
      <header
        className={style({
          fontSize: 12,
          textAlign: "center",
          padding: "0 8px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          backgroundColor: "var(--tg-theme-secondary-bg-color)",
          color:
            "var(--tg-theme-subtitle-text-color, var(--tg-theme-hint-color))",
        })}
      >
        {title}
      </header>
      <motion.div
        className={style({
          contain: "strict",
          backgroundColor: "var(--tg-theme-bg-color)",
          margin: 8,
          borderRadius: 8,
          overflowY: "auto",
        })}
        drag="x"
        dragConstraints={locked ? { left: 0, right: 0 } : { left: 0 }}
        ref={scope}
        onDragEnd={handleDragEnd}
        dragControls={controls}
        onPointerDown={handlePointerDown}
        dragListener={false}
      >
        <motion.main
          data-swipe
          variants={content}
          transition={{ staggerChildren: 1 / 20 }}
          className={classNames(
            style({
              width: "100%",
              minHeight: "100%",
              height: "fit-content",
              padding: 8,
              "@supports (font: -apple-system-body)": {
                display: "grid",
                alignContent: "flex-start",
              },
              "@supports not (font: -apple-system-body)": {
                display: "flex",
                flexDirection: "column",
              },
            }),
            className
          )}
        >
          {children}
        </motion.main>
      </motion.div>
    </motion.div>
  );
});

const container: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 1 },
  exit: { opacity: 0 },
};

const content: Variants = {
  enter: { y: 20 },
  present: { y: 0, transition: { ease: "easeOut" } },
  exit: { y: 20, transition: { ease: "easeIn" } },
};
