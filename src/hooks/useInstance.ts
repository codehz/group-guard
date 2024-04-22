import { useRef } from "react";

export function useInstance<T>(fn: () => T) {
  const ref = useRef<T>();
  if (ref.current == null) {
    ref.current = fn();
  }
  return ref.current!;
}
