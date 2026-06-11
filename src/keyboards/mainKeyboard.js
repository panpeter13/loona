const { Markup } = require("telegraf");

const mainKeyboard = Markup.keyboard([
  ["🌙 Начались месячные", "✅ Закончились"],
  ["✍️ Указать дату начала", "✍️ Указать дату окончания"],
  ["📅 Мой цикл", "🩺 Симптомы"],
  ["⚙️ Настройки", "↩️ Отменить последнюю запись"],
  ["📤 Экспорт данных", "🗑 Удалить мои данные"],
  ["❓ Помощь"],
]).resize();

const cancelKeyboard = Markup.keyboard([["❌ Отмена"]]).resize();

const settingsKeyboard = Markup.keyboard([
  ["Цикл 21", "Цикл 28", "Цикл 30"],
  ["Цикл 35", "Месячные 3", "Месячные 5"],
  ["Месячные 7", "⬅️ Назад"],
]).resize();

module.exports = {
  mainKeyboard,
  cancelKeyboard,
  settingsKeyboard,
};
