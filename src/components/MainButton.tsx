import { memo, useEffect, type ComponentProps } from "react";
import { useIsActive } from "./StackNavigator";
import { useIsPresent } from "framer-motion";

const MainButtonInner = memo(function MainButton({
  children: text,
  disabled = false,
  color,
  backgroundColor,
  onClick,
  loadingIndicator = false,
}: {
  children: string;
  disabled?: boolean;
  color?: string;
  backgroundColor?: string;
  onClick?: () => void;
  loadingIndicator?: boolean;
}) {
  useEffect(() => {
    Telegram.WebApp.MainButton.isVisible = true;
    return () => {
      Telegram.WebApp.MainButton.isVisible = false;
    };
  }, []);
  useEffect(() => {
    Telegram.WebApp.MainButton.text = text;
  }, [text]);
  useEffect(() => {
    Telegram.WebApp.MainButton.isActive = !disabled;
  }, [disabled]);
  useEffect(() => {
    Telegram.WebApp.MainButton.color =
      backgroundColor ?? Telegram.WebApp.themeParams.button_color!;
  }, [backgroundColor]);
  useEffect(() => {
    Telegram.WebApp.MainButton.textColor =
      color ?? Telegram.WebApp.themeParams.button_text_color!;
  }, [color]);
  useEffect(() => {
    if (!onClick) return;
    Telegram.WebApp.MainButton.onClick(onClick);
    return () => void Telegram.WebApp.MainButton.offClick(onClick);
  }, []);
  useEffect(() => {
    if (loadingIndicator) {
      if (!Telegram.WebApp.MainButton.isProgressVisible)
        Telegram.WebApp.MainButton.showProgress();
    } else if (Telegram.WebApp.MainButton.isProgressVisible)
      Telegram.WebApp.MainButton.hideProgress();
  }, [loadingIndicator]);
  return null;
});

export const MainButton = memo(function MainButton(
  props: ComponentProps<typeof MainButtonInner>
) {
  const isPresent = useIsPresent();
  const isActive = useIsActive();
  return isPresent && isActive && <MainButtonInner {...props} />;
});
