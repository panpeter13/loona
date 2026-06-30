const { mainKeyboard, aboutKeyboard } = require("../keyboards/mainKeyboard");
const userStates = require("../states/userStates");

function registerAboutHandler(bot) {
  bot.hears("ℹ️ О LOONA", (ctx) => {
    return ctx.reply(
      `🌙 LOONA Beta 1.0\n\n` +
        `LOONA — это независимый pet-проект.\n\n` +
        `Я разрабатываю его самостоятельно в свободное время, чтобы создать удобный и максимально приватный трекер женского цикла без перегруженного интерфейса.\n\n` +
        `Спасибо каждому, кто пользуется LOONA, тестирует её и помогает делать проект лучше ❤️`,
      aboutKeyboard,
    );
  });

  bot.hears("📢 Новости", (ctx) => {
    return ctx.reply(
      `📢 Новости LOONA\n\n` +
        `Добро пожаловать в Beta 1.0!\n\n` +
        `✅ Уже работает:\n` +
        `• Учёт цикла\n` +
        `• Динамический прогноз\n` +
        `• Напоминания\n` +
        `• Режим партнёра\n` +
        `• Экспорт данных\n\n` +
        `🚧 В разработке:\n` +
        `• Статистика цикла\n` +
        `• Календарь с историей\n` +
        `• Новые языки\n` +
        `• Улучшенный прогноз\n\n` +
        `💡 Планируется:\n` +
        `• AI-помощник\n` +
        `• Telegram Stars\n` +
        `• Мобильное приложение\n\n` +
        `Спасибо, что помогаете развивать LOONA ❤️`,
      aboutKeyboard,
    );
  });

  bot.hears("❤️ Поддержать проект", (ctx) => {
    return ctx.reply(
      `❤️ Поддержать LOONA\n\n` +
        `LOONA создаётся одним разработчиком.\n\n` +
        `⭐ 10 Stars\n` +
        `☕ Купить кофе\n\n` +
        `⭐ 50 Stars\n` +
        `🍕 Купить пиццу\n\n` +
        `⭐ 100 Stars\n` +
        `🚀 Помочь развитию\n\n` +
        `━━━━━━━━━━━━━━\n\n` +
        `💫 Спасибо каждому, кто поддерживает проект.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "☕ 10 Stars", callback_data: "donate_stars:10" }],
            [{ text: "🍕 50 Stars", callback_data: "donate_stars:50" }],
            [{ text: "🚀 100 Stars", callback_data: "donate_stars:100" }],
          ],
        },
      },
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
