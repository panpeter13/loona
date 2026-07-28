const {
  response,
  consentResponse,
  settingsResponse,
  deleteConfirmationResponse,
} = require("./responses");
const {
  getOrCreateKakaoUser,
  recordHealthDataConsent,
  updateCycleLength,
  updatePeriodLength,
} = require("../services/userService");
const {
  getOpenCycle,
  createCycle,
  closeCycle,
  getUserCycles,
} = require("../services/cycleService");
const { predictCycle } = require("../services/predictionService");
const { formatPrediction } = require("../services/predictionText");
const {
  getToday,
  parseDate,
  isValidDate,
  isFutureDate,
} = require("../utils/dateUtils");
const { deleteUserData } = require("../services/dataDeletionService");

const WELCOME =
  "안녕하세요, LOONA예요 🌙\n\n주기를 편안하고 안전하게 기록할 수 있도록 도와드려요.\n\n예측은 참고용이며 의료 조언이 아닙니다.";

const HELP =
  "LOONA 기능\n\n🌙 주기 시작 — 시작일 기록\n✅ 생리 종료 — 종료일 기록\n📅 내 주기 — 다음 생리일 예측\n⚙️ 설정 — 평균 주기와 생리 기간 변경\n🔒 개인정보 — 데이터 처리 안내\n🗑 내 데이터 삭제 — 모든 기록 삭제\n\n날짜를 직접 입력하려면 다음처럼 보내 주세요.\n주기 시작 2026-07-29\n생리 종료 2026-08-02";

const DEFAULT_DEPS = {
  getOrCreateKakaoUser,
  recordHealthDataConsent,
  updateCycleLength,
  updatePeriodLength,
  getOpenCycle,
  createCycle,
  closeCycle,
  getUserCycles,
  predictCycle,
  formatPrediction,
  deleteUserData,
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
    const detailedValue = detail?.value || detail?.origin;
    if (detailedValue) return String(detailedValue).trim();
  }
  return null;
}

function getRequestedDate(body, utterance, command, timezone) {
  const fromParam = getActionParam(body, [
    "date",
    "cycle_date",
    "period_date",
    "sys_date",
  ]);
  const fromText = utterance
    .replace(command, "")
    .trim()
    .match(/(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})/)?.[1];
  const rawDate = fromParam || fromText;

  if (!rawDate) return { date: getToday(timezone) };

  const date = parseDate(rawDate);
  if (!date || !isValidDate(date)) {
    return { error: "날짜 형식을 확인해 주세요. 예: 2026-07-29" };
  }
  if (isFutureDate(date, timezone)) {
    return { error: "미래 날짜는 기록할 수 없어요." };
  }
  return { date };
}

function getPrivacyText() {
  const url = process.env.PRIVACY_POLICY_URL;
  const link = url ? `\n\n개인정보 처리방침:\n${url}` : "";
  return `🔒 개인정보 보호\n\nLOONA는 서비스 제공에 필요한 익명화된 사용자 식별자, 설정, 주기 날짜를 저장합니다. 데이터는 제3자에게 판매되지 않으며 설정에서 언제든지 삭제할 수 있습니다.${link}`;
}

async function handleKakaoSkill(body, dependencies = {}) {
  const deps = { ...DEFAULT_DEPS, ...dependencies };
  const kakaoUserId = getKakaoUserId(body);
  if (!kakaoUserId) return response("사용자 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.");

  const user = await deps.getOrCreateKakaoUser(kakaoUserId);
  if (!user) return response("프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");

  const utterance = getUtterance(body);

  if (utterance === "민감정보 처리 동의") {
    const { data, error } = await deps.recordHealthDataConsent(user.id);
    return error || !data
      ? response("동의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : response("동의가 저장됐어요. 이제 주기를 기록할 수 있어요 ✅");
  }

  if (!utterance || /^(시작|처음|안녕|도움말)$/i.test(utterance)) {
    return response(utterance === "도움말" ? HELP : WELCOME);
  }

  if (/^주기 시작(?:\s|$)/.test(utterance)) {
    if (!user.health_data_consent_at) return consentResponse();
    const { data: openCycle, error } = await deps.getOpenCycle(user.id);
    if (error) return response("현재 주기를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (openCycle) return response(`이미 진행 중인 기록이 있어요.\n\n시작일: ${openCycle.period_start}`);

    const requested = getRequestedDate(body, utterance, "주기 시작", user.timezone);
    if (requested.error) return response(requested.error);

    const { error: createError } = await deps.createCycle(user, requested.date);
    return createError
      ? response("시작일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : response(`시작일을 기록했어요: ${requested.date} 🌙`);
  }

  if (/^생리 종료(?:\s|$)/.test(utterance)) {
    if (!user.health_data_consent_at) return consentResponse();
    const { data: openCycle, error } = await deps.getOpenCycle(user.id);
    if (error) return response("현재 주기를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (!openCycle) return response("진행 중인 기록이 없어요. 먼저 시작일을 기록해 주세요 🌙");

    const requested = getRequestedDate(body, utterance, "생리 종료", user.timezone);
    if (requested.error) return response(requested.error);
    if (requested.date < openCycle.period_start) {
      return response(`종료일은 시작일(${openCycle.period_start})보다 빠를 수 없어요.`);
    }

    const { error: closeError } = await deps.closeCycle(openCycle.id, requested.date);
    return closeError
      ? response("종료일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : response(`종료일을 기록했어요: ${requested.date} ✅`);
  }

  if (utterance === "내 주기") {
    if (!user.health_data_consent_at) return consentResponse();
    const { data: cycles, error } = await deps.getUserCycles(user.id);
    if (error) return response("주기 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (!cycles?.length) return response("아직 기록이 없어요. 주기 시작일을 먼저 기록해 주세요 🌙");

    const prediction = deps.predictCycle(cycles, user);
    if (!prediction) return response("예측을 만들 수 없어요. 기록을 다시 확인해 주세요.");

    return response(deps.formatPrediction(prediction, "ko"));
  }

  if (utterance === "설정") {
    return settingsResponse(user);
  }

  const cycleLengthMatch = utterance.match(/^주기\s*(\d{2})일$/);
  if (cycleLengthMatch) {
    const value = Number(cycleLengthMatch[1]);
    if (value < 15 || value > 60) return response("주기는 15일부터 60일 사이로 설정해 주세요.");
    const { error } = await deps.updateCycleLength(user.id, value);
    return error
      ? response("주기 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : settingsResponse({ ...user, cycle_length: value });
  }

  const periodLengthMatch = utterance.match(/^생리\s*(\d{1,2})일$/);
  if (periodLengthMatch) {
    const value = Number(periodLengthMatch[1]);
    if (value < 1 || value > 14) return response("생리 기간은 1일부터 14일 사이로 설정해 주세요.");
    const { error } = await deps.updatePeriodLength(user.id, value);
    return error
      ? response("생리 기간 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : settingsResponse({ ...user, period_length: value });
  }

  if (utterance === "내 데이터 삭제") {
    return deleteConfirmationResponse();
  }

  if (utterance === "데이터 완전 삭제") {
    try {
      await deps.deleteUserData(user.id);
      return response(
        "모든 데이터가 삭제됐어요. LOONA를 이용해 주셔서 감사합니다.",
        [["다시 시작", "시작"]],
      );
    } catch {
      return response("데이터를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  if (utterance === "개인정보") {
    return response(getPrivacyText());
  }

  return response("원하는 기능을 아래 버튼에서 선택해 주세요.");
}

module.exports = {
  handleKakaoSkill,
  getKakaoUserId,
  getUtterance,
  getActionParam,
  getRequestedDate,
};
