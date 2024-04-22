import { useMemo } from "react";

export function useCompute<R, Ts extends any[]>(
  fn: (...args: Ts) => R,
  ...args: Ts
): R {
  // @ts-ignore
  return useMemo(() => fn(...args), args);
}
