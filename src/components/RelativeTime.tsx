import { format, formatDistance, formatRelative, isSameWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Suspense, memo, type ComponentProps } from "react";
import { useCompute } from "../hooks/useCompute";
import { useCurrentTime } from "../hooks/useCurrentTime";

function checkWeek(date: Date, baseDate: Date, options: any) {
  const baseFormat = "eee'('MM-dd')' HH:mm";
  if (isSameWeek(date, baseDate, options)) {
    return baseFormat;
  } else if (date.getTime() > baseDate.getTime()) {
    return "'下'" + baseFormat;
  }

  return "'上'" + baseFormat;
}

const formatRelativeLocale: any = {
  lastWeek: checkWeek,
  yesterday: "'昨天('MM-dd')' HH:mm",
  today: "'今天('MM-dd')' HH:mm",
  tomorrow: "'明天('MM-dd')' HH:mm",
  nextWeek: checkWeek,
  other: "yyyy-MM-dd HH:mm",
};

const locale = {
  ...zhCN,
  formatRelative: (token, date, baseDate, options) => {
    const item = formatRelativeLocale[token];
    if (item instanceof Function) {
      return item(date, baseDate, options);
    }
    return item;
  },
} as typeof zhCN;

function parseUTC(time: string) {
  return new Date(time.replace(" ", "T") + "Z");
}

export const RelativeTime = function RelativeTime(
  props: ComponentProps<typeof RelativeTimeImpl>
) {
  return (
    <Suspense
      fallback={useCompute(
        (date) => format(parseUTC(date), "yyyy-MM-dd HH:mm"),
        props.time
      )}
    >
      <RelativeTimeImpl {...props} />
    </Suspense>
  );
};

const RelativeTimeImpl = memo(function RelativeTime({
  time,
  mode = "relative",
}: {
  time: string;
  mode?: "relative" | "distance";
}) {
  if (typeof window === "undefined") throw new Error("client side only");
  return useCompute(
    (time: string, current: number, mode: "relative" | "distance") => {
      const target = parseUTC(time);
      return (mode === "relative" ? formatRelative : formatDistance)(
        target,
        new Date(current),
        { locale }
      );
    },
    time,
    useCurrentTime(2000),
    mode
  );
});
