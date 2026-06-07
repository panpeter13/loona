const dbService = require("../database/dbService");
const dateUtils = require("../utils/dateUtils");
const { Markup } = require("telegraf");

// Импортируем клавиатуры, чтобы интерфейс оставался согласованным
const mainKeyboard = Markup.keyboard([
  ["🌙 Начались месячные", "✅ Закончились"],
  ["✍️ Указать дату начала", "✍️ Указать дату окончания"],
  ["📅 Мой цикл", "🩺 Симптомы"],
  ["⚙️ Настройки", "↩️ Отменить последнюю запись"],
  ["📤 Экспорт данных", "🗑 Удалить мои данные"],
  ["❓ Помощь"],
]).resize();

const cancelKeyboard = Markup.keyboard([["❌ Отмена"]]).resize();

/**
 * Кнопка: 🌙 Начались месячные
 */
async function handlePeriodStart(ctx) {
  const user = await dbService.getOrCreateUser(ctx.from.id);
  if (!user) return ctx.reply("Не получилось найти или создать профиль.");

  const today = dateUtils.getToday();

  const { data: openedCycle, error: findError } = await dbService.getOpenCycle(
    user.id,
  );
  if (findError) {
    console.error("Ошибка поиска открытого цикла:", findError);
    return ctx.reply("Не получилось проверить текущий цикл.");
  }

  if (openedCycle) {
    return ctx.reply(
      `Уже есть открытая запись 🌙\n\nНачало: ${openedCycle.period_start}\n\nСначала нажмите ✅ Закончились или ↩️ Отменить последнюю запись.`,
    );
  }

  const { error } = await dbService.createCycle(user, today);
  if (error) {
    console.error("Ошибка сохранения начала:", error);
    return ctx.reply("Не получилось сохранить дату.");
  }

  ctx.reply(`Записала начало: ${today} 🌙`);
}

/**
 * Кнопка: ✅ Закончились
 */
async function handlePeriodEnd(ctx) {
  const user = await dbService.getOrCreateUser(ctx.from.id);
  if (!user) return ctx.reply("Не получилось найти профиль.");

  const today = dateUtils.getToday();

  const { data: cycle, error: findError } = await dbService.getOpenCycle(
    user.id,
  );
  if (findError) {
    console.error("Ошибка поиска открытого цикла:", findError);
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

  const { error } = await dbService.closeCycle(cycle.id, today);
  if (error) {
    console.error("Ошибка сохранения окончания:", error);
    return ctx.reply("Не получилось сохранить дату окончания.");
  }

  ctx.reply(`Записала окончание: ${today} ✅`);
}

/**
 * Кнопка: 📅 Мой цикл (Расчет прогнозов с использованием утилит дат)
 */
async function handleMyCycle(ctx) {
  const user = await dbService.getOrCreateUser(ctx.from.id);
  if (!user) return ctx.reply("Не получилось найти профиль.");

  const { data: lastCycle, error } = await dbService.getLastCycle(user.id);
  if (error) {
    console.error("Ошибка получения цикла:", error);
    return ctx.reply("Не получилось загрузить данные.");
  }

  if (!lastCycle) {
    return ctx.reply("Пока данных нет. Отметьте начало месячных 🌙");
  }

  const cycleLength = lastCycle.cycle_length || user.cycle_length || 28;
  const periodLength = lastCycle.period_length || user.period_length || 5;

  // Используем нашу изолированную математику дат из dateUtils
  const nextPeriodStart = dateUtils.addDays(
    lastCycle.period_start,
    cycleLength,
  );
  const nextPeriodEnd = dateUtils.addDays(nextPeriodStart, periodLength - 1);
  const ovulationDate = dateUtils.addDays(nextPeriodStart, -14);
  const fertileStart = dateUtils.addDays(ovulationDate, -5);
  const fertileEnd = dateUtils.addDays(ovulationDate, 1);

  ctx.reply(
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
}

/**
 * Кнопка: ↩️ Отменить последнюю запись
 */
async function handleCancelLastRecord(ctx) {
  const user = await dbService.getOrCreateUser(ctx.from.id);
  if (!user) return ctx.reply("Не получилось найти профиль.");

  const { data: lastCycle, error } = await dbService.getLastCycle(user.id);
  if (error) {
    console.error("Ошибка поиска последней записи:", error);
    return ctx.reply("Не получилось найти последнюю запись.");
  }

  if (!lastCycle) {
    return ctx.reply("Пока нечего отменять.");
  }

  if (!lastCycle.period_end) {
    const { error: deleteError } = await dbService.deleteCycle(lastCycle.id);
    if (deleteError) {
      console.error("Ошибка удаления:", deleteError);
      return ctx.reply("Не получилось отменить запись.");
    }
    return ctx.reply(
      `Отменила начало 🌙\n\nУдалено: ${lastCycle.period_start}`,
    );
  }

  const { error: updateError } = await dbService.updatePeriodEnd(
    lastCycle.id,
    null,
  );
  if (updateError) {
    console.error("Ошибка отката окончания:", updateError);
    return ctx.reply("Не получилось отменить окончание.");
  }

  ctx.reply(
    `Отменила окончание ✅\n\nНачало осталось: ${lastCycle.period_start}`,
  );
}

/**
 * Инициализация текстовых режимов (стейтов) для ручного ввода дат
 */
function handleManualStartRequest(ctx, userStates) {
  userStates[ctx.from.id] = { action: "manual_start" };
  ctx.reply(
    "Введите дату начала в формате:\n\n2026-06-04\nили\n04.06.2026",
    cancelKeyboard,
  );
}

function handleManualEndRequest(ctx, userStates) {
  userStates[ctx.from.id] = { action: "manual_end" };
  ctx.reply(
    "Введите дату окончания в формате:\n\n2026-06-04\nили\n04.06.2026",
    cancelKeyboard,
  );
}

module.exports = {
  handlePeriodStart,
  handlePeriodEnd,
  handleMyCycle,
  handleCancelLastRecord,
  handleManualStartRequest,
  handleManualEndRequest,
  mainKeyboard,
  cancelKeyboard,
};
