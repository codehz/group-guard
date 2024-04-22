import { $ } from "bun";
import { getGeneratedCss } from "css-in-bun/build";
import { parse, relative } from "node:path";
import { getGeneratedSvg } from "svg-in-bun/build";
import { build, hydratePlugin, listDir, ssg } from "./helper";
import { minify } from "csso";

const functions: string[] = await listDir("./functions");
const pages: string[] = await listDir("./pages");

await $`rm -rf .build && mkdir -p .build`;
await $`cp -r static .build`;

const define = Object.fromEntries(
  Object.entries(Bun.env)
    .filter(([k]) => k.startsWith("BOT_") || k.startsWith("NODE_"))
    .map(([k, v]) => [`Bun.env.${k}`, JSON.stringify(v)])
);

await build({
  entrypoints: functions,
  outdir: ".build/functions",
  target: "browser",
  naming: {
    entry: "[dir]/[name].[ext]",
    chunk: "../chunks/[name]-[hash].[ext]",
    asset: "../static/[name]-[hash].[ext]",
  },
  splitting: true,
  define,
});
console.log("built functions");

const transpiler = new Bun.Transpiler({});

for (const path of await listDir("./.build/chunks")) {
  let content = await Bun.file(path).text();
  const imports = transpiler
    .scanImports(content)
    .filter((imp) => imp.path.startsWith("chunk-"));
  if (imports.length === 0) continue;
  for (const imp of imports) {
    content = content.replaceAll(imp.path, "./" + imp.path);
  }
  await Bun.write(path, content);
}
console.log("fixed chunks");

await build({
  entrypoints: pages,
  outdir: ".build/static/",
  target: "browser",
  plugins: [hydratePlugin],
  minify: Bun.env.NODE_ENV === "production",
  naming: {
    entry: "[dir]/[name].[ext]",
    chunk: "[name]-[hash].[ext]",
    asset: "[hash].[ext]",
  },
  define,
});
console.log("built pages js");

const svg = getGeneratedSvg();
const css = minify(
  (await Bun.file("global.css").text()) + getGeneratedCss()
).css;
for await (const path of pages) {
  const base = ".build/static/";
  const rel = relative("./pages", path);
  const result = await ssg((await import("./" + path)).default, rel, {
    svg,
    css,
  });
  await Bun.write(base + parse(rel).name + ".html", result);
}
console.log("built pages");

await build({
  entrypoints: ["consumer/index.ts"],
  outdir: "consumer",
  target: "browser",
  define,
});
console.log("built consumer");
