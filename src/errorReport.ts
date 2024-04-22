export function errorReport(error: any) {
  return new Promise<void>((resolve) => {
    Telegram.WebApp.showAlert(error + "", resolve);
  });
}
