import { memoForward, memoMotion } from "@/component";
import classNames from "classnames";
import { style } from "css-in-bun" with { type: "macro" };
import type { CustomDomComponent } from "framer-motion";
import { type ComponentProps, type ElementRef, type ForwardedRef } from "react";
import { useEventHandler } from "../hooks/useEventHandler";

type SvgPathIconProps = {
  children: string;
  size?: number;
} & ComponentProps<"svg">;

export const SvgPathIcon = memoForward(function SvgPathIcon(
  { children, size, viewBox = "0 0 24 24", ...rest }: SvgPathIconProps,
  ref: ForwardedRef<SVGSVGElement>
) {
  return (
    <svg {...rest} width={size} height={size} ref={ref} viewBox={viewBox}>
      <path fill="currentColor" d={children} />
    </svg>
  );
});

function createIcon(name: string, path: string) {
  const Icon = memoMotion(
    (
      props: Omit<ComponentProps<typeof SvgPathIcon>, "children">,
      ref: ForwardedRef<SVGSVGElement>
    ) => {
      return (
        <SvgPathIcon {...props} ref={ref}>
          {path}
        </SvgPathIcon>
      );
    }
  );
  Icon.displayName = `SvgPathIcon(${name})`;
  return Icon;
}

function createIconButton(
  name: string,
  Icon: React.MemoExoticComponent<
    CustomDomComponent<Omit<ComponentProps<typeof SvgPathIcon>, "children">>
  >
) {
  const IconButton = memoMotion(
    (
      {
        className,
        destructive,
        filled,
        onClick,
      }: {
        destructive?: true;
        filled?: true;
        className?: string;
        onClick: () => void;
      },
      ref: ForwardedRef<ElementRef<"button">>
    ) => {
      const handleClick = useEventHandler((e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
      });
      return (
        <button
          type="button"
          style={{
            "--color": destructive
              ? "var(--tg-theme-destructive-text-color)"
              : filled
                ? "var(--tg-theme-button-color)"
                : "var(--tg-theme-text-color)",
          }}
          className={classNames(
            style({
              placeSelf: "center",
              padding: 4,
              borderRadius: 100,
              borderStyle: "solid",
              borderWidth: 2,
            }),
            filled
              ? style({
                  color: "var(--tg-theme-button-text-color)",
                  backgroundColor: "var(--color)",
                  borderColor: "var(--color)",
                })
              : style({
                  color: "var(--color)",
                  backgroundColor: "var(--tg-theme-bg-color)",
                }),
            className
          )}
          onClick={handleClick}
          ref={ref}
        >
          <Icon size={24} className={style({ display: "block" })} />
        </button>
      );
    }
  );
  IconButton.displayName = `IconButton(${name})`;
  return IconButton;
}

function createIcons<const I extends Record<string, string>>(
  input: I
): {
  [K in keyof I]: React.MemoExoticComponent<
    CustomDomComponent<Omit<SvgPathIconProps, "children">>
  >;
} {
  return Object.fromEntries(
    Object.entries(input).map(
      ([key, value]) => [key, createIcon(key, value)] as const
    )
  ) as any;
}

function createIconButtons<
  const I extends Record<
    string,
    React.MemoExoticComponent<
      CustomDomComponent<Omit<SvgPathIconProps, "children">>
    >
  >,
>(
  input: I
): {
  [K in keyof I]: React.MemoExoticComponent<
    CustomDomComponent<{
      className?: string;
      destructive?: true;
      filled?: boolean;
      onClick: () => void;
    }>
  >;
} {
  return Object.fromEntries(
    Object.entries(input).map(
      ([key, value]) => [key, createIconButton(key, value as any)] as const
    )
  ) as any;
}

export const SvgIcons = createIcons({
  ThreeDots:
    "m12 4a1 1 0 000 4 1 1 0 000-4m0 6a1 1 0 000 4 1 1 0 000-4m0 6a1 1 0 000 4 1 1 0 000-4",
  DragHandle:
    "m6 4a1 1 0 000 4 1 1 0 000-4m6 0a1 1 0 000 4 1 1 0 000-4m6 0a1 1 0 000 4 1 1 0 000 0 1 1 0 000-4m-12 6a1 1 0 000 4 1 1 0 000-4m6 0a1 1 0 000 4 1 1 0 000-4m6 0a1 1 0 000 4 1 1 0 000-4m-12 6a1 1 0 000 4 1 1 0 000-4m6 0a1 1 0 000 4 1 1 0 000-4m6 0a1 1 0 000 4 1 1 0 000-4",
  Edit: "m16 4h-9a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3v-9l-2 2v7a1 1 0 01-1 1l-10 0a1 1 0 01-1-1v-10a1 1 0 011-1h7zm-4 10 7-7-2-2-7 7zm6-10a1 1 0 012 2zm-7 11-3 1 1-3z",
  Trash:
    "m7 5a1 1 0 000 2h10a1 1 0 000-2h-4a1 1 0 00-2 0zm0 3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-10a1 1 0 00-1-1zm2 2 3 3 3-3a.1.1 0 011 1l-3 3 3 3a.1.1 0 01-1 1l-3-3-3 3a.1.1 0 01-1-1l3-3-3-3a.1.1 0 011-1",
  Recover:
    "m7 5a1 1 0 000 2h10a1 1 0 000-2h-4a1 1 0 00-2 0zm0 3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-10a1 1 0 00-1-1zm5 1 4 4-1 1-2.3-2.3v6.3h-1.4v-6.3l-2.3 2.3-1-1z",
  Copy: "m8 8 0-3a1 1 0 011-1l9 0a1 1 0 011 1l0 12a1 1 0 01-1 1l-3 0 0 1a1 1 0 01-1 1l-8 0a1 1 0 01-1-1l0-10a1 1 0 011-1zm2 0 5 0 0 8 2 0 0-10-7 0z",
  Config:
    "m7 5a1 1 0 000 6 1 1 0 000-6m0 2a1 1 0 010 2 1 1 0 010-2m5 0v2h8v-2zm5 6a1 1 90 010 6 1 1 90 010-6m0 2a1 1 90 000 2 1 1 90 000-2m-5 0v2h-8v-2z",
  ArrowRight: "m12 4a1 1 0 000 16 1 1 0 000-16m5 8-4 4v-3h-6v-2h6v-3z",
});

export const IconButton = createIconButtons(SvgIcons);
