const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { getDashboardText } = require("../services/dashboardService");
const { getOrCreateUser } = require("../services/userService");
const logger = require("../utils/logger");

function registerDashboardHandler(bot) {
  bot.hears("✨ Главный экран", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.", mainKeyboard());
    }

    try {
      const text = await getDashboardText(user);
      return ctx.reply(text, mainKeyboard(user));
    } catch (error) {
      logger.error("Ошибка загрузки главного экрана", error);
      return ctx.reply(
        "Не получилось загрузить главный экран. Попробуйте позже.",
        mainKeyboard(user),
      );
    }
  });
}

module.exports = registerDashboardHandler;
