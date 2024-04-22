import { api } from "@/api";
import { Field } from "@/components/Field";
import { Fieldset } from "@/components/Fieldset";
import { RelativeTime } from "@/components/RelativeTime";
import {
  useMainButtonClicked,
  useMainButtonLoadingIndicator,
  useStackNavigator,
} from "@/components/StackNavigator";
import { WindowFrame } from "@/components/WindowFrame";
import { errorReport } from "@/errorReport";
import type { FieldType, FormType, PageType } from "@shared/types";
import { style } from "css-in-bun" with { type: "macro" };
import type { Chat, PhotoSize, User } from "grammy/types";
import { memo } from "react";
import { mutate } from "swr";

export function SessionPage({
  nonce,
  chat,
  user,
  user_detail,
  answer,
  form,
  created_at,
  updated_at,
}: {
  nonce: string;
  chat: Chat.SupergroupGetChat;
  user: User & { photos: PhotoSize[] };
  user_detail: Chat.PrivateGetChat | null;
  answer: Record<string, string | boolean>;
  form: FormType;
  created_at: string;
  updated_at: string;
}) {
  const fullname = `${user.first_name}${user.last_name ? " " + user.last_name : ""}`;
  const accept = api.admin.chat.accept.useSWRMutation();
  const reject = api.admin.chat.reject.useSWRMutation();
  const navigator = useStackNavigator();
  useMainButtonLoadingIndicator(accept.isMutating || reject.isMutating);
  useMainButtonClicked(() => {
    Telegram.WebApp.showPopup(
      {
        message: "请选择处理结果",
        buttons: [
          {
            type: "default",
            id: "accept",
            text: "通过",
          },
          {
            type: "destructive",
            id: "reject",
            text: "拒绝",
          },
        ],
      },
      async (id) => {
        try {
          switch (id) {
            case "accept":
              await accept.trigger({ chat_id: chat.id, nonce });
              break;
            case "reject":
              await reject.trigger({ chat_id: chat.id, nonce });
              break;
            default:
              return;
          }
          mutate(api.admin.list_chat.getKey());
          navigator.pop();
        } catch (e) {
          await errorReport(e);
        }
      }
    );
  });
  return (
    <WindowFrame title={fullname} className={style({ gap: 8 })}>
      <UserInfo
        user={user}
        user_detail={user_detail}
        created_at={created_at}
        updated_at={updated_at}
      />
      <FormRenderer answer={answer} form={form} />
    </WindowFrame>
  );
}

const UserInfo = memo(function UserInfo({
  user,
  user_detail,
  created_at,
  updated_at,
}: {
  user: User & { photos: PhotoSize[] };
  user_detail: Chat.PrivateGetChat | null;
  created_at: string;
  updated_at: string;
}) {
  const avatar =
    user_detail?.photo?.big_file_id ??
    user.photos[user.photos.length - 1]?.file_id;
  return (
    <Fieldset legend="用户信息">
      <div
        className={style({
          lineHeight: 1.2,
          marginBottom: -8,
          "::children": {
            marginBottom: 8,
          },
        })}
      >
        {avatar && (
          <img
            src={Bun.env.BOT_HOST + "/file/" + avatar}
            className={style({
              width: 48,
              height: 48,
              borderRadius: 100,
              float: "left",
              marginRight: 8,
            })}
          />
        )}
        <div className={style({ fontWeight: "bold" })}>
          {user.first_name}
          {user.last_name ? " " + user.last_name : ""}
        </div>
        {user_detail?.bio && (
          <div
            className={style({
              fontSize: 12,
              color: "var(--tg-theme-hint-color)",
            })}
          >
            {user_detail.bio}
          </div>
        )}
        <div className={style({ marginBottom: 0, clear: "both" })} />
        <Field label="加群时间" flat>
          <RelativeTime time={created_at} />
        </Field>
        <Field label="答题时间" flat>
          <RelativeTime time={updated_at} />
        </Field>
      </div>
    </Fieldset>
  );
});

const FormRenderer = memo(function FormRenderer({
  answer,
  form,
}: {
  answer: Record<string, string | boolean>;
  form: FormType;
}) {
  return (
    <>
      {form.pages.map((page) => (
        <PageRenderer key={page.id} answer={answer} page={page} />
      ))}
    </>
  );
});

const PageRenderer = memo(function PageRenderer({
  answer,
  page,
}: {
  answer: Record<string, string | boolean>;
  page: PageType;
}) {
  const filtered = page.fields.filter((x) => x.type === "text");
  return (
    <Fieldset legend={"页面：" + page.subtitle}>
      {filtered.map((field) => (
        <FieldRenderer key={field.id} answer={answer} field={field} />
      ))}
      {filtered.length === 0 && (
        <div
          className={style({
            fontSize: 12,
            textAlign: "center",
            padding: 4,
            height: "max-height",
            color: "var(--tg-theme-subtitle-text-color)",
            fontWeight: 200,
          })}
        >
          本页没有需要填写的内容
        </div>
      )}
    </Fieldset>
  );
});

const FieldRenderer = memo(function FieldRenderer({
  answer,
  field,
}: {
  answer: Record<string, string | boolean>;
  field: FieldType;
}) {
  const value = answer[field.id];
  if (field.type === "text") {
    return (
      <Field label={field.title} flat>
        {value}
      </Field>
    );
  }
  return null;
});
