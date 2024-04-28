import { api } from "@/api";
import { memoForward } from "@/component";
import { Loading } from "@/components/Loading";
import { RelativeTime } from "@/components/RelativeTime";
import {
  useMainButtonClicked,
  useStackNavigator,
} from "@/components/StackNavigator";
import { IconButton } from "@/components/SvgPathIcons";
import { WindowFrame } from "@/components/WindowFrame";
import { useEventHandler } from "@/hooks/useEventHandler";
import type { FormType } from "@shared/types";
import classNames from "classnames";
import { create, style } from "css-in-bun" with { type: "macro" };
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { Chat } from "grammy/types";
import { nanoid } from "nanoid";
import { Suspense, memo, type ElementRef, type ForwardedRef } from "react";
import { useSWRConfig } from "swr";
import { ConfigEditorLoader } from "./ConfigEditor";
import { FormEditor } from "./FormEditor";

export function FormConfig({
  chat,
  language,
}: {
  chat: Chat.SupergroupGetChat;
  language?: string;
}) {
  const navigator = useStackNavigator();
  const handleNewForm = useEventHandler(() => {
    navigator.push(<FormEditor chat={chat} />, {
      mainButton: { text: "保存模版" },
    });
  });
  const openConfigEditor = useEventHandler(() => {
    navigator.push(<ConfigEditorLoader chat={chat} />, {
      mainButton: { text: "加载中…", is_loading: true },
    });
  });
  useMainButtonClicked(handleNewForm);
  return (
    <WindowFrame
      title={chat.title + "的验证模版配置"}
      className={style({ gap: 8 })}
      expandOnMount
    >
      <motion.button variants={button} type="button" onClick={openConfigEditor}>
        编辑全局设置
      </motion.button>
      <Suspense fallback={<Loading />}>
        <FormList chat={chat} />
      </Suspense>
    </WindowFrame>
  );
}

const button: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 1 },
  exit: { opacity: 0 },
};

