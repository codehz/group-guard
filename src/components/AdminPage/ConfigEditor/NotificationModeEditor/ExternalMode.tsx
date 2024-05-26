import { api } from "@/api";
import { ChatProfileIcon } from "@/components/ChatProfileIcon";
import { Field } from "@/components/Field";
import { useDataFetched } from "@/hooks/useDataFetched";
import { useTree, type Tree } from "@/tree-state";
import classNames from "classnames";
import { style } from "css-in-bun" with { type: "macro" };
import type { Chat } from "grammy/types";
import { memo } from "react";

export const ExternalMode = memo(function ExternalMode({
  chat: currentChat,
  tree,
}: {
  chat: number;
  tree: Tree<number>;
}) {
  const [target, setTarget] = useTree(tree);
  const data = useDataFetched(api.admin.list_chat.useSWR(undefined, {})) ?? [];
  return (
    <Field label="请选择转发的群组" description="你不能选择当前的群组" flat>
      {data.map(({ chat }) => (
        <ChatCard
          key={chat.id}
          chat={chat}
          disabled={chat.id === currentChat}
          selected={chat.id === target}
          onSelect={() => setTarget(chat.id)}
        />
      ))}
    </Field>
  );
});

const ChatCard = memo(function ChatCatd({
  chat,
  disabled,
  selected,
  onSelect,
}: {
  chat: Chat.SupergroupGetChat;
  disabled: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={classNames(
        style({
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          borderRadius: 4,
          padding: "4px 6px",
          alignItems: "center",
        }),
        selected
          ? style({
              backgroundColor: "var(--tg-theme-button-color)",
              color: "var(--tg-theme-button-text-color)",
            })
          : style({
              color: "var(--tg-theme-button-color)",
              boxShadow: "inset 0 0 0 1px var(--tg-theme-accent-text-color)",
            }),
        disabled && style({ opacity: 0.5, pointerEvents: "none" })
      )}
      onClick={onSelect}
    >
      <ChatProfileIcon info={chat as any} size={32} />
      <div className={style({ fontWeight: 200 })}>{chat.title}</div>
    </div>
  );
});
