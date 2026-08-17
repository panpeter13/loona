const COPY = {
  ru: {
    quick: [
      ["✨ Главная", "Главная"],
      ["🌙 Начать цикл", "Начать цикл"],
      ["✅ Завершить", "Завершить"],
      ["📅 Мой цикл", "Мой цикл"],
      ["⚙️ Настройки", "Настройки"],
      ["❓ Помощь", "Помощь"],
      ["🌐 Язык", "Язык"],
      ["📰 Новости", "Новости"],
      ["🤝 Партнёр", "Партнёр"],
      ["💬 Отзыв", "Отзыв"],
    ],
    partnerQuick: [["✨ Статус", "Главная"], ["🤝 Партнёр", "Партнёр"], ["🌐 Язык", "Язык"], ["📰 Новости", "Новости"], ["💬 Отзыв", "Отзыв"], ["❓ Помощь", "Помощь"]],
    consent:
      "Даты цикла могут относиться к чувствительным данным о здоровье. LOONA использует их только для ведения записей и прогноза. Ознакомьтесь с политикой конфиденциальности и подтвердите согласие.",
    consentButtons: [["Согласна", "Согласие на обработку"], ["Политика", "Приватность"]],
    homeButton: ["⬅️ Назад", "Главная"],
    settings: (u) =>
      `⚙️ Настройки\n\nСредняя длина цикла: ${u.cycle_length || 28} дн.\nСредняя длительность периода: ${u.period_length || 5} дн.\nЧасовой пояс: ${u.timezone || "Asia/Seoul"}\n\nВыберите значение.`,
    settingsButtons: [
      ["Цикл 28", "Цикл 28"], ["Цикл 30", "Цикл 30"],
      ["Период 5", "Период 5"], ["Период 7", "Период 7"],
      ["Отменить запись", "Отменить запись"], ["Удалить данные", "Удалить данные"],
      ["⬅️ Главное меню", "Главная"],
    ],
    deletePrompt:
      "Удалить все данные?\n\nПрофиль, записи цикла, симптомы, уведомления и отзывы будут удалены без возможности восстановления.",
    deleteButtons: [["Удалить навсегда", "ПОЛНОЕ УДАЛЕНИЕ"], ["⬅️ Отмена", "Главная"]],
  },
  en: {
    quick: [
      ["✨ Home", "Home"],
      ["🌙 Start cycle", "Start cycle"],
      ["✅ Finish", "Finish"],
      ["📅 My cycle", "My cycle"],
      ["⚙️ Settings", "Settings"],
      ["❓ Help", "Help"],
      ["🌐 Language", "Language"],
      ["📰 News", "News"],
      ["🤝 Partner", "Partner"],
      ["💬 Feedback", "Feedback"],
    ],
    partnerQuick: [["✨ Status", "Home"], ["🤝 Partner", "Partner"], ["🌐 Language", "Language"], ["📰 News", "News"], ["💬 Feedback", "Feedback"], ["❓ Help", "Help"]],
    consent:
      "Cycle dates may be sensitive health data. LOONA uses them only for cycle tracking and estimates. Please review the privacy policy and confirm your consent.",
    consentButtons: [["I agree", "Health data consent"], ["Privacy policy", "Privacy"]],
    homeButton: ["⬅️ Back", "Home"],
    settings: (u) =>
      `⚙️ Settings\n\nAverage cycle: ${u.cycle_length || 28} days\nAverage period: ${u.period_length || 5} days\nTime zone: ${u.timezone || "Asia/Seoul"}\n\nChoose a value.`,
    settingsButtons: [
      ["Cycle 28", "Cycle 28"], ["Cycle 30", "Cycle 30"],
      ["Period 5", "Period 5"], ["Period 7", "Period 7"],
      ["Undo entry", "Undo entry"], ["Delete data", "Delete data"],
      ["⬅️ Main menu", "Home"],
    ],
    deletePrompt:
      "Delete all data?\n\nYour profile, cycle records, symptoms, notifications, and feedback will be permanently deleted.",
    deleteButtons: [["Delete permanently", "DELETE PERMANENTLY"], ["⬅️ Cancel", "Home"]],
  },
  ko: {
    quick: [
      ["✨ 홈", "홈"],
      ["🌙 주기 시작", "주기 시작"],
      ["✅ 생리 종료", "생리 종료"],
      ["📅 내 주기", "내 주기"],
      ["⚙️ 설정", "설정"],
      ["❓ 도움말", "도움말"],
      ["🌐 언어", "언어"],
      ["📰 소식", "소식"],
      ["🤝 파트너", "파트너"],
      ["💬 의견", "의견"],
    ],
    partnerQuick: [["✨ 상태", "홈"], ["🤝 파트너", "파트너"], ["🌐 언어", "언어"], ["📰 소식", "소식"], ["💬 의견", "의견"], ["❓ 도움말", "도움말"]],
    consent:
      "주기 날짜는 건강 관련 민감정보에 해당할 수 있어요. LOONA는 주기 기록과 예측 제공을 위해서만 이 정보를 사용합니다. 개인정보 처리방침을 확인하고 처리에 동의해 주세요.",
    consentButtons: [["동의합니다", "민감정보 처리 동의"], ["개인정보 처리방침", "개인정보"]],
    homeButton: ["⬅️ 뒤로", "홈"],
    settings: (u) =>
      `⚙️ 설정\n\n평균 주기: ${u.cycle_length || 28}일\n평균 생리 기간: ${u.period_length || 5}일\n시간대: ${u.timezone || "Asia/Seoul"}\n\n변경할 값을 선택해 주세요.`,
    settingsButtons: [
      ["주기 28일", "주기 28일"], ["주기 30일", "주기 30일"],
      ["생리 5일", "생리 5일"], ["생리 7일", "생리 7일"],
      ["최근 기록 취소", "최근 기록 취소"], ["내 데이터 삭제", "내 데이터 삭제"],
      ["⬅️ 메인 메뉴", "홈"],
    ],
    deletePrompt:
      "정말 모든 데이터를 삭제할까요?\n\n프로필, 주기 기록, 증상, 알림 및 피드백이 영구적으로 삭제되며 복구할 수 없어요.",
    deleteButtons: [["영구 삭제", "데이터 완전 삭제"], ["⬅️ 취소", "홈"]],
  },
};

