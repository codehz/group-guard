const res = await fetch(Bun.env.BOT_HOST + "/maintenance/register", {
  method: "POST",
  headers: {
    "X-Bot-Secret": Bun.env.BOT_SECRET,
  },
  verbose: true,
});
console.log(await res.text());
