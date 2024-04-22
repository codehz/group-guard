export function withAbort(fn: (signal: AbortSignal) => unknown) {
  const controller = new AbortController();
  fn(controller.signal);
  return () => controller.abort();
}