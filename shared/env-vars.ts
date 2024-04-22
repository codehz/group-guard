declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      BOT_INFO: string;
      BOT_OWNER: string;
      BOT_SECRET: string;
      BOT_HOST: string;
      BOT_CHALLENGE_URL: string;
    }
  }
  namespace Bun {
    const env: NodeJS.ProcessEnv;
  }
}
