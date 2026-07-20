const { Markup } = require("telegraf");

const labels = {
  ru: {
    dashboard: "✨ Главный экран", start: "🌙 Начался цикл", end: "✅ Завершился",
    manualStart: "✍️ Указать дату начала", manualEnd: "✍️ Указать дату окончания",
    myCycle: "📅 Мой цикл", partnerCycle: "💕 Цикл партнёрши", mode: "👤 Режим",
    settings: "⚙️ Настройки", help: "❓ Помощь", about: "ℹ️ О LOONA",
    undo: "↩️ Отменить последнюю запись", delete: "🗑 Удалить мои данные",
    language: "🌐 Язык", cancel: "❌ Отмена", back: "⬅️ Назад",
    own: "🌙 Свой цикл", partner: "🤝 Партнёр", news: "📢 Новости",
    privacy: "🔒 Приватность", bug: "🐞 Сообщить об ошибке", idea: "💡 Предложить идею",
    period: "Период", cycle: "Цикл",
  },
  en: {
    dashboard: "✨ Dashboard", start: "🌙 Cycle started", end: "✅ Period ended",
    manualStart: "✍️ Enter start date", manualEnd: "✍️ Enter end date",
    myCycle: "📅 My cycle", partnerCycle: "💕 Partner's cycle", mode: "👤 Mode",
    settings: "⚙️ Settings", help: "❓ Help", about: "ℹ️ About LOONA",
    undo: "↩️ Undo last entry", delete: "🗑 Delete my data",
    language: "🌐 Language", cancel: "❌ Cancel", back: "⬅️ Back",
    own: "🌙 My cycle", partner: "🤝 Partner", news: "📢 News",
    privacy: "🔒 Privacy", bug: "🐞 Report a bug", idea: "💡 Suggest an idea",
    period: "Period", cycle: "Cycle",
  },
  ko: {
    dashboard: "✨ 홈", start: "🌙 주기 시작", end: "✅ 생리 종료",
    manualStart: "✍️ 시작일 입력", manualEnd: "✍️ 종료일 입력",
    myCycle: "📅 내 주기", partnerCycle: "💕 파트너 주기", mode: "👤 모드",
    settings: "⚙️ 설정", help: "❓ 도움말", about: "ℹ️ LOONA 소개",
    undo: "↩️ 최근 기록 취소", delete: "🗑 내 데이터 삭제",
    language: "🌐 언어", cancel: "❌ 취소", back: "⬅️ 뒤로",
    own: "🌙 내 주기", partner: "🤝 파트너", news: "📢 소식",
    privacy: "🔒 개인정보", bug: "🐞 오류 신고", idea: "💡 아이디어 제안",
    period: "생리", cycle: "주기",
  },
};

function langOf(userOrLang) {
  const lang = typeof userOrLang === "string" ? userOrLang : userOrLang?.language;
  return labels[lang] ? lang : "ru";
}

function label(key, userOrLang) {
  return labels[langOf(userOrLang)][key];
}

function allLabels(key) {
  return Object.values(labels).map((item) => item[key]);
}

function normalizeText(text) {
  for (const key of Object.keys(labels.ru)) {
    for (const lang of ["en", "ko"]) {
      if (text === labels[lang][key]) return labels.ru[key];
    }
  }
  for (const lang of ["en", "ko"]) {
    if (text.startsWith(`${labels[lang].cycle} `)) {
      return text.replace(labels[lang].cycle, labels.ru.cycle);
    }
    if (text.startsWith(`${labels[lang].period} `)) {
      return text.replace(labels[lang].period, labels.ru.period);
    }
  }
  return text;
}

function mainKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([
    [l.dashboard], [l.start, l.end], [l.manualStart, l.manualEnd],
    [l.myCycle, l.partnerCycle], [l.mode, l.settings], [l.language],
    [l.help, l.about], [l.undo], [l.delete],
  ]).resize();
}

function cancelKeyboard(user) {
  return Markup.keyboard([[label("cancel", user)]]).resize();
}

function settingsKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([
    [`${l.cycle} 21`, `${l.cycle} 28`, `${l.cycle} 30`],
    [`${l.cycle} 35`, `${l.period} 3`, `${l.period} 5`],
    [`${l.period} 7`, l.back],
  ]).resize();
}

function modeKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([[l.own], [l.partner], [l.back]]).resize();
}

function aboutKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([[l.news, l.privacy], [l.bug, l.idea], [l.back]]).resize();
}

const languageKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🇷🇺 Русский", "set_language:ru"),
    Markup.button.callback("🇬🇧 English", "set_language:en"),
    Markup.button.callback("🇰🇷 한국어", "set_language:ko"),
  ],
]);

module.exports = {
  label, allLabels, normalizeText, mainKeyboard, cancelKeyboard, settingsKeyboard,
  modeKeyboard, aboutKeyboard, languageKeyboard,
};