const FormList = memo(function FormList({
  chat,
}: {
  chat: Chat.SupergroupGetChat;
}) {
  const { data } = api.admin.chat.list_form.useSWR(
    { chat_id: chat.id },
    { suspense: true }
  );
  const { present, deleted } = Object.groupBy(data, (item) =>
    item.deleted ? "deleted" : "present"
  );
  if (data.length === 0) {
    return (
      <div className={classNames(styles.Small, styles.EmptyNote)}>
        当前没有任何模版，请点击下面的按钮新建模板
      </div>
    );
  }
  return (
    <motion.div
      className={styles.FormList}
      initial="enter"
      animate="present"
      exit="exit"
      transition={{ staggerChildren: 0.1 }}
    >
      <AnimatePresence mode="popLayout">
        {present?.map((item) => (
          <FormCard key={item.id} {...item} chat={chat} />
        ))}
        {deleted && (
          <motion.div
            layout="position"
            variants={mark}
            className={styles.Small}
          >
            已删除
          </motion.div>
        )}
        {deleted?.map((item) => (
          <FormCard key={item.id} {...item} chat={chat} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

const mark: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 1 },
  exit: { opacity: 0 },
};

const FormCard = memoForward(function FormCard(
  {
    id,
    enabled,
    content,
    deleted,
    created_at,
    updated_at,
    chat,
  }: {
    id: string;
    enabled: boolean;
    content: FormType;
    deleted: boolean;
    created_at: string;
    updated_at: string;
    chat: Chat.SupergroupGetChat;
  },
  ref: ForwardedRef<ElementRef<"div">>
) {
  const navigator = useStackNavigator();
  const { mutate } = useSWRConfig();
  const enableForm = api.admin.chat.form.enable.useSWRMutation();
  const updateForm = api.admin.chat.form.update.useSWRMutation();
  const recoverForm = api.admin.chat.form.recover.useSWRMutation();
  const deleteForm = api.admin.chat.form.delete.useSWRMutation();
  const deleteFormForever = api.admin.chat.form.delete_forever.useSWRMutation();
  const reloadList = useEventHandler(() =>
    mutate(api.admin.chat.list_form.getKey({ chat_id: chat.id }))
  );
  const handleOpen = useEventHandler(async () => {
    navigator.push(<FormEditor chat={chat} id={id} form={content} />, {
      mainButton: { text: "保存模版" },
    });
  });
  const handleEnable = useEventHandler(async () => {
    if (deleted) return;
    await enableForm.trigger({
      chat_id: chat.id,
      form_id: id,
    });
    await reloadList();
  });
  const handleClone = useEventHandler(async () => {
    await updateForm.trigger({
      chat_id: chat.id,
      form_id: nanoid(),
      content,
    });
    await reloadList();
  });
  const handleRecover = useEventHandler(async () => {
    await recoverForm.trigger({
      chat_id: chat.id,
      form_id: id,
    });
    await reloadList();
  });
  const handleRemove = useEventHandler(async () => {
    if (deleted) {
      Telegram.WebApp.showConfirm("确定永久删除此模版吗？", async (ok) => {
        if (!ok) return;
        await deleteFormForever.trigger({
          chat_id: chat.id,
          form_id: id,
        });
        await reloadList();
      });
      return;
    } else
      await deleteForm.trigger({
        chat_id: chat.id,
        form_id: id,
      });
    await reloadList();
  });
  return (
    <motion.div
      layout
      variants={card}
      ref={ref}
      className={classNames(
        styles.FormCard,
        enabled ? styles.EnabledFormCard : styles.NormalFormCard,
        deleted && styles.DeletedCard
      )}
      onClick={enabled ? handleOpen : handleEnable}
    >
      <div className={style({ display: "flex" })}>
        <div className={style({ display: "grid", gap: 4, flex: 1 })}>
          <div className={styles.NoOverflow}>{content.tag ?? "未命名"}</div>
          <div className={classNames(styles.Small, styles.NoOverflow)}>
            {content.description}
          </div>
        </div>
        <div className={styles.ButtonBar}>
          {!deleted && <IconButton.Edit onClick={handleOpen} />}
          {deleted ? (
            <IconButton.Recover onClick={handleRecover} />
          ) : (
            <IconButton.Copy onClick={handleClone} />
          )}
          <IconButton.Trash
            destructive
            filled={deleted}
            onClick={handleRemove}
          />
        </div>
      </div>
      <div className={classNames(styles.Small, styles.Date)}>
        <div>
          创建于
          <RelativeTime time={created_at} mode="distance" />前
        </div>
        <div>
          更新于
          <RelativeTime time={updated_at} mode="distance" />前
        </div>
      </div>
    </motion.div>
  );
});

const card: Variants = {
  enter: { opacity: 0, y: 12 },
  present: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

const styles = create({
  FormList: {
    display: "grid",
    gap: 8,
  },
  DeletedCard: {
    filter: "opacity(0.5)",
  },
  FormCard: {
    display: "grid",
    position: "relative",
    contain: "paint",
    padding: 8,
    gap: 4,
    borderRadius: 4,
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
  EnabledFormCard: {
    backgroundColor: "var(--tg-theme-button-color)",
    color: "var(--tg-theme-button-text-color)",
    "--subtle-color": "var(--tg-theme-button-text-color)",
  },
  NormalFormCard: { backgroundColor: "var(--tg-theme-bg-color)" },
  NoOverflow: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  Small: {
    fontSize: 12,
    color: "var(--subtle-color, var(--tg-theme-hint-color))",
  },
  EmptyNote: {
    flex: 1,
    display: "grid",
    placeItems: "center",
  },
  ButtonBar: { display: "grid", gridAutoFlow: "column", gap: 4 },
  Date: {
    display: "grid",
    gridAutoFlow: "column",
    gap: 8,
    justifyContent: "flex-end",
  },
});
