import { Fieldset } from "@/components/Fieldset";
import { TextField } from "@/components/TextField";
import { useSubTrees, type Tree } from "@/tree-state";
import { type WelcomePageConfig } from "@shared/types";
import { memo } from "react";

export const WelcomePageEditor = memo(function WelcomePageEditor({
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
        description="支持Markdown，可以使用占位符{chat_title}" />
    </Fieldset>
  );
});
