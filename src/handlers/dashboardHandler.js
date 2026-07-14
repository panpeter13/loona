const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { getDashboardText } = require("../services/dashboardService");
const { getOrCreateUser } = require("../services/userService");

function registerDashboardHandler(bot) {
  bot.hears("✨ Главный экран", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.", mainKeyboard);
    }

    try {
      const text = await getDashboardText(user);
      return ctx.reply(text, mainKeyboard);
    } catch (error) {
      console.error("Ошибка загрузки главного экрана:", error);
      return ctx.reply(
        "Не получилось загрузить главный экран. Попробуйте позже.",
        mainKeyboard,
      );
    }
  });
}

module.exports = registerDashboardHandler;
