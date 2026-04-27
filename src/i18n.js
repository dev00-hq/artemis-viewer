export function createI18n(locales, defaultLocale = "en") {
  const locale = locales[defaultLocale] ? defaultLocale : Object.keys(locales)[0];
  return {
    locale,
    messages: locales[locale],
    t(path, values = {}) {
      const template = path.split(".").reduce((value, key) => value?.[key], locales[locale]);
      if (typeof template !== "string") return path;
      return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
    },
  };
}
