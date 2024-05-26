import { memoForward } from "@/component";
import { ExternalMode } from "@/components/AdminPage/ConfigEditor/NotificationModeEditor/ExternalMode";
import { PrivateMode } from "@/components/AdminPage/ConfigEditor/NotificationModeEditor/PrivateMode";
import { Field } from "@/components/Field";
import { Fieldset } from "@/components/Fieldset";
import { NumberField } from "@/components/NumberField";
import { Tabs } from "@/components/Tabs";
import { useSubTrees, type Tree } from "@/tree-state";
import { type ChatConfig } from "@shared/types";
import classNames from "classnames";
import { style } from "css-in-bun" with { type: "macro" };
import {
  memo,
  type ElementRef,
  type ForwardedRef,
  type ReactNode,
} from "react";

export const NotificationModeEditor = memo(function NotificationModeEditor({
  chat,
  tree,
}: {
  chat: number;
  tree: Tree<ChatConfig>;
}) {
  const subt = useSubTrees(tree);
  return (
    <Fieldset legend="验证结果通知">
      <Tabs
        tree={subt.notification_mode}
        TabBar={NotificationModeTabBar}
        Tab={NotificationModeTab}
      >
        {{
          private: {
            name: "私聊管理员",
            children: <PrivateMode chat={chat} />,
          },
          external: {
            name: "发送至外部群聊",
            children: (
              <ExternalMode
                chat={chat}
                tree={subt.notification_external_chat_id}
              />
            ),
          },
          direct: {
            name: "发回原群",
            children: (
              <NumberField
                label="过期时间（秒）"
                description="过期后，将会私聊管理员"
                tree={subt.notification_direct_timeout}
              />
            ),
          },
        }}
      </Tabs>
    </Fieldset>
  );
});
const NotificationModeTabBar = memo(function NotificationModeTabBar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Field label="通知模式" flat>
      <div className={style({ display: "flex", gap: 4, flexWrap: "wrap" })}>
        {children}
      </div>
    </Field>
  );
});
const NotificationModeTab = memoForward(function NotificationModeTab(
  {
    name,
    selected,
    onClick,
  }: {
    name: string;
    selected: boolean;
    onClick: () => void;
  },
  ref: ForwardedRef<ElementRef<"div">>
) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={classNames(
        style({
          borderRadius: 4,
          padding: "4px 6px",
          fontWeight: 200,
          fontSize: 12,
        }),
        selected
          ? style({
              backgroundColor: "var(--tg-theme-button-color)",
              color: "var(--tg-theme-button-text-color)",
            })
          : style({
              color: "var(--tg-theme-button-color)",
              boxShadow: "inset 0 0 0 1px var(--tg-theme-accent-text-color)",
            })
      )}
    >
      {name}
    </div>
  );
});
