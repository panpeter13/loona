const {
  response,
  localizedResponse,
  consentResponse,
  settingsResponse,
  deleteConfirmationResponse,
  languageResponse,
  partnerModeResponse,
  feedbackResponse,
  languageOf,
} = require("./responses");
const {
  getOrCreateKakaoUser,
  recordHealthDataConsent,
  updateCycleLength,
  updatePeriodLength,
  updateLanguage,
} = require("../services/userService");
const {
  getLastCycle,
  getOpenCycle,
  createCycle,
  closeCycle,
  deleteCycle,
  reopenCycle,
  getUserCycles,
} = require("../services/cycleService");
const { predictCycle } = require("../services/predictionService");
const { formatPrediction } = require("../services/predictionText");
const { getDashboardText } = require("../services/dashboardService");
const { getToday, parseDate, isValidDate, isFutureDate } = require("../utils/dateUtils");
const { deleteUserData } = require("../services/dataDeletionService");
const { enablePersonalMode, enablePartnerMode, connectPartner } = require("../services/partnerService");
const {
  trackEvent, markActive, markOnboardingComplete, markFirstCycle, saveAttribution,
} = require("../services/analyticsService");
const { saveFeedback } = require("../services/feedbackService");

const TEXT = {
  ru: {
    welcome: "Здравствуйте! Я LOONA 🌙\n\nПомогу бережно и безопасно вести цикл.\n\nПрогноз приблизительный и не является медицинской рекомендацией.",
    help: "LOONA умеет:\n\n🌙 Начать цикл — записать начало\n✅ Завершить — записать окончание\n✨ Главная — текущий статус\n📅 Мой цикл — прогноз периода и овуляции\n🤝 Партнёр — подключить близкого по коду\n💬 Отзыв — пожелание или сообщение об ошибке\n⚙️ Настройки — длина цикла и периода\n🌐 Язык — русский, English, 한국어\n↩️ Отменить запись — исправить ошибку\n🔒 Приватность — обработка данных\n🗑 Удалить данные — полное удаление\n\nМожно указать дату: Начать цикл 2026-07-29",
    news: "📰 Новости LOONA\n\nМы с любовью и заботой развиваем LOONA, уделяя особое внимание вашему комфорту, приватности и спокойствию 💜\n\nВ планах:\n• китайский и вьетнамский языки\n• бережные AI-пояснения\n• более персональные прогнозы\n• запись симптомов и самочувствия\n• удобные напоминания\n• экспорт, удаление данных и усиление защиты\n\nAI и прогнозы носят справочный характер и не заменяют врача.",
    noUser: "Не удалось загрузить профиль. Попробуйте ещё раз.",
    consentSaved: "Согласие сохранено. Теперь можно вести записи ✅",
    dateFormat: "Проверьте формат даты. Пример: 2026-07-29",
    future: "Будущую дату записать нельзя.",
    openExists: (d) => `Уже есть открытая запись.\n\nНачало: ${d}`,
    noOpen: "Нет открытой записи. Сначала отметьте начало 🌙",
    startSaved: (d) => `Начало записано: ${d} 🌙`,
    endSaved: (d) => `Окончание записано: ${d} ✅`,
    beforeStart: (d) => `Окончание не может быть раньше начала (${d}).`,
    noCycles: "Пока записей нет. Сначала отметьте начало цикла 🌙",
    cycleRange: "Длина цикла должна быть от 15 до 60 дней.",
    periodRange: "Длительность периода должна быть от 1 до 14 дней.",
    deleted: "Все данные удалены. Спасибо, что пользовались LOONA.",
    undoNone: "Нет записи, которую можно отменить.",
    undoStart: (d) => `Последняя запись начала ${d} удалена ↩️`,
    undoEnd: (d) => `Окончание ${d} отменено. Запись снова открыта ↩️`,
    privacy: "🔒 Приватность\n\nLOONA хранит обезличенный идентификатор, настройки и даты цикла только для работы сервиса. Данные не продаются третьим лицам.",
    about: "🌙 LOONA Beta 1.4.0\n\nНезависимый бот для бережного и приватного ведения цикла. Прогноз не является медицинской рекомендацией.",
    ownMode: (code) => `Свой профиль включён 🌙\n\nКод для партнёра: ${code}\n\nЕго можно ввести в LOONA в Telegram или Kakao. Передавайте код только человеку, которому доверяете.`,
    enterCode: "Введите код сообщением в формате: Код ABC123",
    linked: "Готово 🤝 Вы подключены. Вам доступна только сводка цикла без личных заметок.",
    codeMissing: "Код не найден. Проверьте его и попробуйте ещё раз.",
    selfLink: "Нельзя подключить профиль к самому себе.",
    partnerReadonly: "В режиме партнёра записи нельзя изменять. Вам доступна только бережная сводка.",
    feedbackIdea: "Напишите пожелание следующим сообщением в формате:\n\nПожелание: ваш текст",
    feedbackBug: "Опишите проблему следующим сообщением в формате:\n\nОшибка: что произошло",
    feedbackSaved: "Спасибо 💜 Ваш отзыв сохранён и поможет сделать LOONA лучше.",
    unknown: "Выберите нужную функцию кнопкой ниже.",
  },
  en: {
    welcome: "Hi, I’m LOONA 🌙\n\nI’ll help you track your cycle safely and comfortably.\n\nEstimates are approximate and are not medical advice.",
    help: "LOONA can help with:\n\n🌙 Start cycle — save a start date\n✅ Finish — save an end date\n✨ Home — current status\n📅 My cycle — period and ovulation estimate\n💬 Feedback — send a suggestion or report a bug\n⚙️ Settings — cycle and period length\n🌐 Language — Русский, English, 한국어\n↩️ Undo entry — correct a mistake\n🔒 Privacy — data information\n🗑 Delete data — permanently erase everything\n\nYou can include a date: Start cycle 2026-07-29",
    news: "📰 LOONA News\n\nWe are building LOONA with love and care for your comfort, privacy, and peace of mind 💜\n\nComing next:\n• Chinese and Vietnamese\n• thoughtful AI explanations\n• more personalized estimates\n• symptom and wellbeing tracking\n• convenient reminders\n• export, deletion, and stronger privacy\n\nAI features and estimates are informational and do not replace medical advice.",
    noUser: "Could not load your profile. Please try again.",
    consentSaved: "Consent saved. You can now track your cycle ✅",
    dateFormat: "Check the date format. Example: 2026-07-29",
    future: "A future date cannot be recorded.",
    openExists: (d) => `There is already an open record.\n\nStart: ${d}`,
    noOpen: "There is no open record. Save a start date first 🌙",
    startSaved: (d) => `Start date saved: ${d} 🌙`,
    endSaved: (d) => `End date saved: ${d} ✅`,
    beforeStart: (d) => `The end date cannot be before the start (${d}).`,
    noCycles: "No records yet. Save a cycle start first 🌙",
    cycleRange: "Cycle length must be between 15 and 60 days.",
    periodRange: "Period length must be between 1 and 14 days.",
    deleted: "All data has been deleted. Thank you for using LOONA.",
    undoNone: "There is no entry to undo.",
    undoStart: (d) => `The latest start entry (${d}) was deleted ↩️`,
    undoEnd: (d) => `The end date (${d}) was undone. The record is open again ↩️`,
    privacy: "🔒 Privacy\n\nLOONA stores an anonymized identifier, settings, and cycle dates only to provide the service. Data is not sold to third parties.",
    about: "🌙 LOONA Beta 1.4.0\n\nAn independent, privacy-minded cycle tracking bot. Estimates are not medical advice.",
    ownMode: (code) => `Personal profile enabled 🌙\n\nPartner code: ${code}\n\nIt can be entered in LOONA on Telegram or Kakao. Share it only with someone you trust.`,
    enterCode: "Send the code in this format: Code ABC123",
    linked: "Connected 🤝 You can only see the cycle summary, without private notes.",
    codeMissing: "Code not found. Check it and try again.",
    selfLink: "You cannot connect a profile to itself.",
    partnerReadonly: "Records cannot be changed in partner mode. Only a limited cycle summary is available.",
    feedbackIdea: "Send your suggestion in this format:\n\nSuggestion: your message",
    feedbackBug: "Describe the problem in this format:\n\nBug: what happened",
    feedbackSaved: "Thank you 💜 Your feedback was saved and will help improve LOONA.",
    unknown: "Choose a function using the buttons below.",
  },
  ko: {
    welcome: "안녕하세요, LOONA예요 🌙\n\n주기를 편안하고 안전하게 기록할 수 있도록 도와드려요.\n\n예측은 참고용이며 의료 조언이 아닙니다.",
    help: "LOONA 기능\n\n🌙 주기 시작 — 시작일 기록\n✅ 생리 종료 — 종료일 기록\n✨ 홈 — 현재 상태\n📅 내 주기 — 생리 및 배란일 예측\n💬 의견 — 기능 제안 또는 오류 신고\n⚙️ 설정 — 주기와 생리 기간\n🌐 언어 — Русский, English, 한국어\n↩️ 최근 기록 취소 — 잘못된 기록 수정\n🔒 개인정보 — 데이터 처리 안내\n🗑 내 데이터 삭제 — 모든 기록 삭제\n\n날짜 입력 예: 주기 시작 2026-07-29",
    news: "📰 LOONA 소식\n\nLOONA는 여러분의 편안함과 개인정보 보호, 마음의 안정을 생각하며 사랑과 정성으로 만들고 있어요 💜\n\n앞으로 준비하고 있는 기능:\n• 中文 및 Tiếng Việt 지원\n• 기록을 쉽게 이해하도록 돕는 AI 설명\n• 더 개인화된 주기 예측\n• 증상과 컨디션 기록\n• 편리한 맞춤 알림\n• 데이터 내보내기, 완전 삭제, 더 강력한 개인정보 보호\n\nAI 기능과 예측은 참고용이며 의료 진단이나 조언을 대신하지 않습니다.",
    noUser: "프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    consentSaved: "동의가 저장됐어요. 이제 주기를 기록할 수 있어요 ✅",
    dateFormat: "날짜 형식을 확인해 주세요. 예: 2026-07-29",
    future: "미래 날짜는 기록할 수 없어요.",
    openExists: (d) => `이미 진행 중인 기록이 있어요.\n\n시작일: ${d}`,
    noOpen: "진행 중인 기록이 없어요. 먼저 시작일을 기록해 주세요 🌙",
    startSaved: (d) => `시작일을 기록했어요: ${d} 🌙`,
    endSaved: (d) => `종료일을 기록했어요: ${d} ✅`,
    beforeStart: (d) => `종료일은 시작일(${d})보다 빠를 수 없어요.`,
    noCycles: "아직 기록이 없어요. 주기 시작일을 먼저 기록해 주세요 🌙",
    cycleRange: "주기는 15일부터 60일 사이로 설정해 주세요.",
    periodRange: "생리 기간은 1일부터 14일 사이로 설정해 주세요.",
    deleted: "모든 데이터가 삭제됐어요. LOONA를 이용해 주셔서 감사합니다.",
    undoNone: "취소할 기록이 없어요.",
    undoStart: (d) => `최근 시작 기록(${d})을 삭제했어요 ↩️`,
    undoEnd: (d) => `종료일(${d})을 취소했어요. 기록이 다시 열렸어요 ↩️`,
    privacy: "🔒 개인정보 보호\n\nLOONA는 서비스 제공에 필요한 익명화된 식별자, 설정, 주기 날짜만 저장합니다. 데이터는 제3자에게 판매되지 않습니다.",
    about: "🌙 LOONA Beta 1.4.0\n\n개인정보 보호를 중시하는 독립적인 주기 기록 봇이에요. 예측은 의료 조언이 아닙니다.",
    ownMode: (code) => `내 프로필이 설정됐어요 🌙\n\n파트너 코드: ${code}\n\nTelegram 또는 Kakao의 LOONA에서 입력할 수 있어요. 신뢰하는 사람에게만 공유해 주세요.`,
    enterCode: "다음 형식으로 코드를 보내 주세요: 파트너 코드 ABC123",
    linked: "연결됐어요 🤝 개인 메모 없이 주기 요약만 볼 수 있어요.",
    codeMissing: "코드를 찾을 수 없어요. 확인 후 다시 시도해 주세요.",
    selfLink: "자기 자신의 프로필에는 연결할 수 없어요.",
    partnerReadonly: "파트너 모드에서는 기록을 변경할 수 없으며, 제한된 주기 요약만 볼 수 있어요.",
    feedbackIdea: "다음 형식으로 제안을 보내 주세요:\n\n의견: 내용",
    feedbackBug: "다음 형식으로 문제를 알려 주세요:\n\n오류: 발생한 문제",
    feedbackSaved: "감사합니다 💜 의견이 저장되었으며 LOONA를 개선하는 데 활용할게요.",
    unknown: "원하는 기능을 아래 버튼에서 선택해 주세요.",
  },
};

