import { clipPath, path } from "svg-in-bun";

export function cssurl(href: string) {
  return `url(${href});`;
}

export function cssClipPath(content: string) {
  return cssurl(
    clipPath(
      { clipPathUnits: "objectBoundingBox" },
      path(content, { transform: `scale(${1 / 24})` })
    )
  );
}
