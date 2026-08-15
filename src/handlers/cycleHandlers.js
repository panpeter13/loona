const supabase = require("../database/supabase");
const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { getCalendarKeyboard } = require("../keyboards/calendarKeyboard");
const userStates = require("../states/userStates");
const { predictCycle } = require("../services/predictionService");
const { formatPrediction } = require("../services/predictionText");
const { getOrCreateUser, recordHealthDataConsent } = require("../services/userService");
const { notifyPartnersCycleStarted } = require("../services/partnerNotificationService");
const { requireHealthConsent, consentCopy } = require("../services/telegramConsentService");
const logger = require("../utils/logger");

const {
  getLastCycle,
  getOpenCycle,
  createCycle,
  closeCycle,
  deleteCycle,
  reopenCycle,
  getUserCycles,
} = require("../services/cycleService");

const { getToday } = require("../utils/dateUtils");

const cycleCopy = {
  ru: { started: (d) => `Записала начало: ${d} 🌙`, ended: (d) => `Записала окончание: ${d} ✅`, noData: "Пока данных нет. Отметьте начало цикла 🌙", chooseStart: "Выберите дату начала:", chooseEnd: "Выберите дату окончания:" },
  en: { started: (d) => `Start date saved: ${d} 🌙`, ended: (d) => `End date saved: ${d} ✅`, noData: "No data yet. Record the start of your cycle 🌙", chooseStart: "Choose the start date:", chooseEnd: "Choose the end date:" },
  ko: { started: (d) => `시작일을 기록했어요: ${d} 🌙`, ended: (d) => `종료일을 기록했어요: ${d} ✅`, noData: "아직 기록이 없어요. 주기 시작일을 기록해 주세요 🌙", chooseStart: "시작일을 선택해 주세요:", chooseEnd: "종료일을 선택해 주세요:" },
};

function cFor(user) { return cycleCopy[user?.language] || cycleCopy.ru; }

function registerCycleHandlers(bot) {
  bot.action("health_consent_accept", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    if (!user) return ctx.answerCbQuery("Profile unavailable");
    const { error } = await recordHealthDataConsent(user.id);
    if (error) {
      logger.error("Ошибка сохранения согласия Telegram", error);
      return ctx.answerCbQuery("Не получилось сохранить согласие", { show_alert: true });
    }
    const c = consentCopy(user);
    await ctx.answerCbQuery();
    return ctx.editMessageText(c.saved);
  });

  bot.action("health_consent_decline", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    const c = consentCopy(user);
    await ctx.answerCbQuery();
    return ctx.editMessageText(c.declined);
  });

  bot.hears("🌙 Начался цикл", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }
    if (await requireHealthConsent(ctx, user)) return;

    const today = getToday(user.timezone);

    const { data: openedCycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      logger.error("Ошибка поиска открытого цикла", findError);
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (openedCycle) {
      return ctx.reply(
        `Уже есть открытая запись 🌙\n\nНачало: ${openedCycle.period_start}\n\nСначала нажмите ✅ Завершился или ↩️ Отменить последнюю запись.`,
      );
    }

    const { error } = await createCycle(user, today);

    if (error) {
      logger.error("Ошибка сохранения начала", error);
      return ctx.reply("Не получилось сохранить дату.");
    }

    await notifyPartnersCycleStarted(bot.telegram, user.id);

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
    const user = await getOrCreateUser(ctx.from.id);
    const today = getToday(user?.timezone);

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
    if (await requireHealthConsent(ctx, user)) return;

    const today = getToday(user.timezone);

    const { data: cycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      logger.error("Ошибка поиска открытого цикла", findError);
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
      logger.error("Ошибка сохранения окончания", error);
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
      logger.error("Ошибка получения циклов", error);
      return ctx.reply("Не получилось загрузить данные.");
    }

    if (!cycles || cycles.length === 0) {
      return ctx.reply(cFor(user).noData, mainKeyboard(user));
    }

    const prediction = predictCycle(cycles, user);

    if (!prediction) {
      return ctx.reply("Не получилось построить прогноз.");
    }

    return ctx.reply(formatPrediction(prediction, user.language), mainKeyboard(user));
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
      logger.error("Ошибка поиска партнёрши", userError);
      return ctx.reply("Не получилось найти данные партнёрши.");
    }

    const { data: partnerCycles, error } = await getUserCycles(partnerUser.id);

    if (error) {
      logger.error("Ошибка получения цикла партнёрши", error);
      return ctx.reply("Не получилось загрузить данные.");
    }

    if (!partnerCycles?.length) {
      return ctx.reply("Пока у партнёрши нет записей о цикле.");
    }

    const prediction = predictCycle(partnerCycles, partnerUser);
    return ctx.reply(
      formatPrediction(prediction, user.language, { partner: true }),
      mainKeyboard(user),
    );
  });

  bot.hears("↩️ Отменить последнюю запись", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const { data: lastCycle, error } = await getLastCycle(user.id);

    if (error) {
      logger.error("Ошибка поиска последней записи", error);
      return ctx.reply("Не получилось найти последнюю запись.");
    }

    if (!lastCycle) {
      return ctx.reply("Пока нечего отменять.");
    }

    if (!lastCycle.period_end) {
      const { error: deleteError } = await deleteCycle(lastCycle.id);

      if (deleteError) {
        logger.error("Ошибка удаления", deleteError);
        return ctx.reply("Не получилось отменить запись.");
      }

      return ctx.reply(
        `Отменила начало 🌙\n\nУдалено: ${lastCycle.period_start}`,
      );
    }

    const { error: updateError } = await reopenCycle(lastCycle.id);

    if (updateError) {
      logger.error("Ошибка отката окончания", updateError);
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

  if (await requireHealthConsent(ctx, user)) {
    await ctx.answerCbQuery();
    return;
  }

  if (selectedDate > getToday(user.timezone)) {
    await ctx.answerCbQuery("Нельзя выбрать дату из будущего");
    return;
  }

  if (state.action === "calendar_start") {
    const { data: openedCycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      logger.error("Ошибка поиска открытого цикла", findError);
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
      logger.error("Ошибка сохранения начала", error);
      await ctx.answerCbQuery();
      return ctx.reply("Не получилось сохранить дату.");
    }

    await notifyPartnersCycleStarted(ctx.telegram, user.id);

    delete userStates[ctx.from.id];

    await ctx.answerCbQuery("Дата выбрана");
    await ctx.editMessageText(`Выбрана дата начала: ${selectedDate}`);

    return ctx.reply(cFor(user).started(selectedDate), mainKeyboard(user));
  }

  if (state.action === "calendar_end") {
    const { data: cycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      logger.error("Ошибка поиска открытого цикла", findError);
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
      logger.error("Ошибка сохранения окончания", error);
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
