import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  Telegram.WebApp.onEvent("themeChanged", cb);
  return () => {
    Telegram.WebApp.offEvent("themeChanged", cb);
  };
};
const getSnapshot = () => Telegram.WebApp.colorScheme;
const getServerSnapshot = () => "light";
export const useColorScheme = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
