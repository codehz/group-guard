import { api } from "@/api";
import { FormConfig } from "@/components/AdminPage/FormConfig";
import { SessionPage } from "@/components/AdminPage/SessionPage";
import {
  useMainButtonClicked,
  useMainButtonLoadingIndicator,
  usePageContext,
  useStackNavigator,
} from "@/components/StackNavigator";
import { errorReport } from "@/errorReport";
import { useTruthyEffect } from "@/hooks/useTruthyEffect";
import type { FormType } from "@shared/types";
import classNames from "classnames";
import { create, style } from "css-in-bun" with { type: "macro" };
import type { Chat, PhotoSize, User } from "grammy/types";
import { memo } from "react";
import { useEventHandler } from "../../hooks/useEventHandler";
import { ChatProfileIcon } from "../ChatProfileIcon";
import { IconButton } from "../SvgPathIcons";

export function ChatList({}: {}) {
  const { data, mutate, isLoading } = api.admin.list_chat.useSWR(undefined, {
    suspense: true,
  });
  const update = usePageContext();
  useTruthyEffect(!!data.length, () => {
    update({ mainButton: { text: "刷新" } });
    return () => update({ mainButton: undefined });
  });
  useMainButtonLoadingIndicator(isLoading);
  useMainButtonClicked(() => void mutate());
  if (data.length === 0) {
    return <div className={style({ color: "red" })}>没有被管理的群组</div>;
  }
  return (
    <div data-swipe className={styles.Container}>
      <div data-swipe className={styles.Small}>
        当前管理的群组列表
      </div>
      <div data-swipe className={styles.ChatList}>
        {data.map(({ chat, sessions }) => (
          <ChatCard key={chat.id} chat={chat} sessions={sessions} />
        ))}
      </div>
    </div>
  );
}

const ChatCard = memo(function ChatCard({
  chat,
  sessions,
}: {
  chat: Chat.SupergroupGetChat;
  sessions: {
    user: User & { photos: PhotoSize[] };
    user_detail: Chat.PrivateGetChat | null;
    nonce: string;
    form: FormType;
    answer: Record<string, string | boolean>;
    created_at: string;
    updated_at: string;
  }[];
}) {
  const navigator = useStackNavigator();
  const handleClick = useEventHandler(() => {
    navigator.push(<FormConfig chat={chat} />, {
      mainButton: { text: "新建模板" },
    });
  });
  return (
    <div className={styles.CardContainer}>
      <div className={styles.Card}>
        <ChatProfileIcon
          info={chat as any}
          size={40}
          className={styles.CardIcon}
        />
        <div className={styles.CardTitle}>{chat.title}</div>
        <div className={classNames(styles.Small, style({ gridArea: "count" }))}>
          会话数：{sessions.length}
        </div>
        <IconButton.Config onClick={handleClick} className={styles.CardArrow} />
      </div>
      {sessions.map((session) => (
        <SessionCard key={session.user.id} chat={chat} {...session} />
      ))}
    </div>
  );
});

const SessionCard = memo(function SessionCard({
  chat,
  nonce,
  user,
  user_detail,
  answer,
  form,
  created_at,
  updated_at,
}: {
  chat: Chat.SupergroupGetChat;
  nonce: string;
  user: User & { photos: PhotoSize[] };
  user_detail: Chat.PrivateGetChat | null;
  answer: Record<string, string | boolean> | null;
  form: FormType;
  created_at: string;
  updated_at: string;
}) {
  const avatar = user.photos[user.photos.length - 1]?.file_id;
  const accept = api.admin.chat.accept.useSWRMutation();
  const reject = api.admin.chat.reject.useSWRMutation();
  const handleAccept = useEventHandler(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await accept.trigger({ chat_id: chat.id, nonce }).catch(errorReport);
  });
  const handleReject = useEventHandler(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await reject.trigger({ chat_id: chat.id, nonce }).catch(errorReport);
  });
  const navigator = useStackNavigator();
  const handleClick = useEventHandler(() => {
    if (!answer) return;
    navigator.push(
      <SessionPage
        chat={chat}
        nonce={nonce}
        user={user}
        user_detail={user_detail}
        form={form}
        answer={answer}
        created_at={created_at}
        updated_at={updated_at}
      />,
      { mainButton: { text: "处理" } }
    );
  });
  return (
    <div className={styles.SessionCard} onClick={handleClick}>
      {avatar && (
        <img
          src={Bun.env.BOT_HOST + "/file/" + avatar}
          className={styles.SessionCardAvatar}
        />
      )}
      <div className={styles.SessionCardName}>
        {user.first_name}
        {user.last_name && " " + user.last_name}
      </div>
      <div
        className={classNames(
          answer && styles.SessionCardStatusAnswered,
          styles.SessionCardStatus
        )}
      >
        {answer ? "已回答" : "未回答"}
      </div>
      <button className={styles.SessionCardAccept} onClick={handleAccept}>
        通过
      </button>
      <button className={styles.SessionCardReject} onClick={handleReject}>
        拒绝
      </button>
    </div>
  );
});

const styles = create({
  Container: { display: "grid", gap: 8 },
  ChatList: { display: "grid", gap: 8 },
  Small: { fontSize: 12, color: "var(--tg-theme-hint-color)" },
  CardContainer: {
    padding: 8,
    position: "relative",
    display: "grid",
    gap: 8,
    "::after": {
      content: "''",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      boxShadow: "inset 0 0 0 1px var(--tg-theme-accent-text-color)",
      opacity: 0.2,
      borderRadius: 4,
    },
  },
  Card: {
    display: "grid",
    contain: "paint",
    gap: "4px 8px",
    borderRadius: 4,
    gridTemplate:
      "'icon title arrow' auto 'icon count arrow' auto / auto minmax(0, 1fr) auto",
  },
  CardIcon: {
    gridArea: "icon",
  },
  CardTitle: {
    gridArea: "title",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  CardArrow: {
    gridArea: "arrow",
    placeSelf: "center",
  },
  SessionCard: {
    display: "grid",
    gridTemplate:
      "'avatar name accept reject' 1fr 'avatar status accept reject' 1fr / 32px minmax(0, 1fr) auto auto",
    gap: "4px 8px",
    padding: "4px 8px",
    alignItems: "center",
    position: "relative",
    "::after": {
      content: "''",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      backgroundColor: "var(--tg-theme-accent-text-color)",
      opacity: 0.1,
      borderRadius: 4,
    },
  },
  SessionCardAvatar: {
    gridArea: "avatar",
    width: 32,
    height: 32,
    borderRadius: 100,
    alignSelf: "center",
  },
  SessionCardName: {
    gridArea: "name",
    fontSize: 14,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  SessionCardStatus: {
    gridArea: "status",
    fontSize: 12,
    color: "var(--color, var(--tg-theme-hint-color))",
  },
  SessionCardStatusAnswered: {
    "--color": "var(--tg-theme-accent-text-color)",
  },
  SessionCardAccept: {
    gridArea: "accept",
    fontSize: 14,
  },
  SessionCardReject: {
    gridArea: "reject",
    backgroundColor: "var(--tg-theme-destructive-text-color)",
    fontSize: 14,
  },
});
