import { AnimatedList } from "@/components/AnimatedList";
import { ChooseDialog } from "@/components/ChooseDialog";
import { Form } from "@/components/Form";
import { MotionFrament } from "@/components/MotionFrament";
import { NumberField } from "@/components/NumberField";
import { useStackNavigator } from "@/components/StackNavigator";
import { IconButton } from "@/components/SvgPathIcons";
import { TextField } from "@/components/TextField";
import { ToggleField } from "@/components/ToggleField";
import { WindowFrame } from "@/components/WindowFrame";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useInstance } from "@/hooks/useInstance";
import {
  useSubTree,
  useSubTrees,
  useTreeArrayUpdater,
  useTreeValue,
  type Tree,
} from "@/tree-state";
import {
  FieldTypeTypeMap,
  type FieldType,
  type LabelType,
  type PageType,
  type TextBlockType,
  type TextFieldType,
} from "@shared/types";
import { style } from "css-in-bun" with { type: "macro" };
import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import { memo } from "react";

export const PageEditor = memo(function PageEditor({
  tree,
}: {
  tree: Tree<PageType>;
}) {
  const { pop } = useStackNavigator();
  const subt = useSubTrees(tree);
  return (
    <WindowFrame title="编辑页面">
      <Form onSubmit={pop} className={style({ display: "grid", gap: 8 })}>
        <TextField
          label="页面标题"
          tree={subt.subtitle}
          placeholder="输入页面标题(可为空)"
          enterKeyAction="done"
          autoFocusIfEmpty
        />
        <motion.div
          variants={{
            enter: { y: 12, opacity: 0 },
            present: { y: 0, opacity: 1 },
          }}
          className={style({ display: "grid", gap: 4 })}
        >
          <div
            className={style({
              fontSize: 12,
              color: "var(--tg-theme-hint-color)",
            })}
          >
            元素列表
          </div>
          <FieldList tree={subt.fields} />
        </motion.div>
      </Form>
    </WindowFrame>
  );
});

const extractShallow = (field: FieldType) => ({
  id: field.id,
  type: field.type,
  title:
    field.type === "label" || field.type === "textblock"
      ? field.content
      : field.title,
});
type ShallowField = ReturnType<typeof extractShallow>;
const extractKey = (field: ShallowField) => field.id;
const keyEquals = (key: string, item: FieldType) => key === item.id;

const FieldCard = memo(function FieldCard({
  value: { id, type, title },
  onRemove,
}: {
  value: ShallowField;
  tree: Tree<FieldType>;
  onRemove(id: string): void;
}) {
  const handleDelete = useEventHandler(() => onRemove(id));
  return (
    <div
      className={style({
        display: "grid",
        gap: 4,
        padding: 4,
        gridTemplate:
          "'type delete' auto 'title delete' auto / minmax(0, 1fr) auto",
      })}
    >
      <div
        className={style({
          gridArea: "type",
          fontSize: 12,
          color: "var(--tg-theme-hint-color)",
        })}
      >
        {FieldTypeTypeMap[type]}
      </div>
      <div
        className={style({
          gridArea: "title",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
        })}
      >
        {title || "无标签"}
      </div>
      <IconButton.Trash
        destructive
        onClick={handleDelete}
        className={style({ gridArea: "delete" })}
      />
    </div>
  );
});

