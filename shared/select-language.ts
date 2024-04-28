export function selectLanguage<T>(value: Record<string, T>, preferred = "") {
  const entries = Object.entries(value);
  entries.sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]));
  for (const [lang, value] of entries) {
    if (lang.startsWith(preferred)) {
      return value;
    }
  }
  return value[""] as T;
}
