import { api } from "@/api";
import { FormPage } from "@/components/ChallengePage/FormPage";
import { ChatProfileIcon } from "@/components/ChatProfileIcon";
import { Markdown } from "@/components/Markdown";
import {
  useMainButtonClicked,
  useMainButtonLoadingIndicator,
  useStackNavigator,
} from "@/components/StackNavigator";
import { WindowFrame } from "@/components/WindowFrame";
import { useInstance } from "@/hooks/useInstance";
import { useTreeRoot } from "@/tree-state";
import {
  DefaultChatConfig,
  type ChatConfig,
  type FormType,
} from "@shared/types";
import { style } from "css-in-bun" with { type: "macro" };
import type { Chat } from "grammy/types";
import { memo, useEffect } from "react";

export const WelcomePage = memo(function WelcomePage({
  chat,
  answer,
  config = DefaultChatConfig,
  form,
  nonce,
}: {
  chat: Chat.SupergroupGetChat;
  answer: Record<string, string | boolean>;
  config?: ChatConfig;
  form?: FormType;
  nonce?: string;
}) {
  const navigator = useStackNavigator();
  useEffect(() => {
    Telegram.WebApp.expand();
  }, []);
  const initialState = useInstance(() => {
    const shape = form
      ? Object.fromEntries(
          form.pages
            .flatMap((page) => page.fields)
            .flatMap((field): { id: string; value: any }[] => {
              if (field.type === "textblock") {
                if (field.confirm) {
                  return [{ id: field.id, value: false }];
                }
              } else if (field.type === "text") {
                return [{ id: field.id, value: "" }];
              }
              return [];
            })
            .map(({ id, value }) => [id, value] as [string, any])
        )
      : {};
    return { ...shape, ...answer };
  });
  const root = useTreeRoot(initialState);
  const submit = api.challenge.submit.useSWRMutation();
  useMainButtonLoadingIndicator(submit.isMutating);
  useMainButtonClicked(() => {
    if (!nonce) {
      Telegram.WebApp.showAlert("找不到验证会话", () => {
        Telegram.WebApp.close();
      });
      return;
    }
    if (!form) {
      submit.trigger({ nonce, answer: {} }).then(() => {
        Telegram.WebApp.showAlert(
          "提交成功，待管理员验证通过后即可加群",
          () => {
            Telegram.WebApp.close();
          }
        );
      });
      return;
    }
    const [page, ...next] = form.pages;
    navigator.push(
      <FormPage nonce={nonce} tree={root} page={page} next={next} />,
      { mainButton: { text: next.length ? "继续" : "提交" } }
    );
  });
  return (
    <WindowFrame title="欢迎界面" locked className={style({ gap: 16 })}>
      <div
        data-swipe
        className={style({
          display: "grid",
          justifyItems: "center",
          paddingTop: 8,
          paddingBottom: 16,
          gap: 16,
          gridAutoRows: "max-content",
        })}
      >
        <ChatProfileIcon info={chat as any} size={128} />
        <div
          data-swipe
          className={style({
            fontSize: 20,
            fontWeight: "bold",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          })}
        >
          {config.welcome_page.title}
        </div>
        <Markdown
          className={style({
            color: "var(--tg-theme-hint-color)",
            whiteSpace: "pre-wrap",
            lineHeight: "1.5",
            textAlign: "center",
          })}
          context={{ chat_title: chat.title }}
        >
          {config.welcome_page.content}
        </Markdown>
      </div>
    </WindowFrame>
  );
});
