import { z } from "zod";

const nanoid = z.string().length(21);

export const LabelType = z.object({
  id: nanoid,
  type: z.literal("label"),
  content: z.string().min(1),
});
export type LabelType = z.infer<typeof LabelType>;

export const TextBlockType = z.object({
  id: nanoid,
  type: z.literal("textblock"),
  content: z.string().min(1),
  confirm: z.boolean().default(false),
  confirmText: z.string(),
});
export type TextBlockType = z.infer<typeof TextBlockType>;

export const TextFieldType = z.object({
  id: nanoid,
  type: z.literal("text"),
  title: z.string().min(1, "标题不能为空"),
  description: z.string(),
  placeholder: z.string(),
  multiline: z.boolean().default(false),
  required: z.boolean().default(true),
  range: z
    .object({
      minLength: z
        .number()
        .min(1, "最小长度不能小于1")
        .max(1000, "最小长度不能大于1000")
        .default(1),
      maxLength: z
        .number()
        .min(1, "最大长度不能小于1")
        .max(1000, "最大长度不能大于1000")
        .default(1000),
    })
    .refine(
      ({ minLength, maxLength }) => minLength <= maxLength,
      "文本字段最小长度不能大于最大长度"
    ),
});
export type TextFieldType = z.infer<typeof TextFieldType>;

export const FieldType = z.discriminatedUnion(
  "type",
  [LabelType, TextBlockType, TextFieldType],
  { invalid_type_error: "未知字段类型" }
);
export type FieldType = z.infer<typeof FieldType>;

export const FieldTypeTypeMap = {
  label: "标签",
  textblock: "文本块（Markdown）",
  text: "文本字段",
} satisfies Record<FieldType["type"], string>;

export const PageType = z.object({
  id: nanoid,
  subtitle: z.string(),
  fields: z.array(FieldType).min(1, "页面至少要有一个字段"),
});
export type PageType = z.infer<typeof PageType>;

export const FormType = z.object({
  tag: z.string(),
  description: z.string(),
  pages: z.array(PageType).min(1, "表单至少要有一个页面"),
});
export type FormType = z.infer<typeof FormType>;

export type QueueData =
  | {
      type: "welcome";
      chat_id: number;
      nonce: string;
      welcome_message: number;
      target_user: number;
    }
  | {
      type: "direct_notification_expired";
      chat_id: number;
      nonce: string;
      message_id: number;
      target_user: number;
    };

export const WelcomePageConfig = z.object({
  title: z.string().min(1, "标题不能为空"),
  content: z.string().min(1, "内容不能为空"),
});
export type WelcomePageConfig = z.infer<typeof WelcomePageConfig>;

export const ChatConfig = z.object({
  enabled: z.boolean(),
  welcome_page: WelcomePageConfig,
  challenge_timeout: z.number(),
  ban_duration: z.number(),
  notification_mode: z.enum(["private", "external", "direct"]),
  notification_external_chat_id: z.number(),
  notification_direct_timeout: z.number(),
  delete_new_chat_member_message: z.boolean().default(false),
});
export type ChatConfig = z.infer<typeof ChatConfig>;
export const DefaultChatConfig: ChatConfig = {
  enabled: true,
  welcome_page: {
    title: "欢迎",
    content: "欢迎来到 {chat_title}。请点击下面的按钮通过验证",
  },
  challenge_timeout: 60 * 5,
  ban_duration: 60 * 5,
  notification_mode: "private",
  notification_external_chat_id: 0,
  notification_direct_timeout: 60 * 5,
  delete_new_chat_member_message: false,
};
