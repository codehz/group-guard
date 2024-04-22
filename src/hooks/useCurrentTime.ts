import { useSyncExternalStore } from "react";

let last = Date.now();
const now = () => (globalThis.window ? last : Date.now());

export function useCurrentTime(updateInterval = 1000) {
  return useSyncExternalStore(
    (cb) => {
      const handler = setInterval(() => {
        last = Date.now();
        cb();
      }, updateInterval);
      return () => clearInterval(handler);
    },
    now,
    now
  );
}