const DEFAULT_DEPS = {
  getOrCreateKakaoUser, recordHealthDataConsent, updateCycleLength,
  updatePeriodLength, updateLanguage, getLastCycle, getOpenCycle, createCycle,
  closeCycle, deleteCycle, reopenCycle, getUserCycles, predictCycle,
  formatPrediction, getDashboardText, deleteUserData,
  enablePersonalMode, enablePartnerMode, connectPartner,
  trackEvent, markActive, markOnboardingComplete, markFirstCycle, saveAttribution,
  saveFeedback,
};

function getKakaoUserId(body) {
  return body?.userRequest?.user?.id || body?.userRequest?.user?.properties?.botUserKey;
}
function getUtterance(body) {
  return String(body?.userRequest?.utterance || body?.action?.name || "").trim();
}
function getActionParam(body, names) {
  for (const name of names) {
    const direct = body?.action?.params?.[name];
    if (direct) return String(direct).trim();
    const detail = body?.action?.detailParams?.[name];
    if (detail?.value || detail?.origin) return String(detail.value || detail.origin).trim();
  }
  return null;
}
function getAttribution(body, utterance) {
  const source = getActionParam(body, ["utm_source", "source"]);
  const campaign = getActionParam(body, ["utm_campaign", "campaign"]);
  const marker = utterance.match(/(?:^|\s)ad[_-]([a-z0-9_-]{1,40})$/i)?.[1];
  return {
    source: source || (marker ? "kakao_moment" : null),
    campaign: campaign || marker || null,
  };
}
function requestedDate(body, utterance, commandPattern, timezone, c) {
  const param = getActionParam(body, ["date", "cycle_date", "period_date", "sys_date"]);
  const fromText = utterance.replace(commandPattern, "").trim()
    .match(/(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})/)?.[1];
  const raw = param || fromText;
  if (!raw) return { date: getToday(timezone) };
  const date = parseDate(raw);
  if (!date || !isValidDate(date)) return { error: c.dateFormat };
  if (isFutureDate(date, timezone)) return { error: c.future };
  return { date };
}
function command(utterance) {
  const exact = new Map([
    ["Главная", "home"], ["Home", "home"], ["홈", "home"],
    ["Помощь", "help"], ["Help", "help"], ["도움말", "help"],
    ["Мой цикл", "forecast"], ["My cycle", "forecast"], ["내 주기", "forecast"],
    ["Настройки", "settings"], ["Settings", "settings"], ["설정", "settings"],
    ["Язык", "language"], ["Language", "language"], ["언어", "language"],
    ["Новости", "news"], ["News", "news"], ["소식", "news"],
    ["Партнёр", "partner"], ["Partner", "partner"], ["파트너", "partner"],
    ["Отзыв", "feedback"], ["Feedback", "feedback"], ["의견", "feedback"],
    ["Пожелание", "feedback-idea"], ["Suggestion", "feedback-idea"], ["기능 제안", "feedback-idea"],
    ["Ошибка", "feedback-bug"], ["Bug", "feedback-bug"], ["오류 신고", "feedback-bug"],
    ["Партнёр: мой профиль", "partner-own"], ["Partner: my profile", "partner-own"], ["파트너: 내 프로필", "partner-own"],
    ["Партнёр: подключиться", "partner-connect"], ["Partner: connect", "partner-connect"], ["파트너: 연결", "partner-connect"],
    ["Приватность", "privacy"], ["Privacy", "privacy"], ["개인정보", "privacy"],
    ["О LOONA", "about"], ["About LOONA", "about"], ["LOONA 소개", "about"],
    ["Отменить запись", "undo"], ["Undo entry", "undo"], ["최근 기록 취소", "undo"],
    ["Удалить данные", "delete"], ["Delete data", "delete"], ["내 데이터 삭제", "delete"],
    ["ПОЛНОЕ УДАЛЕНИЕ", "delete-confirm"], ["DELETE PERMANENTLY", "delete-confirm"], ["데이터 완전 삭제", "delete-confirm"],
    ["Согласие на обработку", "consent"], ["Health data consent", "consent"], ["민감정보 처리 동의", "consent"],
  ]);
  if (exact.has(utterance)) return { name: exact.get(utterance) };
  if (/^(Начать цикл|Start cycle|주기 시작)(?:\s|$)/i.test(utterance)) return { name: "start", pattern: /^(Начать цикл|Start cycle|주기 시작)/i };
  if (/^(Завершить|Finish|생리 종료)(?:\s|$)/i.test(utterance)) return { name: "end", pattern: /^(Завершить|Finish|생리 종료)/i };
  const partnerCode = utterance.match(/^(?:Код|Code|파트너 코드)\s+([A-Z0-9]{6})$/i);
  if (partnerCode) return { name: "partner-code", value: partnerCode[1].toUpperCase() };
  const setting = utterance.match(/^(?:Цикл|Cycle|주기)\s*(\d{2})(?:\s*(?:дн\.?|days?|일))?$/i);
  if (setting) return { name: "cycle-length", value: Number(setting[1]) };
  const period = utterance.match(/^(?:Период|Period|생리)\s*(\d{1,2})(?:\s*(?:дн\.?|days?|일))?$/i);
  if (period) return { name: "period-length", value: Number(period[1]) };
  const feedback = utterance.match(/^(Пожелание|Suggestion|의견|Ошибка|Bug|오류):\s*(.+)$/is);
  if (feedback) return {
    name: "feedback-submit",
    type: /^(Ошибка|Bug|오류)$/i.test(feedback[1]) ? "bug" : "idea",
    value: feedback[2].trim(),
  };
  return { name: "unknown" };
}
function privacyText(c) {
  const url = process.env.PRIVACY_POLICY_URL;
  return `${c.privacy}${url ? `\n\n${url}` : ""}`;
}

