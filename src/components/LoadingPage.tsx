import { AnimatedSuspense } from "@/components/AnimatedSuspense";
import { FloatLoading } from "@/components/Loading";
import {
  useStackNavigator,
  type PageOptions,
} from "@/components/StackNavigator";
import { useEffect, type ReactNode } from "react";

export function LoadingPage(props: {
  load: () => ReactNode;
  options?: PageOptions;
}) {
  return (
    <AnimatedSuspense
      fallback={<FloatLoading initial="enter" animate="present" exit="exit" />}
    >
      <Loader {...props} />
    </AnimatedSuspense>
  );
}

function Replace({
  children,
  options,
}: {
  children: ReactNode;
  options?: PageOptions;
}) {
  const navigator = useStackNavigator();
  useEffect(() => {
    navigator.replace(children, options);
  }, []);
  return null;
}

function Loader({
  load,
  options,
}: {
  load: () => ReactNode;
  options?: PageOptions;
}) {
  const page = load();
  return <Replace options={options}>{page}</Replace>;
}
