const { mainKeyboard, settingsKeyboard } = require("../keyboards/mainKeyboard");

function registerSettingsHandlers(bot) {
  bot.hears("⚙️ Настройки", (ctx) => {
    return ctx.reply(
      "⚙️ Настройки\n\nВыберите нужное значение кнопкой:",
      settingsKeyboard,
    );
  });

  bot.hears("⬅️ Назад", (ctx) => {
    return ctx.reply("Главное меню.", mainKeyboard);
  });
}

module.exports = registerSettingsHandlers;
