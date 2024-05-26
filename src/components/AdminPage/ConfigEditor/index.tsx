import { api } from "@/api";
import { memoForward } from "@/component";
import { NotificationModeEditor } from "@/components/AdminPage/ConfigEditor/NotificationModeEditor";
import { WelcomePageEditor } from "@/components/AdminPage/ConfigEditor/WelcomePageEditor";
import { Fieldset } from "@/components/Fieldset";
import { Form } from "@/components/Form";
import { useLoading } from "@/components/LoadingContext";
import { LoadingPage } from "@/components/LoadingPage";
import { NumberField } from "@/components/NumberField";
import { useStackNavigator } from "@/components/StackNavigator";
import { ToggleField } from "@/components/ToggleField";
import { WindowFrame } from "@/components/WindowFrame";
import { useEventHandler } from "@/hooks/useEventHandler";
import { showError } from "@/show-error";
import { useSubTrees, useTreeRoot } from "@/tree-state";
import { DefaultChatConfig, type ChatConfig } from "@shared/types";
import { style } from "css-in-bun" with { type: "macro" };
import type { Chat } from "grammy/types";
import { type ElementRef, type ForwardedRef } from "react";
import type { KeyedMutator } from "swr";

export function ConfigEditorLoader({ chat }: { chat: Chat.SupergroupGetChat }) {
  return (
    <LoadingPage
      load={() => {
        const { data, mutate } = api.admin.chat.config.useSWR(
          { chat_id: chat.id },
          { suspense: true, shouldRetryOnError: true }
        );
        return (
          <ConfigEditor
            chat={chat}
            config={{
              ...DefaultChatConfig,
              ...data,
            }}
            mutate={mutate}
          />
        );
      }}
      options={{ mainButton: { text: "保存全局配置" } }}
    />
  );
}

const ConfigEditor = memoForward(function ConfigEditor(
  {
    chat,
    config,
    mutate,
  }: {
    chat: Chat.SupergroupGetChat;
    config: ChatConfig;
    mutate: KeyedMutator<
      Partial<{
        welcome_page: {
          title: string;
          content: string;
        };
      }>
    >;
  },
  ref: ForwardedRef<ElementRef<"form">>
) {
  const navigator = useStackNavigator();
  const root = useTreeRoot(config);
  const subt = useSubTrees(root);
  const { trigger, isMutating } = api.admin.chat.update_config.useSWRMutation(
    {}
  );
  useLoading(isMutating);
  const save = useEventHandler(async () => {
    await mutate(
      (async () => {
        await trigger({
          chat_id: chat.id,
          config: root.value,
        });
        return root.value;
      })(),
      { optimisticData: root.value }
    ).catch(showError);
    navigator.pop();
  });
  return (
    <WindowFrame title={`${chat.title}的全局配置`}>
      <Form
        onSubmit={save}
        ref={ref}
        className={style({ display: "grid", gap: 8 })}
      >
        <Fieldset legend="验证设置">
          <ToggleField label="启用验证" tree={subt.enabled} />
          <NumberField
            label="验证时间限制（秒）"
            tree={subt.challenge_timeout}
            required
            min={60}
            max={60 * 60}
            enterKeyAction="next"
          />
          <NumberField
            label="默认ban时间（秒）"
            tree={subt.ban_duration}
            required
            min={60}
            max={60 * 60 * 24 * 30}
          />
        </Fieldset>
        <WelcomePageEditor tree={subt.welcome_page} />
        <NotificationModeEditor chat={chat.id} tree={root} />
      </Form>
    </WindowFrame>
  );
});
