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
    const messages = {
      ru: { saved: "❤️ Спасибо!\n\nВаше сообщение сохранено.", linked: "Готово 🤝\n\nВы подключены как партнёр.", deleted: "Все данные удалены 🗑", unknown: "Не поняла команду. Нажмите ❓ Помощь.", cycleSaved: (v) => `Сохранила длину цикла: ${v} дней`, periodSaved: (v) => `Сохранила длительность периода: ${v} дней`, confirm: (w) => `Для подтверждения нужно написать ровно: ${w}` },
      en: { saved: "❤️ Thank you!\n\nYour message has been saved.", linked: "Done 🤝\n\nYou are connected as a partner.", deleted: "All data has been deleted 🗑", unknown: "I didn't understand that. Tap ❓ Help.", cycleSaved: (v) => `Cycle length saved: ${v} days`, periodSaved: (v) => `Period length saved: ${v} days`, confirm: (w) => `To confirm, type exactly: ${w}` },
      ko: { saved: "❤️ 감사합니다!\n\n메시지가 저장됐어요.", linked: "완료됐어요 🤝\n\n파트너로 연결됐어요.", deleted: "모든 데이터가 삭제됐어요 🗑", unknown: "명령을 이해하지 못했어요. ❓ 도움말을 눌러 주세요.", cycleSaved: (v) => `주기 길이를 ${v}일로 저장했어요`, periodSaved: (v) => `생리 기간을 ${v}일로 저장했어요`, confirm: (w) => `확인하려면 정확히 입력해 주세요: ${w}` },
    };
    const c = messages[user?.language] || messages.ru;

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

      return ctx.reply(c.saved, mainKeyboard(user));
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

      return ctx.reply(c.linked, mainKeyboard(user));
    }

    if (state?.action === "manual_start") {
      const date = parseDate(text);

      if (!date || !isValidDate(date)) {
        return ctx.reply(
          "Дата не распознана. Пример: 2026-06-04 или 04.06.2026",
        );
      }

      if (isFutureDate(date, user.timezone)) {
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
          mainKeyboard(user),
        );
      }

      const { error } = await createCycle(user, date);

      if (error) {
        console.log("Ошибка ручного начала:", error);
        return ctx.reply("Не получилось сохранить дату.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply(`Записала начало: ${date} 🌙`, mainKeyboard(user));
    }

    if (state?.action === "manual_end") {
      const date = parseDate(text);

      if (!date || !isValidDate(date)) {
        return ctx.reply(
          "Дата не распознана. Пример: 2026-06-04 или 04.06.2026",
        );
      }

      if (isFutureDate(date, user.timezone)) {
        return ctx.reply("Нельзя указать дату окончания из будущего.");
      }

      const { data: cycle, error: findError } = await getOpenCycle(user.id);

      if (findError) {
        console.log("Ошибка поиска открытого цикла:", findError);
        return ctx.reply("Не получилось проверить текущий цикл.");
      }

      if (!cycle) {
        delete userStates[ctx.from.id];
        return ctx.reply("Нет открытого цикла.", mainKeyboard(user));
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

      return ctx.reply(`Записала окончание: ${date} ✅`, mainKeyboard(user));
    }

    if (state?.action === "confirm_delete") {
      const confirmWord = state.confirmWord || "УДАЛИТЬ";
      if (text !== confirmWord) {
        return ctx.reply(c.confirm(confirmWord));
      }

      try {
        await deleteUserData(user.id);
      } catch (error) {
        console.log("Ошибка удаления данных:", error);
        return ctx.reply("Не получилось удалить данные.");
      }

      delete userStates[ctx.from.id];

      return ctx.reply(c.deleted, mainKeyboard(user));
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

      return ctx.reply(c.cycleSaved(value));
    }

    const periodMatch = text.match(/^период\s+(\d+)$/i);

    if (periodMatch) {
      const value = Number(periodMatch[1]);

      if (value < 1 || value > 14) {
        return ctx.reply("Длительность периода должна быть от 1 до 14 дней.");
      }

      const { error } = await updatePeriodLength(user.id, value);

      if (error) {
        console.log("Ошибка настройки периода:", error);
        return ctx.reply("Не получилось сохранить настройку.");
      }

      return ctx.reply(c.periodSaved(value));
    }

    return ctx.reply(c.unknown, mainKeyboard(user));
  });
}

module.exports = registerTextHandler;
