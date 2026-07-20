const supabase = require("../database/supabase");
const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { getCalendarKeyboard } = require("../keyboards/calendarKeyboard");
const userStates = require("../states/userStates");
const { predictCycle } = require("../services/predictionService");
const { getOrCreateUser } = require("../services/userService");

const {
  getLastCycle,
  getOpenCycle,
  createCycle,
  closeCycle,
  deleteCycle,
  reopenCycle,
  getUserCycles,
} = require("../services/cycleService");

const { getToday, addDays } = require("../utils/dateUtils");

function registerCycleHandlers(bot) {
  bot.hears("🌙 Начался цикл", async (ctx) => {
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
        `Уже есть открытая запись 🌙\n\nНачало: ${openedCycle.period_start}\n\nСначала нажмите ✅ Завершился или ↩️ Отменить последнюю запись.`,
      );
    }

    const { error } = await createCycle(user, today);

    if (error) {
      console.log("Ошибка сохранения начала:", error);
      return ctx.reply("Не получилось сохранить дату.");
    }

    return ctx.reply(`Записала начало: ${today} 🌙`);
  });
  bot.action("calendar_ignore", async (ctx) => {
    return ctx.answerCbQuery();
  });

  bot.action(/^calendar_month:(\d{4}):(\d{1,2})$/, async (ctx) => {
    const year = Number(ctx.match[1]);
    const month = Number(ctx.match[2]);

    await ctx.answerCbQuery();

    return ctx.editMessageReplyMarkup(
      getCalendarKeyboard(year, month).reply_markup,
    );
  });

  bot.action("calendar_today", async (ctx) => {
    const today = getToday();

    return handleCalendarDate(ctx, today);
  });

  bot.action(/^calendar_day:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const selectedDate = ctx.match[1];

    return handleCalendarDate(ctx, selectedDate);
  });

  bot.action("calendar_cancel", async (ctx) => {
    delete userStates[ctx.from.id];

    await ctx.answerCbQuery("Отменено");

    return ctx.editMessageText("Выбор даты отменён.");
  });
  bot.hears("✅ Завершился", async (ctx) => {
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
        "Нет открытого цикла. Сначала отметьте его начало 🌙",
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
    const today = new Date();

    userStates[ctx.from.id] = {
      action: "calendar_start",
    };

    return ctx.reply(
      "Выберите дату начала:",
      getCalendarKeyboard(today.getFullYear(), today.getMonth()),
    );
  });

  bot.hears("✍️ Указать дату окончания", (ctx) => {
    const today = new Date();

    userStates[ctx.from.id] = {
      action: "calendar_end",
    };

    return ctx.reply(
      "Выберите дату окончания:",
      getCalendarKeyboard(today.getFullYear(), today.getMonth()),
    );
  });

  bot.hears("📅 Мой цикл", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const { data: cycles, error } = await getUserCycles(user.id);

    if (error) {
      console.log("Ошибка получения циклов:", error);
      return ctx.reply("Не получилось загрузить данные.");
    }

    if (!cycles || cycles.length === 0) {
      return ctx.reply("Пока данных нет. Отметьте начало цикла 🌙");
    }

    const prediction = predictCycle(cycles, user);

    if (!prediction) {
      return ctx.reply("Не получилось построить прогноз.");
    }

    return ctx.reply(
      `📅 Последняя запись\n\n` +
        `Начало: ${prediction.lastPeriodStart}\n` +
        `Конец: ${prediction.lastPeriodEnd || "ещё не отмечен"}\n\n` +
        `Средняя длина цикла: ${prediction.averageCycleLength} дней\n` +
        `Средняя длительность периода: ${prediction.averagePeriodLength} дней\n` +
        `Учтено циклов: ${prediction.cyclesUsed}\n` +
        `Точность прогноза: ${prediction.confidence}\n\n` +
        `Следующий период примерно:\n${prediction.nextPeriodStart} — ${prediction.nextPeriodEnd}\n\n` +
        `Овуляция примерно: ${prediction.ovulationDate}\n` +
        `Фертильное окно примерно:\n${prediction.fertileWindowStart} — ${prediction.fertileWindowEnd}\n\n` +
        `🩷 LOONA учитывает историю ваших циклов, чтобы постепенно улучшать точность прогноза.`,
    );
  });
  bot.hears("💕 Цикл партнёрши", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    if (user.mode !== "partner" || !user.linked_user_id) {
      return ctx.reply(
        "Вы ещё не подключены как партнёр.\n\nНажмите 👤 Режим → 🤝 Партнёр и введите код партнёрши.",
        mainKeyboard,
      );
    }

    const { data: partnerUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.linked_user_id)
      .maybeSingle();

    if (userError || !partnerUser) {
      console.log("Ошибка поиска партнёрши:", userError);
      return ctx.reply("Не получилось найти данные партнёрши.");
    }

    const { data: lastCycle, error } = await getLastCycle(partnerUser.id);

    if (error) {
      console.log("Ошибка получения цикла партнёрши:", error);
      return ctx.reply("Не получилось загрузить данные.");
    }

    if (!lastCycle) {
      return ctx.reply("Пока у партнёрши нет записей о цикле.");
    }

    const cycleLength =
      lastCycle.cycle_length || partnerUser.cycle_length || 28;

    const periodLength =
      lastCycle.period_length || partnerUser.period_length || 5;

    const nextPeriodStart = addDays(lastCycle.period_start, cycleLength);
    const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);
    const ovulationDate = addDays(nextPeriodStart, -14);
    const fertileStart = addDays(ovulationDate, -5);
    const fertileEnd = addDays(ovulationDate, 1);

    return ctx.reply(
      `💕 Цикл партнёрши\n\n` +
        `Последняя запись:\n` +
        `Начало: ${lastCycle.period_start}\n` +
        `Конец: ${lastCycle.period_end || "ещё не отмечен"}\n\n` +
        `Следующий период примерно:\n${nextPeriodStart} — ${nextPeriodEnd}\n\n` +
        `Овуляция примерно: ${ovulationDate}\n` +
        `Фертильное окно примерно:\n${fertileStart} — ${fertileEnd}\n\n` +
        `Это примерный прогноз, не медицинская гарантия.`,
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
async function handleCalendarDate(ctx, selectedDate) {
  const state = userStates[ctx.from.id];

  if (!state) {
    await ctx.answerCbQuery();
    return ctx.reply("Сначала выберите действие.");
  }

  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    await ctx.answerCbQuery();
    return ctx.reply("Не получилось найти профиль.");
  }

  if (selectedDate > getToday()) {
    await ctx.answerCbQuery("Нельзя выбрать дату из будущего");
    return;
  }

  if (state.action === "calendar_start") {
    const { data: openedCycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      console.log("Ошибка поиска открытого цикла:", findError);
      await ctx.answerCbQuery();
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (openedCycle) {
      await ctx.answerCbQuery();
      return ctx.reply(
        `Уже есть открытая запись: ${openedCycle.period_start}\n\nСначала закройте или отмените её.`,
        mainKeyboard,
      );
    }

    const { error } = await createCycle(user, selectedDate);

    if (error) {
      console.log("Ошибка сохранения начала:", error);
      await ctx.answerCbQuery();
      return ctx.reply("Не получилось сохранить дату.");
    }

    delete userStates[ctx.from.id];

    await ctx.answerCbQuery("Дата выбрана");
    await ctx.editMessageText(`Выбрана дата начала: ${selectedDate}`);

    return ctx.reply(`Записала начало: ${selectedDate} 🌙`, mainKeyboard);
  }

  if (state.action === "calendar_end") {
    const { data: cycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      console.log("Ошибка поиска открытого цикла:", findError);
      await ctx.answerCbQuery();
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (!cycle) {
      delete userStates[ctx.from.id];

      await ctx.answerCbQuery();
      await ctx.editMessageText("Нет открытого цикла.");

      return ctx.reply("Сначала отметьте начало цикла 🌙", mainKeyboard);
    }

    if (selectedDate < cycle.period_start) {
      await ctx.answerCbQuery("Дата раньше начала");
      return ctx.reply("Дата окончания не может быть раньше даты начала.");
    }

    const { error } = await closeCycle(cycle.id, selectedDate);

    if (error) {
      console.log("Ошибка сохранения окончания:", error);
      await ctx.answerCbQuery();
      return ctx.reply("Не получилось сохранить дату окончания.");
    }

    delete userStates[ctx.from.id];

    await ctx.answerCbQuery("Дата выбрана");
    await ctx.editMessageText(`Выбрана дата окончания: ${selectedDate}`);

    return ctx.reply(`Записала окончание: ${selectedDate} ✅`, mainKeyboard);
  }

  await ctx.answerCbQuery();
  return ctx.reply("Не поняла действие.");
}

module.exports = registerCycleHandlers;
