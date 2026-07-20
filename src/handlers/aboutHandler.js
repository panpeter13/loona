const { mainKeyboard, aboutKeyboard } = require("../keyboards/mainKeyboard");
const userStates = require("../states/userStates");

function registerAboutHandler(bot) {
  bot.hears("ℹ️ О LOONA", (ctx) => {
    return ctx.reply(
      `🌙 LOONA Beta 1.3.0\n\n` +
        `LOONA — это независимый pet-проект.\n\n` +
        `Я разрабатываю его самостоятельно в свободное время, чтобы создать удобный и максимально приватный трекер женского цикла без перегруженного интерфейса.\n\n` +
        `Спасибо каждому, кто пользуется LOONA, тестирует её и помогает делать проект лучше ❤️`,
      aboutKeyboard,
    );
  });

  bot.hears("📢 Новости", (ctx) => {
    return ctx.reply(
      `📢 Новости LOONA\n\n` +
        `Добро пожаловать в Beta 1.3.0!\n\n` +
        `✅ Уже работает:\n` +
        `• Учёт цикла\n` +
        `• Динамический прогноз\n` +
        `• Главный экран статуса\n` +
        `• Напоминания\n` +
        `• Режим партнёра\n` +
        `🚧 В разработке:\n` +
        `• Статистика цикла\n` +
        `• Календарь с историей\n` +
        `• Улучшенный прогноз\n\n` +
        `💡 Планируется:\n` +
        `• AI-помощник\n` +
        `• Мобильное приложение\n\n` +
        `Спасибо, что помогаете развивать LOONA ❤️`,
      aboutKeyboard,
    );
  });

  bot.hears("🔒 Приватность", (ctx) => {
    return ctx.reply(
      "🔒 Приватность LOONA\n\n" +
        "Для работы бот хранит Telegram ID, его обезличенный хэш, настройки, даты цикла и техническую историю уведомлений. " +
        "Данные используются только для функций LOONA и не продаются третьим лицам.\n\n" +
        "Вы можете полностью удалить профиль и связанные данные кнопкой «🗑 Удалить мои данные». " +
        "Прогнозы приблизительные и не являются медицинской рекомендацией.",
      aboutKeyboard,
    );
  });

  bot.hears("🐞 Сообщить об ошибке", (ctx) => {
    userStates[ctx.from.id] = { action: "feedback_bug" };

    return ctx.reply("🐞 Опишите ошибку одним сообщением.", aboutKeyboard);
  });

  bot.hears("💡 Предложить идею", (ctx) => {
    userStates[ctx.from.id] = { action: "feedback_idea" };

    return ctx.reply("💡 Напишите вашу идею одним сообщением.", aboutKeyboard);
  });

  bot.hears("⬅️ Назад", (ctx) => {
    delete userStates[ctx.from.id];
    return ctx.reply("Главное меню", mainKeyboard);
  });
}

module.exports = registerAboutHandler;
