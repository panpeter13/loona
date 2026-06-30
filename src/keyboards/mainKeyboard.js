const { Markup } = require("telegraf");

const mainKeyboard = Markup.keyboard([
  ["🌙 Начались месячные", "✅ Закончились"],
  ["✍️ Указать дату начала", "✍️ Указать дату окончания"],
  ["📅 Мой цикл", "💕 Цикл партнёрши"],
  ["👤 Режим", "⚙️ Настройки"],
  ["❓ Помощь", "ℹ️ О LOONA"],
  ["↩️ Отменить последнюю запись"],
  ["🗑 Удалить мои данные"],
]).resize();

const cancelKeyboard = Markup.keyboard([["❌ Отмена"]]).resize();

const settingsKeyboard = Markup.keyboard([
  ["Цикл 21", "Цикл 28", "Цикл 30"],
  ["Цикл 35", "Месячные 3", "Месячные 5"],
  ["Месячные 7", "⬅️ Назад"],
]).resize();

const modeKeyboard = Markup.keyboard([
  ["🌙 Свой цикл"],
  ["🤝 Партнёр"],
  ["⬅️ Назад"],
]).resize();

const aboutKeyboard = Markup.keyboard([
  ["📢 Новости", "❤️ Поддержать проект"],
  ["🐞 Сообщить об ошибке", "💡 Предложить идею"],
  ["⬅️ Назад"],
]).resize();

module.exports = {
  mainKeyboard,
  cancelKeyboard,
  settingsKeyboard,
  modeKeyboard,
  aboutKeyboard,
};
