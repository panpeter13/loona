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

const cycleCopy = {
  ru: { started: (d) => `Записала начало: ${d} 🌙`, ended: (d) => `Записала окончание: ${d} ✅`, noData: "Пока данных нет. Отметьте начало цикла 🌙", chooseStart: "Выберите дату начала:", chooseEnd: "Выберите дату окончания:", prediction: (p) => `📅 Последняя запись\n\nНачало: ${p.lastPeriodStart}\nКонец: ${p.lastPeriodEnd || "ещё не отмечен"}\n\nСредняя длина цикла: ${p.averageCycleLength} дней\nСредняя длительность периода: ${p.averagePeriodLength} дней\nУчтено циклов: ${p.cyclesUsed}\nТочность прогноза: ${p.confidence}\n\nСледующий период примерно:\n${p.nextPeriodStart} — ${p.nextPeriodEnd}\n\nОвуляция примерно: ${p.ovulationDate}\nФертильное окно примерно:\n${p.fertileWindowStart} — ${p.fertileWindowEnd}\n\n🩷 Прогноз приблизительный и не является медицинской рекомендацией.` },
  en: { started: (d) => `Start date saved: ${d} 🌙`, ended: (d) => `End date saved: ${d} ✅`, noData: "No data yet. Record the start of your cycle 🌙", chooseStart: "Choose the start date:", chooseEnd: "Choose the end date:", prediction: (p) => `📅 Latest entry\n\nStart: ${p.lastPeriodStart}\nEnd: ${p.lastPeriodEnd || "not recorded yet"}\n\nAverage cycle length: ${p.averageCycleLength} days\nAverage period length: ${p.averagePeriodLength} days\nCycles included: ${p.cyclesUsed}\nEstimate confidence: ${{ низкая: "low", средняя: "medium", высокая: "high" }[p.confidence] || p.confidence}\n\nNext period estimate:\n${p.nextPeriodStart} — ${p.nextPeriodEnd}\n\nEstimated ovulation: ${p.ovulationDate}\nEstimated fertile window:\n${p.fertileWindowStart} — ${p.fertileWindowEnd}\n\n🩷 Estimates are approximate and are not medical advice.` },
  ko: { started: (d) => `시작일을 기록했어요: ${d} 🌙`, ended: (d) => `종료일을 기록했어요: ${d} ✅`, noData: "아직 기록이 없어요. 주기 시작일을 기록해 주세요 🌙", chooseStart: "시작일을 선택해 주세요:", chooseEnd: "종료일을 선택해 주세요:", prediction: (p) => `📅 최근 기록\n\n시작: ${p.lastPeriodStart}\n종료: ${p.lastPeriodEnd || "아직 기록되지 않음"}\n\n평균 주기: ${p.averageCycleLength}일\n평균 생리 기간: ${p.averagePeriodLength}일\n반영된 주기: ${p.cyclesUsed}회\n예측 신뢰도: ${{ низкая: "낮음", средняя: "보통", высокая: "높음" }[p.confidence] || p.confidence}\n\n다음 생리 예상일:\n${p.nextPeriodStart} — ${p.nextPeriodEnd}\n\n예상 배란일: ${p.ovulationDate}\n예상 가임기:\n${p.fertileWindowStart} — ${p.fertileWindowEnd}\n\n🩷 예측은 참고용이며 의료 조언이 아닙니다.` },
};

function cFor(user) { return cycleCopy[user?.language] || cycleCopy.ru; }

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

    return ctx.reply(cFor(user).started(today), mainKeyboard(user));
  });
  bot.action("calendar_ignore", async (ctx) => {
    return ctx.answerCbQuery();
  });

  bot.action(/^calendar_month:(\d{4}):(\d{1,2})$/, async (ctx) => {
    const year = Number(ctx.match[1]);
    const month = Number(ctx.match[2]);

    await ctx.answerCbQuery();

    const user = await getOrCreateUser(ctx.from.id);

    return ctx.editMessageReplyMarkup(
      getCalendarKeyboard(year, month, user?.language).reply_markup,
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

    return ctx.reply(cFor(user).ended(today), mainKeyboard(user));
  });

  bot.hears("✍️ Указать дату начала", async (ctx) => {
    const today = new Date();

    userStates[ctx.from.id] = {
      action: "calendar_start",
    };

    const user = await getOrCreateUser(ctx.from.id);
    return ctx.reply(cFor(user).chooseStart, getCalendarKeyboard(today.getFullYear(), today.getMonth(), user.language));
  });

  bot.hears("✍️ Указать дату окончания", async (ctx) => {
    const today = new Date();

    userStates[ctx.from.id] = {
      action: "calendar_end",
    };

    const user = await getOrCreateUser(ctx.from.id);
    return ctx.reply(cFor(user).chooseEnd, getCalendarKeyboard(today.getFullYear(), today.getMonth(), user.language));
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
      return ctx.reply(cFor(user).noData, mainKeyboard(user));
    }

    const prediction = predictCycle(cycles, user);

    if (!prediction) {
      return ctx.reply("Не получилось построить прогноз.");
    }

    return ctx.reply(cFor(user).prediction(prediction), mainKeyboard(user));
  });
  bot.hears("💕 Цикл партнёрши", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    if (user.mode !== "partner" || !user.linked_user_id) {
      return ctx.reply(
        "Вы ещё не подключены как партнёр.\n\nНажмите 👤 Режим → 🤝 Партнёр и введите код партнёрши.",
        mainKeyboard(user),
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

  bot.hears("❌ Отмена", async (ctx) => {
    delete userStates[ctx.from.id];
    const user = await getOrCreateUser(ctx.from.id);
    return ctx.reply("Отменено.", mainKeyboard(user));
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
        mainKeyboard(user),
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

    return ctx.reply(cFor(user).started(selectedDate), mainKeyboard(user));
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

      return ctx.reply("Сначала отметьте начало цикла 🌙", mainKeyboard(user));
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

    return ctx.reply(cFor(user).ended(selectedDate), mainKeyboard(user));
  }

  await ctx.answerCbQuery();
  return ctx.reply("Не поняла действие.");
}

module.exports = registerCycleHandlers;
