import { api } from "@/api";
import { AnimatedList } from "@/components/AnimatedList";
import { Form } from "@/components/Form";
import {
  useBackButtonClicked,
  useStackNavigator,
} from "@/components/StackNavigator";
import { IconButton } from "@/components/SvgPathIcons";
import { TextField } from "@/components/TextField";
import { useToastMessage } from "@/components/ToastManager";
import { WindowFrame } from "@/components/WindowFrame";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useInstance } from "@/hooks/useInstance";
import {
  useSubTrees,
  useTreeArrayUpdater,
  useTreeRoot,
  useTreeSnapshot,
  type Tree,
} from "@/tree-state";
import type { FormType, PageType } from "@shared/types";
import { style } from "css-in-bun" with { type: "macro" };
import { deepEqual } from "fast-equals";
import { motion } from "framer-motion";
import type { Chat } from "grammy/types";
import { nanoid } from "nanoid";
import { memo } from "react";
import { useSWRConfig } from "swr";
import { PageEditor } from "./PageEditor";
import { Fieldset } from "@/components/Fieldset";

const extractShallow = ({ id, subtitle, fields }: PageType) => ({
  id,
  subtitle,
  field_count: fields.length,
});
type ShallowPage = ReturnType<typeof extractShallow>;
const extractKey = ({ id }: ShallowPage) => id;
const keyEquals = (key: string, item: PageType) => key === item.id;

const PageCard = memo(function PageCard({
  value: { id, subtitle, field_count },
  onRemove,
}: {
  value: ShallowPage;
  tree: Tree<PageType>;
  onRemove: (id: string) => void;
}) {
  const handleDelete = useEventHandler(() => onRemove(id));
  return (
    <div
      className={style({
        display: "grid",
        gap: 4,
        padding: 4,
        gridTemplate:
          "'title delete' auto 'info delete' auto / minmax(0, 1fr) auto",
      })}
    >
      <div
        className={style({
          gridArea: "title",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        })}
      >
        {subtitle || "未命名"}
      </div>
      <div
        className={style({
          gridArea: "info",
          fontSize: 12,
          color: "var(--tg-theme-hint-color)",
        })}
      >
        字段数量：
        <span className={style({ fontWeight: "bold" })}>{field_count}</span>
      </div>
      <IconButton.Trash
        destructive
        onClick={handleDelete}
        className={style({ gridArea: "delete" })}
      />
    </div>
  );
});

const PageList = memo(function PageList({ tree }: { tree: Tree<PageType[]> }) {
  const { insert } = useTreeArrayUpdater(tree);
  const handleInsert = useEventHandler(() => {
    insert({
      id: nanoid(),
      subtitle: "",
      fields: [],
    });
  });
  const custom = useInstance(() => ({
    onRemove: (id: string) => {
      tree.update((old) => old.filter((p) => p.id !== id));
    },
  }));
  const navigator = useStackNavigator();
  const onClickItem = useEventHandler(({ tree }: { tree: Tree<PageType> }) => {
    navigator.push(<PageEditor tree={tree} />);
  });
  return (
    <AnimatedList
      tree={tree}
      extractShallow={extractShallow}
      extractKey={extractKey}
      keyEquals={keyEquals}
      custom={custom}
      ItemComponent={PageCard}
      onClickItem={onClickItem}
    >
      <motion.button
        type="button"
        layout="position"
        layoutScroll
        onClick={handleInsert}
        className={style({ fontSize: 12, justifySelf: "center" })}
      >
        新增页面
      </motion.button>
    </AnimatedList>
  );
});

export const FormEditor = memo(
  ({
    chat,
    form = {
      tag: "",
      description: "",
      pages: [],
    },
    id,
  }: {
    chat: Chat.SupergroupGetChat;
    form?: FormType;
    id?: string;
  }) => {
    const navigator = useStackNavigator();
    const { trigger } = api.admin.chat.form.update.useSWRMutation();
    const { mutate } = useSWRConfig();
    const root = useTreeRoot<FormType>(form);
    const subt = useSubTrees(root);
    const toast = useToastMessage();
    const save = useEventHandler(async () => {
      await trigger({
        chat_id: chat.id,
        form_id: id ?? nanoid(),
        content: root.value,
      });
      navigator.pop(true);
      toast("已保存");
      await mutate(api.admin.chat.list_form.getKey({ chat_id: chat.id }));
    });
    const locked = useTreeSnapshot(root, (edited) => !deepEqual(edited, form));
    useBackButtonClicked(
      useEventHandler(() => {
        if (deepEqual(root.value, form)) return false;
        toast("正在保存");
        save().catch((e) => {
          Telegram.WebApp.showPopup(
            {
              title: "是否要放弃保存，直接返回？",
              message: e + "",
              buttons: [
                { type: "destructive", text: "放弃保存", id: "exit" },
                { type: "default", text: "继续编辑" },
              ],
            },
            (id) => {
              if (id === "exit") navigator.pop(true);
            }
          );
        });
        return true;
      }, true)
    );
    return (
      <WindowFrame
        title={id ? "正在编辑验证模版" : "正在新建验证模版"}
        expandOnMount
        className={style({ gap: 8 })}
        locked={locked}
      >
        <Form
          onSubmit={save}
          transition={{ staggerChildren: 0.1 }}
          initial="enter"
          animate="present"
          className={style({ display: "grid", gap: 8 })}
        >
          <Fieldset legend="元数据">
            <TextField
              label="标记"
              tree={subt.tag}
              placeholder="输入模版标记，不会对用户展示"
              autoFocusIfEmpty
              enterKeyAction="next"
            />
            <TextField
              label="描述文本"
              tree={subt.description}
              placeholder="输入模版描述，不会对用户展示"
              enterKeyAction="done"
            />
          </Fieldset>
          <motion.div
            data-swipe
            variants={{
              enter: { y: 12, opacity: 0 },
              present: { y: 0, opacity: 1 },
            }}
            className={style({ display: "grid", gap: 4 })}
          >
            <div
              data-swipe
              className={style({
                fontSize: 12,
                color: "var(--tg-theme-hint-color)",
              })}
            >
              页面列表
            </div>
            <PageList tree={subt.pages} />
          </motion.div>
        </Form>
      </WindowFrame>
    );
  }
);
