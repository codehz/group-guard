import { api } from "@/api";
import { ChatProfileIcon } from "@/components/ChatProfileIcon";
import { Field } from "@/components/Field";
import { useLoading } from "@/components/LoadingContext";
import { useDataFetched } from "@/hooks/useDataFetched";
import { style } from "css-in-bun" with { type: "macro" };
import { motion } from "framer-motion";
import type { Chat } from "grammy/types";
import { memo } from "react";

export const PrivateMode = memo(function PrivateMode({
  chat,
}: {
  chat: number;
}) {
  const data =
    useDataFetched(
      api.admin.chat.list_admin.useSWR({
        chat_id: chat,
      })
    ) ?? [];
  return (
    <Field label="管理员列表" flat>
      <div className={style({ display: "grid", gap: 8 })}>
        {data.map((item) => (
          <AdminCard key={item.user} chat={chat} {...item} />
        ))}
      </div>
    </Field>
  );
});

const AdminCard = memo(function AdminCard({
  chat,
  user,
  info,
  receive_notification,
}: {
  chat: number;
  user: number;
  info: Chat.PrivateGetChat;
  receive_notification: number;
}) {
  const fullname = `${info.first_name}${info.last_name ? " " + info.last_name : ""}`;
  const {
    trigger,
    data: checked = !!receive_notification,
    isMutating,
  } = api.admin.chat.toggle_notification.useSWRMutation();
  useLoading(isMutating);
  return (
    <div
      className={style({
        display: "grid",
        gridTemplate: "'icon name' auto 'icon toggle' auto / auto 1fr",
        gap: "0 8px",
        alignItems: "center",
        fontSize: 14,
        fontWeight: 200,
      })}
    >
      <ChatProfileIcon
        key="profile"
        info={{
          title: info.first_name,
          accent_color_id: info.accent_color_id,
          photo: info.photo,
        }}
        size={36}
        className={style({ gridArea: "icon" })}
      />
      <div className={style({ gridArea: "name", whiteSpace: "nowrap" })}>
        {fullname}
      </div>
      <label
        className={style({
          gridArea: "toggle",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 4,
          cursor: "pointer",
        })}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            trigger({
              chat_id: chat,
              value: !checked,
              user,
            });
          }}
          className={style({
            fontSize: 12,
            verticalAlign: "sub",
            WebkitAppearance: "none",
            MozAppearance: "none",
            appearance: "none",
            width: "3.5em",
            height: "1.5em",
            backgroundColor: "var(--tg-theme-secondary-bg-color)",
            borderRadius: 100,
            position: "relative",
            outline: "none",
            transition: "all .2s ease-in-out",
            boxShadow: "inset 0 0 .1em rgba(0,0,0,.3)",
            cursor: "pointer",
            "::after": {
              position: "absolute",
              content: "''",
              width: "1.5em",
              height: "1.5em",
              borderRadius: 100,
              backgroundColor: "var(--tg-theme-button-text-color)",
              boxShadow: "0 0 .25em rgba(0,0,0,.3)",
              transform: "scale(0.7)",
              transition: "all .2s ease-in-out",
              left: 0,
            },
            ":checked": {
              backgroundColor: "var(--tg-theme-button-color)",
              boxShadow: "inset 0 0 0 rgba(0,0,0,.3)",
              "::after": {
                left: "calc(100% - 1.5em)",
              },
            },
          })}
        />
        接收通知
      </label>
    </div>
  );
});
