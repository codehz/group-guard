import { useEffect } from "react";

export function useValueEffect<T>(
  value: T,
  handler: (value: T) => void | (() => void)
) {
  useEffect(() => handler(value), [value]);
}
