const { mainKeyboard, cancelKeyboard } = require("../keyboards/mainKeyboard");
const userStates = require("../states/userStates");

const { getOrCreateUser } = require("../services/userService");

const {
  getLastCycle,
  getOpenCycle,
  createCycle,
  closeCycle,
  deleteCycle,
  reopenCycle,
} = require("../services/cycleService");

const { getToday, addDays } = require("../utils/dateUtils");

function registerCycleHandlers(bot) {
  bot.hears("🌙 Начались месячные", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const today = getToday();

    const { data: openedCycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      console.log("Ошибка поиска открытого цикла:", findError);
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (openedCycle) {
      return ctx.reply(
        `Уже есть открытая запись 🌙\n\nНачало: ${openedCycle.period_start}\n\nСначала нажмите ✅ Закончились или ↩️ Отменить последнюю запись.`,
      );
    }

    const { error } = await createCycle(user, today);

    if (error) {
      console.log("Ошибка сохранения начала:", error);
      return ctx.reply("Не получилось сохранить дату.");
    }

    return ctx.reply(`Записала начало: ${today} 🌙`);
  });

  bot.hears("✅ Закончились", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const today = getToday();

    const { data: cycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      console.log("Ошибка поиска открытого цикла:", findError);
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (!cycle) {
      return ctx.reply(
        "Нет открытого цикла. Сначала отметьте начало месячных 🌙",
      );
    }

    if (today < cycle.period_start) {
      return ctx.reply("Дата окончания не может быть раньше даты начала.");
    }

    const { error } = await closeCycle(cycle.id, today);

    if (error) {
      console.log("Ошибка сохранения окончания:", error);
      return ctx.reply("Не получилось сохранить дату окончания.");
    }

    return ctx.reply(`Записала окончание: ${today} ✅`);
  });

  bot.hears("✍️ Указать дату начала", (ctx) => {
    userStates[ctx.from.id] = {
      action: "manual_start",
    };

    return ctx.reply(
      "Введите дату начала в формате:\n\n2026-06-04\nили\n04.06.2026",
      cancelKeyboard,
    );
  });

  bot.hears("✍️ Указать дату окончания", (ctx) => {
    userStates[ctx.from.id] = {
      action: "manual_end",
    };

    return ctx.reply(
      "Введите дату окончания в формате:\n\n2026-06-04\nили\n04.06.2026",
      cancelKeyboard,
    );
  });

  bot.hears("📅 Мой цикл", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const { data: lastCycle, error } = await getLastCycle(user.id);

    if (error) {
      console.log("Ошибка получения цикла:", error);
      return ctx.reply("Не получилось загрузить данные.");
    }

    if (!lastCycle) {
      return ctx.reply("Пока данных нет. Отметьте начало месячных 🌙");
    }

    const cycleLength = lastCycle.cycle_length || user.cycle_length || 28;
    const periodLength = lastCycle.period_length || user.period_length || 5;

    const nextPeriodStart = addDays(lastCycle.period_start, cycleLength);
    const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);
    const ovulationDate = addDays(nextPeriodStart, -14);
    const fertileStart = addDays(ovulationDate, -5);
    const fertileEnd = addDays(ovulationDate, 1);

    return ctx.reply(
      `📅 Последняя запись\n\n` +
        `Начало: ${lastCycle.period_start}\n` +
        `Конец: ${lastCycle.period_end || "ещё не отмечен"}\n\n` +
        `Длина цикла: ${cycleLength} дней\n` +
        `Длительность месячных: ${periodLength} дней\n\n` +
        `Следующие месячные примерно:\n${nextPeriodStart} — ${nextPeriodEnd}\n\n` +
        `Овуляция примерно: ${ovulationDate}\n` +
        `Фертильное окно примерно:\n${fertileStart} — ${fertileEnd}\n\n` +
        `Это примерный прогноз, не медицинская гарантия. Организм не календарь Google, увы.`,
    );
  });

  bot.hears("↩️ Отменить последнюю запись", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const { data: lastCycle, error } = await getLastCycle(user.id);

    if (error) {
      console.log("Ошибка поиска последней записи:", error);
      return ctx.reply("Не получилось найти последнюю запись.");
    }

    if (!lastCycle) {
      return ctx.reply("Пока нечего отменять.");
    }

    if (!lastCycle.period_end) {
      const { error: deleteError } = await deleteCycle(lastCycle.id);

      if (deleteError) {
        console.log("Ошибка удаления:", deleteError);
        return ctx.reply("Не получилось отменить запись.");
      }

      return ctx.reply(
        `Отменила начало 🌙\n\nУдалено: ${lastCycle.period_start}`,
      );
    }

    const { error: updateError } = await reopenCycle(lastCycle.id);

    if (updateError) {
      console.log("Ошибка отката окончания:", updateError);
      return ctx.reply("Не получилось отменить окончание.");
    }

    return ctx.reply(
      `Отменила окончание ✅\n\nНачало осталось: ${lastCycle.period_start}`,
    );
  });

  bot.hears("❌ Отмена", (ctx) => {
    delete userStates[ctx.from.id];
    return ctx.reply("Отменено.", mainKeyboard);
  });
}

module.exports = registerCycleHandlers;
