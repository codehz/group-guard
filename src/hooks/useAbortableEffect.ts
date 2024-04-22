import { withAbort } from "@/abort";
import { useEffect, type DependencyList } from "react";

export function useAbortableEffect(
  handler: (signal: AbortSignal) => unknown,
  dependencies: DependencyList = []
) {
  useEffect(() => withAbort(handler), dependencies);
}
