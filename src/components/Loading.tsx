import { AnimatedSuspense } from "@/components/AnimatedSuspense";
import classNames from "classnames";
import { style } from "css-in-bun" with { type: "macro" };
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  memo,
  useId,
  type ElementRef,
  type ForwardedRef,
  type ReactNode,
} from "react";
import { g, line } from "svg-in-bun" with { type: "macro" };
import { memoMotion } from "../component";

export const Loading = memo(({ fill = true }: { fill?: boolean }) => (
  <div
    className={classNames(
      style({
        display: "grid",
        placeItems: "center",
      }),
      fill &&
        style({
          flex: 1,
          "@supports (font: -apple-system-body)": {
            height: "-webkit-fill-available",
          },
        })
    )}
  >
    <svg viewBox="0 0 2400 2400" width="24" height="24">
      <g>
        <use
          href={g(
            { strokeWidth: "200", stroke: "currentColor", fill: "none" },
            line({ x1: 1200, y1: 600, x2: 1200, y2: 100 }),
            line({ opacity: 0.5, x1: 1200, y1: 2300, x2: 1200, y2: 1800 }),
            line({ opacity: 0.917, x1: 900, y1: 680.4, x2: 650, y2: 247.4 }),
            line({
              opacity: 0.417,
              x1: 1750,
              y1: 2152.6,
              x2: 1500,
              y2: 1719.6,
            }),
            line({ opacity: 0.833, x1: 680.4, y1: 900, x2: 247.4, y2: 650 }),
            line({
              opacity: 0.333,
              x1: 2152.6,
              y1: 1750,
              x2: 1719.6,
              y2: 1500,
            }),
            line({ opacity: 0.75, x1: 600, y1: 1200, x2: 100, y2: 1200 }),
            line({ opacity: 0.25, x1: 2300, y1: 1200, x2: 1800, y2: 1200 }),
            line({ opacity: 0.667, x1: 680.4, y1: 1500, x2: 247.4, y2: 1750 }),
            line({ opacity: 0.167, x1: 2152.6, y1: 650, x2: 1719.6, y2: 900 }),
            line({ opacity: 0.583, x1: 900, y1: 1719.6, x2: 650, y2: 2152.6 }),
            line({ opacity: 0.083, x1: 1750, y1: 247.4, x2: 1500, y2: 680.4 })
          )}
        />
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          keyTimes="0;0.08333;0.16667;0.25;0.33333;0.41667;0.5;0.58333;0.66667;0.75;0.83333;0.91667"
          values="0 1199 1199;30 1199 1199;60 1199 1199;90 1199 1199;120 1199 1199;150 1199 1199;180 1199 1199;210 1199 1199;240 1199 1199;270 1199 1199;300 1199 1199;330 1199 1199"
          dur="0.83333s"
          begin="0s"
          repeatCount="indefinite"
          calcMode="discrete"
        />
      </g>
    </svg>
  </div>
));

export const FloatLoading = memoMotion(function FloatLoading(
  {},
  ref: ForwardedRef<ElementRef<"div">>
) {
  return (
    <div
      className={style({
        height: "100%",
        width: "100%",
        position: "fixed",
        padding: 16,
      })}
      ref={ref}
    >
      <motion.div
        variants={backdrop}
        className={style({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--tg-theme-secondary-bg-color)",
        })}
      />
      <div
        className={style({
          display: "grid",
          placeItems: "center",
          height: "var(--tg-viewport-height)",
          pointerEvents: "none",
        })}
      >
        <motion.div
          variants={floating}
          className={style({
            gap: 16,
            padding: 32,
            backgroundColor: "var(--tg-theme-bg-color)",
            zIndex: 1,
            borderRadius: 16,
          })}
        >
          <Loading fill={false} />
        </motion.div>
      </div>
    </div>
  );
});

export function SuspensedLoader({ children }: { children: ReactNode }) {
  return (
    <AnimatedSuspense
      fallback={
        <motion.div
          variants={area}
          initial="enter"
          animate="present"
          exit="exit"
          className={style({ padding: 16 })}
        >
          <Loading />
        </motion.div>
      }
    >
      {children}
    </AnimatedSuspense>
  );
}

export function LoadingArea<T>({
  data,
  className,
  children,
}: {
  data: T | undefined | null;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  const id = useId();
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        layoutId={id}
        key={data == null ? "loading" : "loaded"}
        transition={{ staggerChildren: 1 / 20 }}
        variants={area}
        initial="enter"
        animate="present"
        exit="exit"
        className={
          data == null
            ? classNames(className, style({ padding: 16 }))
            : undefined
        }
      >
        {data == null ? <Loading /> : children(data)}
      </motion.div>
    </AnimatePresence>
  );
}

const area: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 1 },
  exit: { opacity: 0 },
};

const backdrop: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 0.5 },
  exit: { opacity: 0 },
};

const floating: Variants = {
  enter: { opacity: 0, scale: 0.75 },
  present: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.75 },
};
