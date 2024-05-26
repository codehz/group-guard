function escape(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

type StringOrUnsafeHTML = string | number | { html: string };

export function html(str: TemplateStringsArray, ...args: StringOrUnsafeHTML[]) {
  let result = str[0].trim();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const escaped =
      typeof arg === "string"
        ? escape(arg)
        : typeof arg === "number"
          ? arg.toString()
          : arg?.html;
    result += escaped + str[i + 1].trim();
  }
  return result;
}
