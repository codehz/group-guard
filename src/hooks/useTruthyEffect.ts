import { useEffect } from "react";

type Falsy = false | 0 | "" | null | undefined;

export function useTruthyEffect<T>(
  value: T | Falsy,
  handler: (value: T) => void | (() => void)
) {
  useEffect(() => {
    if (value) return handler(value);
  }, [value]);
}
