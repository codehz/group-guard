function escape(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function html(str: TemplateStringsArray, ...args: string[]) {
  let result = str[0].trim();
  for (let i = 0; i < args.length; i++) {
    result += escape(args[i]) + str[i + 1].trim();
  }
  return result;
}
