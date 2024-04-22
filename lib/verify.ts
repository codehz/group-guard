import type { User } from "grammy/types";
import { sha256 } from "js-sha256";
const KEY = sha256.hmac.arrayBuffer("WebAppData", Bun.env.BOT_TOKEN);

export function verify(data: string) {
  const { hash, ...body } = Object.fromEntries(new URLSearchParams(data));
  const text = Object.entries(body)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  if (sha256.hmac(KEY, text) === hash) {
    return {
      ...body,
      auth_date: new Date(+body.auth_date * 1000),
      user: JSON.parse(body.user),
    } as {
      auth_date: Date;
      query_id: string;
      start_param?: string;
      user: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
        allows_write_to_pm: boolean;
        is_premium: boolean;
      };
    };
  }
}
