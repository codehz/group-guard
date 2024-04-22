import { useIsPresent } from "framer-motion";
import { useRef } from "react";

export function useLastPresentValue<T>(value: T) {
  const isPresent = useIsPresent();
  const lastValue = useRef<T>();
  return (lastValue.current = isPresent ? value : lastValue.current!);
}
