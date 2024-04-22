export function showError(e: any) {
  Telegram.WebApp.showPopup({
    title: "提示",
    message: e + "",
  });
}
