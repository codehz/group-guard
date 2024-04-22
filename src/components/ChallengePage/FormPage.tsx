import { api } from "@/api";
import { memoMotion } from "@/component";
import { Form } from "@/components/Form";
import { Markdown } from "@/components/Markdown";
import { useStackNavigator } from "@/components/StackNavigator";
import { TextField } from "@/components/TextField";
import { ToggleField } from "@/components/ToggleField";
import { WindowFrame } from "@/components/WindowFrame";
import { useEventHandler } from "@/hooks/useEventHandler";
import { useSubTree, type Tree } from "@/tree-state";
import type { FieldType, PageType } from "@shared/types";
import { create } from "css-in-bun" with { type: "macro" };
import type { Variants } from "framer-motion";
import type { ElementRef, ForwardedRef } from "react";

export function FormPage({
  nonce,
  tree,
  page,
  next,
}: {
  nonce: string;
  tree: Tree<Record<string, any>>;
  page: PageType;
  next: PageType[];
}) {
  const navigator = useStackNavigator();
  const submit = api.challenge.submit.useSWRMutation();
  const confirm = useEventHandler(async () => {
    if (next.length) {
      const [page, ...rest] = next;
      navigator.push(
        <FormPage nonce={nonce} tree={tree} page={page} next={rest} />,
        { mainButton: { text: rest.length ? "继续" : "提交" } }
      );
    } else {
      await submit.trigger({ nonce, answer: tree.value }).then(() => {
        Telegram.WebApp.showAlert(
          "提交成功，待管理员验证通过后即可加群",
          () => {
            Telegram.WebApp.close();
          }
        );
      });
    }
  });
  return (
    <WindowFrame title={page.subtitle}>
      <Form onSubmit={confirm} className={styles.FormPage}>
        {page.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            variants={variants}
            tree={tree}
            field={field}
          />
        ))}
      </Form>
    </WindowFrame>
  );
}

const variants: Variants = {
  enter: { opacity: 0 },
  present: { opacity: 1 },
  exit: { opacity: 0 },
};

const FieldRenderer = memoMotion(function FieldRenderer(
  {
    tree,
    field,
    isLast,
  }: { tree: Tree<Record<string, any>>; field: FieldType; isLast?: boolean },
  ref: ForwardedRef<ElementRef<"div">>
) {
  const valueTree = useSubTree(tree, field.id);
  switch (field.type) {
    case "label":
      return (
        <div ref={ref} className={styles.LabelRenderer}>
          {field.content}
        </div>
      );
    case "textblock":
      return (
        <div ref={ref} className={styles.TextBlockContainer}>
          <Markdown className={styles.TextBlockRenderer}>
            {field.content}
          </Markdown>
          {field.confirm && (
            <ToggleField
              tree={valueTree}
              label={field.confirmText || "我已认真阅读并同意上面的内容"}
              required
            />
          )}
        </div>
      );
    case "text":
      return (
        <div ref={ref}>
          <TextField
            tree={valueTree}
            label={field.title}
            placeholder={field.placeholder}
            description={field.description}
            enterKeyAction={
              field.multiline ? "enter" : isLast ? "done" : "next"
            }
            required={field.required}
            minLength={field.range.minLength}
            maxLength={field.range.maxLength}
          />
        </div>
      );
  }
  return null;
});

const styles = create({
  FormPage: {
    display: "grid",
    gap: 16,
  },
  LabelRenderer: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 1.5,
  },
  TextBlockContainer: {
    display: "grid",
    gap: 8,
  },
  TextBlockRenderer: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
});
