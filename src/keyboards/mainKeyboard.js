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

module.exports = {
  mainKeyboard,
  cancelKeyboard,
};
