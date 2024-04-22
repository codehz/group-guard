import { ChatList } from "@/components/AdminPage/ChatList";
import { WindowFrame } from "@/components/WindowFrame";
import { style } from "css-in-bun" with { type: "macro" };
import { Suspense } from "react";
import { Loading } from "../src/components/Loading";

export default function AdminPage() {
  return (
    <WindowFrame title="管理页面" className={style({ gap: 8 })} locked>
      <Suspense fallback={<Loading />}>
        <ChatList />
      </Suspense>
    </WindowFrame>
  );
}

AdminPage.title = "Admin Page";
