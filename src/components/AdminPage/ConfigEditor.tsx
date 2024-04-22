import { api } from "@/api";
import { memoForward } from "@/component";
import { Fieldset } from "@/components/Fieldset";
import { Form } from "@/components/Form";
import { useLoading } from "@/components/LoadingContext";
import { NumberField } from "@/components/NumberField";
import { useStackNavigator } from "@/components/StackNavigator";
import { TextField } from "@/components/TextField";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useSubTrees, useTreeRoot, type Tree } from "@/tree-state";
import {
  DefaultChatConfig,
  type ChatConfig,
  type WelcomePageConfig,
} from "@shared/types";
import { style } from "css-in-bun" with { type: "macro" };
import type { Chat } from "grammy/types";
import { memo, type ElementRef, type ForwardedRef } from "react";
import type { KeyedMutator } from "swr";
import { showError } from "../../show-error";
import { LoadingPage } from "../LoadingPage";
import { WindowFrame } from "../WindowFrame";

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

export const ConfigEditor = memoForward(function ConfigEditor(
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
        <WelcomePageEditor tree={subt.welcome_page} />
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
      </Form>
    </WindowFrame>
  );
});

const WelcomePageEditor = memo(function WelcomePageEditor({
  tree,
}: {
  tree: Tree<WelcomePageConfig>;
}) {
  const subt = useSubTrees(tree);
  return (
    <Fieldset legend="编辑欢迎界面">
      <TextField label="标题" tree={subt.title} />
      <TextField
        label="内容"
        tree={subt.content}
        description="支持Markdown，可以使用占位符{chat_title}"
      />
    </Fieldset>
  );
});
