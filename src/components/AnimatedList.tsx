import { memoForward } from "@/component";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useSubTrees, useTreeSnapshot, type Tree } from "@/tree-state";
import { create } from "css-in-bun" with { type: "macro" };
import {
  AnimatePresence,
  Reorder,
  useDragControls,
  type Variants,
} from "framer-motion";
import {
  useMemo,
  type ComponentType,
  type ElementRef,
  type ForwardedRef,
  type ReactNode,
  type RefAttributes,
} from "react";
import { SvgIcons } from "./SvgPathIcons";

function preventScroll(e: TouchEvent) {
  e.preventDefault();
}

function ItemRendererImpl<T, R, K extends string | number, X = void>(
  {
    value,
    extractKey,
    tree,
    ItemComponent,
    onClickItem,
    custom,
  }: {
    value: R;
    extractKey: (item: R) => K;
    tree: Tree<T>;
    ItemComponent: ComponentType<{ value: R; tree: Tree<T> } & X>;
    onClickItem?: (
      info: { key: K; value: R; tree: Tree<T> }
    ) => void;
    custom: X;
  },
  ref: ForwardedRef<ElementRef<"div">>
) {
  const controls = useDragControls();
  const startDrag = useEventHandler((e: React.PointerEvent) => {
    e.preventDefault();
    window.addEventListener("touchmove", preventScroll, { passive: false });
    requestAnimationFrame(() => controls.start(e));
  });
  const allowScroll = useEventHandler(() => {
    window.removeEventListener("touchmove", preventScroll);
  });
  const prevented = useEventHandler(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }
  );
  const handleClick = useEventHandler(
    (e: React.MouseEvent<ElementRef<"div">>) => {
      onClickItem?.({ key: extractKey(value), value, tree });
    }
  );
  return (
    <Reorder.Item
      ref={ref}
      as="div"
      role="listitem"
      value={extractKey(value)}
      layout="position"
      layoutScroll
      className={styles.ItemRenderer}
      variants={variants}
      initial="enter"
      animate="present"
      exit="exit"
      dragListener={false}
      dragControls={controls}
      onDragEnd={allowScroll}
      onClick={handleClick}
    >
      <SvgIcons.DragHandle
        className={styles.DragHandle}
        onPointerDown={startDrag}
        onClick={prevented}
      />
      <ItemComponent {...custom} value={value} tree={tree} />
    </Reorder.Item>
  );
}

const variants: Variants = {
  enter: { opacity: 0, y: 12 },
  present: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

const ItemRenderer = memoForward(ItemRendererImpl) as <
  T,
  R,
  K extends string | number,
  X = void,
>(
  props: Parameters<typeof ItemRendererImpl<T, R, K, X>>[0] &
    RefAttributes<Parameters<typeof ItemRendererImpl<T, R, K, X>>[1]>
) => ReactNode;

export function AnimatedList<T, R, K extends string | number, X = void>(
  {
    children,
    tree,
    extractKey,
    extractShallow,
    keyEquals,
    ItemComponent,
    onClickItem,
    custom,
  }: {
    children?: ReactNode;
    tree: Tree<T[]>;
    extractKey: (item: R) => K;
    extractShallow: (item: T) => R;
    keyEquals: (key: K, item: T) => boolean;
    ItemComponent: ComponentType<{ value: R; tree: Tree<T> } & X>;
    onClickItem?: (
      info: { key: K; value: R; tree: Tree<T> }
    ) => void;
    custom: X;
  },
  ref: ForwardedRef<ElementRef<"div">>
) {
  const data = useTreeSnapshot(tree, (items) => items.map(extractShallow));
  const keys = useMemo(() => data.map(extractKey), [data, extractKey]);
  const reorder = useEventHandler((neworder: K[]) => {
    tree.update((old) =>
      neworder.map((key) => old.find((p) => keyEquals(key, p))!)
    );
  });
  const subt = useSubTrees(tree);
  return (
    <Reorder.Group
      as="div"
      role="list"
      values={keys}
      onReorder={reorder}
      className={styles.AnimatedList}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {data.map((item, idx) => (
          <ItemRenderer<T, R, K, X>
            key={extractKey(item)}
            value={item}
            tree={subt[idx]}
            extractKey={extractKey}
            ItemComponent={ItemComponent}
            custom={custom}
            onClickItem={onClickItem}
          />
        ))}
        {children}
      </AnimatePresence>
    </Reorder.Group>
  );
}

const styles = create({
  AnimatedList: {
    display: "grid",
    gap: 8,
  },
  ItemRenderer: {
    display: "grid",
    position: "relative",
    contain: "paint",
    padding: 4,
    gridTemplateColumns: "auto minmax(0, 1fr)",
    backgroundColor: "var(--tg-theme-bg-color)",
    borderRadius: 4,
    "::after": {
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
  DragHandle: {
    width: 32,
    height: 24,
    placeSelf: "center",
    color: "var(--tg-theme-hint-color)",
    touchAction: "none",
  },
});
