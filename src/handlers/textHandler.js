const supabase = require("../database/supabase");

const { mainKeyboard } = require("../keyboards/mainKeyboard");
const userStates = require("../states/userStates");

const {
  parseDate,
  isValidDate,
  getCycleDays,
  getToday,
} = require("../utils/dateUtils");

const {
  getOrCreateUser,
  updateCycleLength,
  updatePeriodLength,
} = require("../services/userService");

const {
  getOpenCycle,
  createCycle,
  closeCycle,
  getLastCycle,
} = require("../services/cycleService");

const { createSymptom } = require("../services/symptomService");

function registerTextHandler(bot) {
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const state = userStates[ctx.from.id];

    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    if (state?.action === "manual_start") {
      const date = parseDate(text);

      if (!date || !isValidDate(date)) {
        return ctx.reply(
          "Дата не распознана. Пример: 2026-06-04 или 04.06.2026",
        );
      }

      const { data: openedCycle, error: findError } = await getOpenCycle(
        user.id,
      );

      if (findError) {
        console.log("Ошибка поиска открытого цикла:", findError);
        return ctx.reply("Не получилось проверить текущий цикл.");
      }

      if (openedCycle) {
        return ctx.reply(
          `Уже есть открытая запись: ${openedCycle.period_start}\n\nСначала закройте или отмените её.`,
          mainKeyboard,
        );
      }

      const { error } = await createCycle(user, date);

      if (error) {
        console.log("Ошибка ручного начала:", error);
        return ctx.reply("Не получилось сохранить дату.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply(`Записала начало: ${date} 🌙`, mainKeyboard);
    }

    if (state?.action === "manual_end") {
      const date = parseDate(text);

      if (!date || !isValidDate(date)) {
        return ctx.reply(
          "Дата не распознана. Пример: 2026-06-04 или 04.06.2026",
        );
      }

      const { data: cycle, error: findError } = await getOpenCycle(user.id);

      if (findError) {
        console.log("Ошибка поиска открытого цикла:", findError);
        return ctx.reply("Не получилось проверить текущий цикл.");
      }

      if (!cycle) {
        delete userStates[ctx.from.id];
        return ctx.reply("Нет открытого цикла.", mainKeyboard);
      }

      if (date < cycle.period_start) {
        return ctx.reply("Дата окончания не может быть раньше даты начала.");
      }

      const periodDays = getCycleDays(cycle.period_start, date);

      if (periodDays > 14) {
        return ctx.reply(
          "Период получился больше 14 дней. Проверьте дату. Если всё верно — позже добавим подтверждение таких случаев.",
        );
      }

      const { error } = await closeCycle(cycle.id, date);

      if (error) {
        console.log("Ошибка ручного окончания:", error);
        return ctx.reply("Не получилось сохранить дату окончания.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply(`Записала окончание: ${date} ✅`, mainKeyboard);
    }

    if (state?.action === "confirm_delete") {
      if (text !== "УДАЛИТЬ") {
        return ctx.reply("Для подтверждения нужно написать ровно: УДАЛИТЬ");
      }

      await supabase.from("symptoms").delete().eq("user_id", user.id);
      await supabase.from("cycles").delete().eq("user_id", user.id);

      const { error } = await supabase.from("users").delete().eq("id", user.id);

      if (error) {
        console.log("Ошибка удаления данных:", error);
        return ctx.reply("Не получилось удалить данные.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply("Все данные удалены 🗑", mainKeyboard);
    }

    const cycleMatch = text.match(/^цикл\s+(\d+)$/i);

    if (cycleMatch) {
      const value = Number(cycleMatch[1]);

      if (value < 15 || value > 60) {
        return ctx.reply("Длина цикла должна быть от 15 до 60 дней.");
      }

      const { error } = await updateCycleLength(user.id, value);

      if (error) {
        console.log("Ошибка настройки цикла:", error);
        return ctx.reply("Не получилось сохранить настройку.");
      }

      return ctx.reply(`Сохранила длину цикла: ${value} дней`);
    }

    const periodMatch = text.match(/^месячные\s+(\d+)$/i);

    if (periodMatch) {
      const value = Number(periodMatch[1]);

      if (value < 1 || value > 14) {
        return ctx.reply("Длительность месячных должна быть от 1 до 14 дней.");
      }

      const { error } = await updatePeriodLength(user.id, value);

      if (error) {
        console.log("Ошибка настройки месячных:", error);
        return ctx.reply("Не получилось сохранить настройку.");
      }

      return ctx.reply(`Сохранила длительность месячных: ${value} дней`);
    }

    const symptomMatch = text.match(/^симптом\s+(.+)\s+([1-5])$/i);

    if (symptomMatch) {
      const type = symptomMatch[1].trim();
      const intensity = Number(symptomMatch[2]);
      const today = getToday();

      const { data: lastCycle } = await getLastCycle(user.id);

      const { error } = await createSymptom({
        userId: user.id,
        cycleId: lastCycle?.id || null,
        date: today,
        type,
        intensity,
      });

      if (error) {
        console.log("Ошибка сохранения симптома:", error);
        return ctx.reply("Не получилось сохранить симптом.");
      }

      return ctx.reply(`Сохранила симптом: ${type}, сила ${intensity}/5 🩺`);
    }

    return ctx.reply("Не поняла команду. Нажмите ❓ Помощь.");
  });
}

module.exports = registerTextHandler;
