const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { getOrCreateUser } = require("../services/userService");

function registerStartHandler(bot) {
  bot.start(async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось создать профиль. Попробуйте позже.");
    }

    return ctx.reply(
      "Привет. Я LOONA 🌙\n\n" +
        "Я помогу отслеживать цикл анонимно.\n\n" +
        "Важно: прогнозы примерные и не являются медицинской рекомендацией.",
      mainKeyboard,
    );
  });

  bot.hears("❓ Помощь", (ctx) => {
    return ctx.reply(
      "LOONA умеет:\n\n" +
        "🌙 Начались месячные — записать начало сегодня\n" +
        "✅ Закончились — записать окончание сегодня\n" +
        "✍️ Указать дату начала — ручной ввод даты\n" +
        "✍️ Указать дату окончания — ручной ввод даты\n" +
        "📅 Мой цикл — прогноз месячных и овуляции\n" +
        "🩺 Симптомы — запись симптомов\n" +
        "⚙️ Настройки — длина цикла и месячных\n" +
        "↩️ Отменить последнюю запись — откат ошибки\n" +
        "📤 Экспорт данных — выгрузка\n" +
        "🗑 Удалить мои данные — полное удаление\n\n" +
        "Telegram ID не хранится. Используется только хэш.",
    );
  });
}

module.exports = registerStartHandler;
