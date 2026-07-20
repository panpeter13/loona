const { Markup } = require("telegraf");

const localeData = {
  ru: { months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"], week: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], today: "Сегодня", cancel: "❌ Отмена" },
  en: { months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], today: "Today", cancel: "❌ Cancel" },
  ko: { months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"], week: ["월", "화", "수", "목", "금", "토", "일"], today: "오늘", cancel: "❌ 취소" },
};

function getCalendarKeyboard(year, month, language = "ru") {
  const locale = localeData[language] || localeData.ru;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();

  let startWeekDay = firstDay.getDay();
  startWeekDay = startWeekDay === 0 ? 7 : startWeekDay;

  const buttons = [];

  buttons.push([
    Markup.button.callback(`${locale.months[month]} ${year}`, `calendar_ignore`),
  ]);

  buttons.push([
    ...locale.week.map((day) => Markup.button.callback(day, "calendar_ignore")),
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
    Markup.button.callback(locale.today, "calendar_today"),
    Markup.button.callback(
      "➡️",
      `calendar_month:${nextMonth.getFullYear()}:${nextMonth.getMonth()}`,
    ),
  ]);

  buttons.push([Markup.button.callback(locale.cancel, "calendar_cancel")]);

  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  getCalendarKeyboard,
};
