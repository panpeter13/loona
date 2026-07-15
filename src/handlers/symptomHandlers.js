const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { getLastCycle } = require("../services/cycleService");
const { createSymptom } = require("../services/symptomService");
const { getOrCreateUser } = require("../services/userService");
const { getToday } = require("../utils/dateUtils");

function registerSymptomHandlers(bot) {
  bot.hears("🩺 Симптомы", (ctx) => {
    return ctx.reply(
      "🩺 Симптомы\n\n" +
        "Напишите симптом и его интенсивность от 1 до 5.\n\n" +
        "Примеры:\n" +
        "симптом боль 4\n" +
        "симптом головная боль 2\n" +
        "симптом настроение 5",
      mainKeyboard,
    );
  });

  bot.hears(/^симптом\s+(.+?)\s+([1-5])$/i, async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) return ctx.reply("Не получилось найти профиль.");

    const type = ctx.match[1].trim().slice(0, 80);
    const intensity = Number(ctx.match[2]);
    const { data: cycle, error: cycleError } = await getLastCycle(user.id);

    if (cycleError) {
      console.error("Ошибка поиска цикла для симптома:", cycleError);
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    const { error } = await createSymptom({
      userId: user.id,
      cycleId: cycle?.id || null,
      date: getToday(),
      type,
      intensity,
    });

    if (error) {
      console.error("Ошибка сохранения симптома:", error);
      return ctx.reply("Не получилось сохранить симптом.");
    }

    return ctx.reply(
      `Симптом сохранён: ${type}, интенсивность ${intensity}/5 🩺`,
      mainKeyboard,
    );
  });
}

module.exports = registerSymptomHandlers;
