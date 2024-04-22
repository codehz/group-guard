import { memoMotion } from "@/component";
import { render } from "@croct/md-lite";
import {
  Fragment,
  type ElementRef,
  type ForwardedRef,
  type ReactNode,
} from "react";

function template(input: string, context: any) {
  return input.replace(/\{([^\}]+)\}/g, (whole, matched) => {
    const [expr, default_value = whole] = matched.split("|", 2);
    try {
      let current = context;
      for (const part of expr.split(".")) {
        current =
          typeof current[part] === "function" ? current[part]() : current[part];
        if (current == null) return default_value;
      }
      return current;
    } catch {
      return default_value;
    }
  });
}

const map = (children: ReactNode) => {
  if (Array.isArray(children)) {
    return children.map((child, idx) => {
      return <Fragment key={idx}>{child}</Fragment>;
    });
  }
  return children;
};

export const Markdown = memoMotion(function Markdown(
  {
    children,
    className,
    context = {},
  }: {
    children: string;
    className?: string;
    context?: any;
  },
  ref: ForwardedRef<ElementRef<"div">>
) {
  return (
    <div data-swipe className={className} ref={ref}>
      {render<ReactNode>(children, {
        text: (node) => template(node.content, context).trim(),
        bold: (node) => <b data-swipe>{map(node.children)}</b>,
        italic: (node) => <i data-swipe>{map(node.children)}</i>,
        strike: (node) => <s data-swipe>{map(node.children)}</s>,
        code: (node) => <code data-swipe>{node.content}</code>,
        link: (node) => <a href={node.href}>{map(node.children)}</a>,
        image: (node) => <img data-swipe src={node.src} alt={node.alt} />,
        paragraph: (node) => <p data-swipe>{map(node.children)}</p>,
        fragment: (node) => map(node.children),
      })}
    </div>
  );
});
