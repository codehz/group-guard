import { useTree, type Tree } from "@/tree-state";
import { AnimatePresence } from "framer-motion";
import {
  type ComponentType,
  type FC,
  type ReactElement,
  type ReactNode,
} from "react";

export function Tabs<K extends string, T extends { children: ReactElement }>({
  children: config,
  tree,
  Parent = DummyParent,
  TabBar = DummyParent,
  Tab,
}: {
  children: Record<K, T>;
  tree: Tree<K>;
  Parent?: ComponentType<{ children: ReactNode; tab?: string }>;
  TabBar?: ComponentType<{ children: ReactNode }>;
  Tab: ComponentType<T & { selected: boolean; onClick: () => void }>;
}) {
  const [tab, setTab] = useTree(tree);
  return (
    <Parent tab={tab}>
      <TabBar>
        {Object.entries(config).map(([key, value]) => (
          <Tab
            key={key}
            {...(value as T)}
            selected={key === tab}
            onClick={() => setTab(key as K)}
          />
        ))}
      </TabBar>
      <AnimatePresence initial={false} mode="popLayout">
        {config[tab].children}
      </AnimatePresence>
    </Parent>
  );
}

const DummyParent: FC<{ children: ReactNode; tab?: string }> = ({
  children,
}) => <>{children}</>;
