import { memoMotion } from "@/component";
import { useId, type ElementRef, type ForwardedRef } from "react";

export const ChatProfileIcon = memoMotion(function ChatProfileIcon(
  {
    info: { title, photo, accent_color_id },
    className,
    size,
  }: {
    info: {
      title: string;
      photo?: { big_file_id: string };
      accent_color_id: number;
    };
    className?: string;
    size: number;
  },
  ref: ForwardedRef<ElementRef<"svg">>
) {
  const colors = peerColors[Telegram.WebApp.colorScheme]?.[accent_color_id];
  const linearGradient = useId();
  return (
    <svg
      style={{ width: size / 16 + "rem", height: size / 16 + "rem" }}
      viewBox="0 0 1 1"
      ref={ref}
      className={className}
    >
      <defs>
        {!!colors && (
          <linearGradient id={linearGradient} gradientTransform="rotate(90)">
            {colors.map((color, i) => (
              <stop
                key={i}
                offset={`${(i / colors.length) * 100}%`}
                stopColor={"#" + color}
              />
            ))}
          </linearGradient>
        )}
      </defs>
      <circle
        cx={0.5}
        cy={0.5}
        r={0.5}
        fill={
          colors
            ? `url(#${linearGradient})`
            : stdColor[accent_color_id] ?? "black"
        }
      />
      <text
        x={0.5}
        y={0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        style={{ fontSize: "0.5" }}
      >
        {title[0]}
      </text>
      {photo && (
        <image
          href={Bun.env.BOT_HOST + "/file/" + photo.big_file_id}
          width={1}
          height={1}
          clipPath="circle()"
        />
      )}
    </svg>
  );
});

const stdColor = {
  0: "red",
  1: "orange",
  2: "purple",
  3: "green",
  4: "cyan",
  5: "blue",
  6: "pink",
} as Record<string, string>;

const peerColors = {
  light: {
    "7": ["e15052", "f9ae63"],
    "8": ["e0802b", "fac534"],
    "9": ["a05ff3", "f48fff"],
    "10": ["27a910", "a7dc57"],
    "11": ["27acce", "82e8d6"],
    "12": ["3391d4", "7dd3f0"],
    "13": ["dd4371", "ffbe9f"],
    "14": ["247bed", "f04856", "ffffff"],
    "15": ["d67722", "1ea011", "ffffff"],
    "16": ["179e42", "e84a3f", "ffffff"],
    "17": ["2894af", "6fc456", "ffffff"],
    "18": ["0c9ab3", "ffad95", "ffe6b5"],
    "19": ["7757d6", "f79610", "ffde8e"],
    "20": ["1585cf", "f2ab1d", "ffffff"],
  },
  dark: {
    "7": ["ff9380", "992f37"],
    "8": ["ecb04e", "c35714"],
    "9": ["c697ff", "5e31c8"],
    "10": ["a7eb6e", "167e2d"],
    "11": ["40d8d0", "045c7f"],
    "12": ["52bfff", "0b5494"],
    "13": ["ff86a6", "8e366e"],
    "14": ["3fa2fe", "e5424f", "ffffff"],
    "15": ["ff905e", "32a527", "ffffff"],
    "16": ["66d364", "d5444f", "ffffff"],
    "17": ["22bce2", "3da240", "ffffff"],
    "18": ["22bce2", "ff9778", "ffda6b"],
    "19": ["9791ff", "f2731d", "ffdb59"],
    "20": ["3da6eb", "eea51d", "ffffff"],
  },
} as Record<string, Record<string, string[]>>;
