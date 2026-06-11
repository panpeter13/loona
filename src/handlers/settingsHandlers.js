function registerSettingsHandlers(bot) {
  bot.hears("⚙️ Настройки", (ctx) => {
    return ctx.reply(
      "⚙️ Настройки\n\n" +
        "Напишите:\n\n" +
        "цикл 28\n" +
        "месячные 5\n\n" +
        "Примеры:\n" +
        "цикл 30\n" +
        "месячные 6",
    );
  });
}

module.exports = registerSettingsHandlers;
