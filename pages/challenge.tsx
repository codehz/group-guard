import { api } from "@/api";
import { WelcomePage } from "@/components/ChallengePage/WelcomePage";
import { LoadingPage } from "@/components/LoadingPage";
import { selectLanguage } from "@shared/select-language";
import { useState } from "react";

api.challenge.config.preload();
api.challenge.info.preload();

export default function ChallengePage() {
  return (
    <LoadingPage
      load={() => {
        const { data: configData } = api.challenge.config.useSWR(void 0, {
          suspense: true,
          shouldRetryOnError: false,
        });
        const { data } = api.challenge.info.useSWR(void 0, {
          suspense: true,
          shouldRetryOnError: false,
        });
        const language =
          data!.language ?? Telegram.WebApp.initDataUnsafe.user!.language_code;
        const config = selectLanguage(configData, language);
        return (
          <WelcomePage
            chat={data!.chat}
            config={config}
            form={data!.form ?? undefined}
            nonce={data!.nonce ?? undefined}
            answer={data!.answer ?? {}}
          />
        );
      }}
      options={{ mainButton: { text: "开始答题" } }}
    />
  );
}

ChallengePage.title = "Challenge Page";
