const { Markup } = require("telegraf");

const labels = {
  ru: {
    dashboard: "Главная", start: "🌙 Начать цикл", end: "Завершить",
    manualStart: "Указать дату начала", manualEnd: "Указать дату окончания",
    myCycle: "Мой цикл", partnerCycle: "Цикл партнёрши", mode: "Режим",
    settings: "Настройки", help: "Помощь", about: "О LOONA",
    undo: "Отменить последнюю запись", delete: "Удалить мои данные",
    language: "Язык", cancel: "Отмена", back: "Назад",
    own: "Свой профиль", partner: "Партнёр", news: "Новости",
    privacy: "Приватность", bug: "Сообщить об ошибке", idea: "Предложить идею",
    period: "Период", cycle: "Цикл",
  },
  en: {
    dashboard: "Home", start: "🌙 Start cycle", end: "Finish",
    manualStart: "Enter start date", manualEnd: "Enter end date",
    myCycle: "My cycle", partnerCycle: "Partner's cycle", mode: "Mode",
    settings: "Settings", help: "Help", about: "About LOONA",
    undo: "Undo last entry", delete: "Delete my data",
    language: "Language", cancel: "Cancel", back: "Back",
    own: "Personal profile", partner: "Partner", news: "News",
    privacy: "Privacy", bug: "Report a bug", idea: "Suggest an idea",
    period: "Period", cycle: "Cycle",
  },
  ko: {
    dashboard: "홈", start: "🌙 주기 시작", end: "종료",
    manualStart: "시작일 입력", manualEnd: "종료일 입력",
    myCycle: "내 주기", partnerCycle: "파트너 주기", mode: "모드",
    settings: "설정", help: "도움말", about: "LOONA 소개",
    undo: "최근 기록 취소", delete: "내 데이터 삭제",
    language: "언어", cancel: "취소", back: "뒤로",
    own: "개인 프로필", partner: "파트너", news: "소식",
    privacy: "개인정보", bug: "오류 신고", idea: "아이디어 제안",
    period: "생리", cycle: "주기",
  },
};

const canonical = {
  dashboard: "✨ Главный экран", start: "🌙 Начался цикл", end: "✅ Завершился",
  manualStart: "✍️ Указать дату начала", manualEnd: "✍️ Указать дату окончания",
  myCycle: "📅 Мой цикл", partnerCycle: "💕 Цикл партнёрши", mode: "👤 Режим",
  settings: "⚙️ Настройки", help: "❓ Помощь", about: "ℹ️ О LOONA",
  undo: "↩️ Отменить последнюю запись", delete: "🗑 Удалить мои данные",
  language: "🌐 Язык", cancel: "❌ Отмена", back: "⬅️ Назад",
  own: "🌙 Свой цикл", partner: "🤝 Партнёр", news: "📢 Новости",
  privacy: "🔒 Приватность", bug: "🐞 Сообщить об ошибке", idea: "💡 Предложить идею",
};

function langOf(userOrLang) {
  const lang = typeof userOrLang === "string" ? userOrLang : userOrLang?.language;
  return labels[lang] ? lang : "ru";
}

function label(key, userOrLang) {
  return labels[langOf(userOrLang)][key];
}

function allLabels(key) {
  return [canonical[key]];
}

function normalizeText(text) {
  for (const key of Object.keys(labels.ru)) {
    for (const lang of ["ru", "en", "ko"]) {
      if (text === labels[lang][key]) return canonical[key] || labels.ru[key];
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

function styled(text, style) {
  return style ? { text, style } : { text };
}

function mainKeyboard(user) {
  const l = labels[langOf(user)];

  if (user?.mode === "partner") {
    return Markup.keyboard([
      [styled(l.dashboard, "primary")],
      [styled(l.partnerCycle, "primary")],
      [styled(l.mode), styled(l.language)],
      [styled(l.about), styled(l.help)],
      [styled(l.delete, "danger")],
    ]).resize();
  }

  return Markup.keyboard([
    [styled(l.dashboard, "primary")],
    [styled(l.start, "success"), styled(l.end, "primary")],
    [styled(l.manualStart), styled(l.manualEnd)],
    [styled(l.myCycle), styled(l.partnerCycle)],
    [styled(l.mode), styled(l.settings)],
    [styled(l.language), styled(l.about)],
    [styled(l.help), styled(l.undo)],
    [styled(l.delete, "danger")],
  ]).resize();
}

function cancelKeyboard(user) {
  return Markup.keyboard([[styled(label("cancel", user), "danger")]]).resize();
}

function settingsKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([
    [`${l.cycle} 21`, `${l.cycle} 28`, `${l.cycle} 30`],
    [`${l.cycle} 35`, `${l.period} 3`, `${l.period} 5`],
    [`${l.period} 7`, styled(l.back)],
  ]).resize();
}

function modeKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([[styled(l.own, "primary")], [styled(l.partner)], [styled(l.back)]]).resize();
}

function aboutKeyboard(user) {
  const l = labels[langOf(user)];
  return Markup.keyboard([[styled(l.news), styled(l.privacy)], [styled(l.bug), styled(l.idea)], [styled(l.back)]]).resize();
}

const languageKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("Русский", "set_language:ru"),
    Markup.button.callback("English", "set_language:en"),
    Markup.button.callback("한국어", "set_language:ko"),
  ],
]);

module.exports = {
  label, allLabels, normalizeText, mainKeyboard, cancelKeyboard, settingsKeyboard,
  modeKeyboard, aboutKeyboard, languageKeyboard,
};
