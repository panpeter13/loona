function registerSymptomHandlers(bot) {
  bot.hears("🩺 Симптомы", (ctx) => {
    return ctx.reply(
      "🩺 Симптомы\n\n" +
        "Напишите симптом в формате:\n\n" +
        "симптом боль 4\n" +
        "симптом голова 2\n" +
        "симптом настроение 5\n\n" +
        "Число от 1 до 5 — сила симптома.",
    );
  });
}

module.exports = registerSymptomHandlers;
