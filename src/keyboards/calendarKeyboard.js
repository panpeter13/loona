const { Markup } = require("telegraf");

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function getCalendarKeyboard(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();

  let startWeekDay = firstDay.getDay();
  startWeekDay = startWeekDay === 0 ? 7 : startWeekDay;

  const buttons = [];

  buttons.push([
    Markup.button.callback(`${monthNames[month]} ${year}`, `calendar_ignore`),
  ]);

  buttons.push([
    Markup.button.callback("Пн", "calendar_ignore"),
    Markup.button.callback("Вт", "calendar_ignore"),
    Markup.button.callback("Ср", "calendar_ignore"),
    Markup.button.callback("Чт", "calendar_ignore"),
    Markup.button.callback("Пт", "calendar_ignore"),
    Markup.button.callback("Сб", "calendar_ignore"),
    Markup.button.callback("Вс", "calendar_ignore"),
  ]);

  let week = [];

  for (let i = 1; i < startWeekDay; i++) {
    week.push(Markup.button.callback(" ", "calendar_ignore"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    week.push(
      Markup.button.callback(String(day), `calendar_day:${dateString}`),
    );

    if (week.length === 7) {
      buttons.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(Markup.button.callback(" ", "calendar_ignore"));
    }

    buttons.push(week);
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  buttons.push([
    Markup.button.callback(
      "⬅️",
      `calendar_month:${prevMonth.getFullYear()}:${prevMonth.getMonth()}`,
    ),
    Markup.button.callback("Сегодня", "calendar_today"),
    Markup.button.callback(
      "➡️",
      `calendar_month:${nextMonth.getFullYear()}:${nextMonth.getMonth()}`,
    ),
  ]);

  buttons.push([Markup.button.callback("❌ Отмена", "calendar_cancel")]);

  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  getCalendarKeyboard,
};
