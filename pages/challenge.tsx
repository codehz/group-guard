import { api } from "@/api";
import { WelcomePage } from "@/components/ChallengePage/WelcomePage";
import { LoadingPage } from "@/components/LoadingPage";

export default function ChallengePage() {
  return (
    <LoadingPage
      load={() => {
        const { data } = api.challenge.info.useSWR(void 0, {
          suspense: true,
          shouldRetryOnError: false,
        });
        return (
          <WelcomePage
            chat={data!.chat}
            config={data!.config ?? undefined}
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