const FieldList = memo(function FieldList({
  tree,
}: {
  tree: Tree<FieldType[]>;
}) {
  const { insert } = useTreeArrayUpdater(tree);
  const navigator = useStackNavigator();
  const handleInsert = useEventHandler(() => {
    navigator.push(
      <ChooseDialog title="选择新字段的类型">
        <ChooseDialog.Item
          onClick={() => insert({ id: nanoid(), type: "label", content: "" })}
        >
          {FieldTypeTypeMap.label}
        </ChooseDialog.Item>
        <ChooseDialog.Item
          onClick={() =>
            insert({
              id: nanoid(),
              type: "textblock",
              content: "",
              confirm: false,
              confirmText: "",
            })
          }
        >
          {FieldTypeTypeMap.textblock}
        </ChooseDialog.Item>
        <ChooseDialog.Item
          onClick={() =>
            insert({
              id: nanoid(),
              type: "text",
              title: "",
              description: "",
              multiline: false,
              required: true,
              placeholder: "",
              range: {
                minLength: 1,
                maxLength: 100,
              },
            })
          }
        >
          {FieldTypeTypeMap.text}
        </ChooseDialog.Item>
      </ChooseDialog>
    );
  });
  const custom = useInstance(() => ({
    onRemove: (id: string) => {
      tree.update((old) => old.filter((p) => p.id !== id));
    },
  }));
  const onClickItem = useEventHandler(
    ({
      tree,
      value: { type },
    }: {
      value: ShallowField;
      tree: Tree<FieldType>;
    }) => {
      switch (type) {
        case "label":
          navigator.push(<LabelEditor tree={tree as any} />);
          break;
        case "textblock":
          navigator.push(<TextBlockEditor tree={tree as any} />);
          break;
        case "text":
          navigator.push(<TextFieldEditor tree={tree as any} />);
          break;
      }
    }
  );
  return (
    <AnimatedList
      tree={tree}
      extractShallow={extractShallow}
      extractKey={extractKey}
      keyEquals={keyEquals}
      custom={custom}
      ItemComponent={FieldCard}
      onClickItem={onClickItem}
    >
      <motion.button
        type="button"
        layout="position"
        layoutScroll
        onClick={handleInsert}
        className={style({ fontSize: 12, justifySelf: "center" })}
      >
        添加字段
      </motion.button>
    </AnimatedList>
  );
});

function LabelEditor({ tree }: { tree: Tree<LabelType> }) {
  const content = useSubTree(tree, "content");
  const navigator = useStackNavigator();
  return (
    <WindowFrame title="标签编辑器">
      <TextField
        tree={content}
        label="内容"
        enterKeyAction="done"
        onDone={navigator.pop}
        required
        autoFocusIfEmpty
      />
    </WindowFrame>
  );
}

function TextBlockEditor({ tree }: { tree: Tree<TextBlockType> }) {
  const subt = useSubTrees(tree);
  const requireConfirm = useTreeValue(subt.confirm);
  return (
    <WindowFrame title="文本块编辑器" className={style({ gap: 8 })}>
      <TextField
        tree={subt.content}
        label="内容"
        initialLines={3}
        required
        autoFocusIfEmpty
      />
      <ToggleField tree={subt.confirm} label="用户必须确认内容后才能继续" />
      <TextField
        tree={subt.confirmText}
        label="确认文本"
        placeholder="我已认真阅读并同意上面的内容"
        enterKeyAction="done"
        disabled={!requireConfirm}
      />
    </WindowFrame>
  );
}

function RangeEditor({
  tree,
}: {
  tree: Tree<{ minLength: number; maxLength: number }>;
}) {
  const subt = useSubTrees(tree);
  return (
    <>
      <NumberField
        tree={subt.minLength}
        label="最小长度（1~1000）"
        min={1}
        max={1000}
      />
      <NumberField
        tree={subt.maxLength}
        label="最大长度（1~1000）"
        min={1}
        max={1000}
      />
    </>
  );
}

function TextFieldEditor({ tree }: { tree: Tree<TextFieldType> }) {
  const subt = useSubTrees(tree);
  return (
    <WindowFrame title="文本字段编辑器" className={style({ gap: 8 })}>
      <MotionFrament>
        <TextField
          tree={subt.title}
          label="标题"
          placeholder="字段标题"
          required
          autoFocusIfEmpty
          enterKeyAction="next"
        />
        <TextField
          tree={subt.description}
          label="描述"
          placeholder="字段描述"
          enterKeyAction="next"
        />
        <TextField
          tree={subt.placeholder}
          label="占位符"
          placeholder="字段占位符"
          enterKeyAction="next"
        />
        <ToggleField tree={subt.required} label="是否必填" />
        <ToggleField tree={subt.multiline} label="允许输入多行文本" />
        <RangeEditor tree={subt.range} />
      </MotionFrament>
    </WindowFrame>
  );
}