async function handleKakaoSkill(body, dependencies = {}) {
  const deps = { ...DEFAULT_DEPS, ...dependencies };
  const id = getKakaoUserId(body);
  if (!id) return response(TEXT.ko.noUser);
  let user = await deps.getOrCreateKakaoUser(id);
  if (!user) return response(TEXT.ko.noUser);
  const utterance = getUtterance(body);
  const attribution = getAttribution(body, utterance);
  await deps.markActive(user.id);
  if (attribution.source || attribution.campaign) {
    await deps.saveAttribution(user, attribution.source, attribution.campaign);
  }
  if (user._isNew) await deps.trackEvent(user, "signup", attribution);
  const lang = languageOf(user);
  const c = TEXT[lang];

  const languageMatch = utterance.match(/^(?:Язык русский|Language English|언어 한국어)$/);
  if (languageMatch) {
    const language = utterance.includes("русский") ? "ru" : utterance.includes("English") ? "en" : "ko";
    const { error } = await deps.updateLanguage(user.id, language);
    if (!error) user = { ...user, language };
    if (!error) {
      await deps.markOnboardingComplete(user.id);
      await deps.trackEvent(user, "onboarding_completed", attribution);
    }
    return localizedResponse(TEXT[language].welcome, user);
  }
  if (user.language === "select") return languageResponse();
  if (!utterance || /^(старт|start|시작|처음|안녕)(?:\s+ad[_-][a-z0-9_-]{1,40})?$/i.test(utterance)) {
    return localizedResponse(c.welcome, user);
  }
  const action = command(utterance);
  if (action.name === "language") return languageResponse();
  if (action.name === "news") return localizedResponse(c.news, user);
  if (action.name === "partner") return partnerModeResponse(user);
  if (action.name === "feedback") return feedbackResponse(user);
  if (action.name === "feedback-idea") return localizedResponse(c.feedbackIdea, user);
  if (action.name === "feedback-bug") return localizedResponse(c.feedbackBug, user);
  if (action.name === "feedback-submit") {
    const { error } = await deps.saveFeedback(user.id, action.type, action.value);
    if (!error) await deps.trackEvent(user, "feedback_submitted", attribution);
    return localizedResponse(error ? c.noUser : c.feedbackSaved, user);
  }
  if (action.name === "partner-own") {
    const { error, partnerCode } = await deps.enablePersonalMode(user);
    if (error) return localizedResponse(c.noUser, user);
    user = { ...user, mode: "female", linked_user_id: null, partner_code: partnerCode };
    await deps.trackEvent(user, "partner_code_created", attribution);
    return localizedResponse(c.ownMode(partnerCode), user);
  }
  if (action.name === "partner-connect") {
    const { error } = await deps.enablePartnerMode(user.id);
    if (error) return localizedResponse(c.noUser, user);
    user = { ...user, mode: "partner", linked_user_id: null };
    return localizedResponse(c.enterCode, user);
  }
  if (action.name === "partner-code") {
    const result = await deps.connectPartner(user, action.value);
    if (result.error) return localizedResponse(c.noUser, user);
    if (result.notFound) return localizedResponse(c.codeMissing, user);
    if (result.self) return localizedResponse(c.selfLink, user);
    user = { ...user, mode: "partner", linked_user_id: true };
    await deps.trackEvent(user, "partner_connected", attribution);
    return localizedResponse(c.linked, user);
  }
  if (user.mode === "partner" && ["start", "end", "settings", "cycle-length", "period-length", "undo"].includes(action.name)) {
    return localizedResponse(c.partnerReadonly, user);
  }
  if (action.name === "help") return localizedResponse(c.help, user);
  if (action.name === "privacy") return localizedResponse(privacyText(c), user);
  if (action.name === "about") return localizedResponse(c.about, user);
  if (action.name === "consent") {
    const { data, error } = await deps.recordHealthDataConsent(user.id);
    return localizedResponse(error || !data ? c.noUser : c.consentSaved, user);
  }
  if (action.name === "home") {
    try { return localizedResponse(await deps.getDashboardText(user), user); }
    catch { return localizedResponse(c.noUser, user); }
  }
  if (action.name === "start") {
    if (!user.health_data_consent_at) return consentResponse(user);
    const { data: open, error } = await deps.getOpenCycle(user.id);
    if (error) return localizedResponse(c.noUser, user);
    if (open) return localizedResponse(c.openExists(open.period_start), user);
    const requested = requestedDate(body, utterance, action.pattern, user.timezone, c);
    if (requested.error) return localizedResponse(requested.error, user);
    const { error: createError } = await deps.createCycle(user, requested.date);
    if (!createError) {
      await deps.trackEvent(user, "cycle_recorded", attribution);
      if (!user.first_cycle_recorded_at) {
        await deps.markFirstCycle(user.id);
        await deps.trackEvent(user, "first_cycle_recorded", attribution);
      }
    }
    return localizedResponse(createError ? c.noUser : c.startSaved(requested.date), user);
  }
  if (action.name === "end") {
    if (!user.health_data_consent_at) return consentResponse(user);
    const { data: open, error } = await deps.getOpenCycle(user.id);
    if (error) return localizedResponse(c.noUser, user);
    if (!open) return localizedResponse(c.noOpen, user);
    const requested = requestedDate(body, utterance, action.pattern, user.timezone, c);
    if (requested.error) return localizedResponse(requested.error, user);
    if (requested.date < open.period_start) return localizedResponse(c.beforeStart(open.period_start), user);
    const { error: closeError } = await deps.closeCycle(open.id, requested.date);
    return localizedResponse(closeError ? c.noUser : c.endSaved(requested.date), user);
  }
  if (action.name === "forecast") {
    if (!user.health_data_consent_at) return consentResponse(user);
    const { data: cycles, error } = await deps.getUserCycles(user.id);
    if (error) return localizedResponse(c.noUser, user);
    if (!cycles?.length) return localizedResponse(c.noCycles, user);
    const prediction = deps.predictCycle(cycles, user);
    return localizedResponse(prediction ? deps.formatPrediction(prediction, lang) : c.noUser, user);
  }
  if (action.name === "settings") return settingsResponse(user);
  if (action.name === "cycle-length") {
    if (action.value < 15 || action.value > 60) return localizedResponse(c.cycleRange, user);
    const { error } = await deps.updateCycleLength(user.id, action.value);
    return error ? localizedResponse(c.noUser, user) : settingsResponse({ ...user, cycle_length: action.value });
  }
  if (action.name === "period-length") {
    if (action.value < 1 || action.value > 14) return localizedResponse(c.periodRange, user);
    const { error } = await deps.updatePeriodLength(user.id, action.value);
    return error ? localizedResponse(c.noUser, user) : settingsResponse({ ...user, period_length: action.value });
  }
  if (action.name === "undo") {
    const { data: last, error } = await deps.getLastCycle(user.id);
    if (error) return localizedResponse(c.noUser, user);
    if (!last) return localizedResponse(c.undoNone, user);
    if (last.period_end) {
      const { error: undoError } = await deps.reopenCycle(last.id);
      return localizedResponse(undoError ? c.noUser : c.undoEnd(last.period_end), user);
    }
    const { error: undoError } = await deps.deleteCycle(last.id);
    return localizedResponse(undoError ? c.noUser : c.undoStart(last.period_start), user);
  }
  if (action.name === "delete") return deleteConfirmationResponse(user);
  if (action.name === "delete-confirm") {
    try {
      await deps.deleteUserData(user.id);
      return localizedResponse(c.deleted, user, [["Start again", "start"]]);
    } catch { return localizedResponse(c.noUser, user); }
  }
  return localizedResponse(c.unknown, user);
}

module.exports = {
  handleKakaoSkill, getKakaoUserId, getUtterance, getActionParam, command,
};
