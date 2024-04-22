import { $ } from "bun";

console.log('deploying pages...');
await $`(cd .build && bun x wrangler pages deploy static)`;
console.log('deploying consumer...');
await $`(cd consumer && bun x wrangler deploy)`;
