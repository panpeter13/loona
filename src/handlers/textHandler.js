const supabase = require("../database/supabase");

const { mainKeyboard } = require("../keyboards/mainKeyboard");
const { saveFeedback } = require("../services/feedbackService");
const userStates = require("../states/userStates");
const { deleteUserData } = require("../services/dataDeletionService");

const {
  parseDate,
  isValidDate,
  getCycleDays,
  isFutureDate,
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
} = require("../services/cycleService");

function registerTextHandler(bot) {
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const state = userStates[ctx.from.id];

    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    if (state?.action === "feedback_bug" || state?.action === "feedback_idea") {
      const type = state.action === "feedback_bug" ? "bug" : "idea";

      const { error } = await saveFeedback(user.id, type, text);

      if (error) {
        console.log("Ошибка сохранения отзыва:", error);
        return ctx.reply("Не получилось сохранить сообщение.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply(
        "❤️ Спасибо!\n\nВаше сообщение сохранено.",
        mainKeyboard,
      );
    }

    if (state?.action === "enter_partner_code") {
      const code = text.toUpperCase();

      const { data: femaleUser, error: findError } = await supabase
        .from("users")
        .select("*")
        .eq("partner_code", code)
        .eq("mode", "female")
        .maybeSingle();

      if (findError) {
        console.log("Ошибка поиска кода партнёра:", findError);
        return ctx.reply("Не получилось проверить код.");
      }

      if (!femaleUser) {
        return ctx.reply("Код не найден. Проверьте код и попробуйте ещё раз.");
      }

      if (femaleUser.id === user.id) {
        return ctx.reply(
          "Нельзя подключиться к самому себе. Даже бот осуждает.",
        );
      }

      const { error } = await supabase
        .from("users")
        .update({
          mode: "partner",
          linked_user_id: femaleUser.id,
        })
        .eq("id", user.id);

      if (error) {
        console.log("Ошибка привязки партнёра:", error);
        return ctx.reply("Не получилось подключиться.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply("Готово 🤝\n\nВы подключены как партнёр.", mainKeyboard);
    }

    if (state?.action === "manual_start") {
      const date = parseDate(text);

      if (!date || !isValidDate(date)) {
        return ctx.reply(
          "Дата не распознана. Пример: 2026-06-04 или 04.06.2026",
        );
      }

      if (isFutureDate(date)) {
        return ctx.reply(
          "Нельзя указать дату из будущего. Машину времени пока не добавляли.",
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

      if (isFutureDate(date)) {
        return ctx.reply("Нельзя указать дату окончания из будущего.");
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

      try {
        await deleteUserData(user.id);
      } catch (error) {
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

    return ctx.reply("Не поняла команду. Нажмите ❓ Помощь.");
  });
}

module.exports = registerTextHandler;
