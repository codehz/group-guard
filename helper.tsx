// @ts-ignore
import { Container } from "@/components/Container";
import {
  fileURLToPath,
  pathToFileURL,
  type BuildConfig,
  type BunPlugin,
} from "bun";
import { readdir } from "node:fs/promises";
import { basename, join, parse } from "node:path";
import { renderToString } from "react-dom/server";

export async function ssg(
  Component: any,
  path: string,
  { svg, css }: { svg: string; css: string }
) {
  const str = renderToString(
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{Component.title ?? "Group Guard"}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script type="module" src="/telegram-web-app.js" />
        <script type="module" src={"/" + parse(path).name + ".js"} />
      </head>
      <body>
        <div id="root">
          <Container>
            <Component />
          </Container>
        </div>
        <div id="svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </body>
    </html>
  );
  return `<!DOCTYPE html>${str}`;
}

export async function build(config: BuildConfig) {
  const result = await Bun.build(config);
  if (result.logs.length) {
    console.log(result.logs);
  }
  if (!result.success) {
    process.exit(1);
  }
  return result.outputs;
}

export async function* walkDir(path: string): AsyncGenerator<string> {
  const dirents = await readdir(path, { withFileTypes: true });
  for (const dirent of dirents) {
    const finalPath = join(path, dirent.name);
    if (dirent.isDirectory()) {
      yield* walkDir(finalPath);
    } else {
      yield finalPath;
    }
  }
}
export async function listDir(path: string): Promise<string[]> {
  const result: string[] = [];
  for await (const item of walkDir(path)) {
    result.push(item);
  }
  return result;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export const hydratePlugin: BunPlugin = {
  name: "hydrate",
  target: "browser",
  setup(build) {
    build.onLoad(
      {
        filter: new RegExp(
          "^" +
            escapeRegExp(join(import.meta.dir, "./pages")) +
            "/.*" +
            "\\.ts[x]$"
        ),
      },
      async ({ path, loader }) => {
        const search = new URLSearchParams();
        search.append("client", "1");
        search.append("loader", loader);
        return {
          contents: [
            `import Component from ${JSON.stringify(
              "./" + basename(path) + "?client"
            )}`,
            `import { hydrateRoot } from "react-dom/client"`,
            `import { Container } from "@/components/Container"`,
            `hydrateRoot(document.getElementById("root"), <Container><Component /></Container>);`,
          ].join(";\n"),
          loader: "jsx" as const,
        };
      }
    );
    build.onResolve(
      { filter: /\.ts[x]\?client$/ },
      async ({ importer, path }) => {
        const url = pathToFileURL(importer);
        return {
          path: fileURLToPath(new URL(path, url)),
          namespace: "client",
        };
      }
    );
    build.onLoad(
      { namespace: "client", filter: /\.ts[x]$/ },
      async ({ path, loader }) => {
        return { contents: await Bun.file(path).text(), loader };
      }
    );
  },
};
