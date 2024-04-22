import { extractDts } from "dts-extract";

extractDts("tsconfig.workers.json", {
  "lib/api-server.ts": "src/api-server.d.ts",
});
