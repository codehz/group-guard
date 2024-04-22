import type { StyleWithAtRules } from "css-in-bun";

interface MyCustomProperties {
  "--initial-lines"?: number;
  "--subtle-color"?: string;
  "--color"?: string;
  "--background-color"?: string;
}

declare module "css-in-bun/style" {
  interface CustomProperties extends MyCustomProperties {
    "::-webkit-scrollbar": StyleWithAtRules;
  }
}

declare module "react" {
  interface CSSProperties extends MyCustomProperties {}
}

declare module "framer-motion" {
  interface CustomStyles extends MyCustomProperties {}
}