function languageOf(userOrLanguage) {
  const language =
    typeof userOrLanguage === "string" ? userOrLanguage : userOrLanguage?.language;
  return COPY[language] ? language : "ko";
}

function response(text, quickReplies) {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: (quickReplies || []).map(([label, messageText]) => ({
        action: "message",
        label,
        messageText,
      })),
    },
  };
}

function localizedResponse(text, userOrLanguage, quickReplies) {
  const language = languageOf(userOrLanguage);
  const partnerQuick = typeof userOrLanguage === "object" && userOrLanguage?.mode === "partner"
    ? COPY[language].partnerQuick
    : COPY[language].quick;
  return response(text, quickReplies || partnerQuick);
}

function consentResponse(userOrLanguage) {
  const language = languageOf(userOrLanguage);
  return response(COPY[language].consent, [...COPY[language].consentButtons, COPY[language].homeButton]);
}

function settingsResponse(user) {
  const language = languageOf(user);
  return response(COPY[language].settings(user), COPY[language].settingsButtons);
}

function deleteConfirmationResponse(userOrLanguage) {
  const language = languageOf(userOrLanguage);
  return response(COPY[language].deletePrompt, COPY[language].deleteButtons);
}

function languageResponse(userOrLanguage) {
  const buttons = [
    ["Русский", "Язык русский"],
    ["English", "Language English"],
    ["한국어", "언어 한국어"],
  ];
  const currentLanguage = typeof userOrLanguage === "object" ? userOrLanguage?.language : userOrLanguage;
  if (COPY[currentLanguage]) buttons.push(COPY[currentLanguage].homeButton);
  return response("🌐 언어를 선택해 주세요\nChoose your language\nВыберите язык", buttons);
}

function partnerModeResponse(userOrLanguage) {
  const language = languageOf(userOrLanguage);
  const content = {
    ru: { text: "🤝 Партнёрский режим\n\nВыберите: вести свой цикл и получить код или подключиться по коду партнёра.", buttons: [["🌙 Мой профиль", "Партнёр: мой профиль"], ["🤝 Ввести код", "Партнёр: подключиться"]] },
    en: { text: "🤝 Partner mode\n\nChoose whether to track your own cycle and get a code, or connect using your partner’s code.", buttons: [["🌙 My profile", "Partner: my profile"], ["🤝 Enter code", "Partner: connect"]] },
    ko: { text: "🤝 파트너 모드\n\n내 주기를 기록하고 코드를 받거나, 파트너의 코드로 연결할 수 있어요.", buttons: [["🌙 내 프로필", "파트너: 내 프로필"], ["🤝 코드 입력", "파트너: 연결"]] },
  }[language];
  return response(content.text, [...content.buttons, COPY[language].homeButton]);
}

function feedbackResponse(userOrLanguage) {
  const language = languageOf(userOrLanguage);
  const content = {
    ru: { text: "💬 Помогите сделать LOONA лучше\n\nЧто вы хотите отправить?", buttons: [["💡 Пожелание", "Пожелание"], ["🐞 Ошибка", "Ошибка"]] },
    en: { text: "💬 Help us improve LOONA\n\nWhat would you like to send?", buttons: [["💡 Suggestion", "Suggestion"], ["🐞 Bug", "Bug"]] },
    ko: { text: "💬 LOONA를 더 좋게 만드는 데 도와주세요\n\n어떤 의견을 보내시겠어요?", buttons: [["💡 기능 제안", "기능 제안"], ["🐞 오류 신고", "오류 신고"]] },
  }[language];
  return response(content.text, [...content.buttons, COPY[language].homeButton]);
}

module.exports = {
  COPY,
  response,
  localizedResponse,
  consentResponse,
  settingsResponse,
  deleteConfirmationResponse,
  languageResponse,
  partnerModeResponse,
  feedbackResponse,
  languageOf,
};
