const { response, consentResponse } = require("./responses");
const { getOrCreateKakaoUser, recordHealthDataConsent } = require("../services/userService");
const {
  getOpenCycle,
  createCycle,
  closeCycle,
  getUserCycles,
} = require("../services/cycleService");
const { predictCycle } = require("../services/predictionService");
const { formatPrediction } = require("../services/predictionText");
const { getToday } = require("../utils/dateUtils");

const WELCOME =
  "안녕하세요, LOONA예요 🌙\n\n주기를 편안하고 안전하게 기록할 수 있도록 도와드려요.\n\n예측은 참고용이며 의료 조언이 아닙니다.";

const HELP =
  "LOONA 기능\n\n🌙 주기 시작 — 오늘을 시작일로 기록\n✅ 생리 종료 — 오늘을 종료일로 기록\n📅 내 주기 — 다음 생리일과 배란일 예측\n🔒 개인정보 — 데이터 처리 안내";

function getKakaoUserId(body) {
  return body?.userRequest?.user?.id || body?.userRequest?.user?.properties?.botUserKey;
}

function getUtterance(body) {
  return String(body?.userRequest?.utterance || body?.action?.name || "").trim();
}

async function handleKakaoSkill(body) {
  const kakaoUserId = getKakaoUserId(body);
  if (!kakaoUserId) return response("사용자 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.");

  const user = await getOrCreateKakaoUser(kakaoUserId);
  if (!user) return response("프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");

  const utterance = getUtterance(body);

  if (utterance === "민감정보 처리 동의") {
    const { data, error } = await recordHealthDataConsent(user.id);
    return error || !data
      ? response("동의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : response("동의가 저장됐어요. 이제 주기를 기록할 수 있어요 ✅");
  }

  if (!utterance || /^(시작|처음|안녕|도움말)$/i.test(utterance)) {
    return response(utterance === "도움말" ? HELP : WELCOME);
  }

  if (utterance === "주기 시작") {
    if (!user.health_data_consent_at) return consentResponse();
    const { data: openCycle, error } = await getOpenCycle(user.id);
    if (error) return response("현재 주기를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (openCycle) return response(`이미 진행 중인 기록이 있어요.\n\n시작일: ${openCycle.period_start}`);

    const today = getToday(user.timezone);
    const { error: createError } = await createCycle(user, today);
    return createError
      ? response("시작일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : response(`시작일을 기록했어요: ${today} 🌙`);
  }

  if (utterance === "생리 종료") {
    if (!user.health_data_consent_at) return consentResponse();
    const { data: openCycle, error } = await getOpenCycle(user.id);
    if (error) return response("현재 주기를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (!openCycle) return response("진행 중인 기록이 없어요. 먼저 시작일을 기록해 주세요 🌙");

    const today = getToday(user.timezone);
    const { error: closeError } = await closeCycle(openCycle.id, today);
    return closeError
      ? response("종료일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
      : response(`종료일을 기록했어요: ${today} ✅`);
  }

  if (utterance === "내 주기") {
    if (!user.health_data_consent_at) return consentResponse();
    const { data: cycles, error } = await getUserCycles(user.id);
    if (error) return response("주기 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (!cycles?.length) return response("아직 기록이 없어요. 주기 시작일을 먼저 기록해 주세요 🌙");

    const prediction = predictCycle(cycles, user);
    if (!prediction) return response("예측을 만들 수 없어요. 기록을 다시 확인해 주세요.");

    return response(formatPrediction(prediction, "ko"));
  }

  if (utterance === "개인정보") {
    return response(
      "🔒 개인정보 보호\n\nLOONA는 서비스 제공에 필요한 익명화된 사용자 식별자, 설정, 주기 날짜를 저장합니다. 데이터는 제3자에게 판매되지 않으며 사용자가 삭제를 요청할 수 있습니다.",
    );
  }

  return response("원하는 기능을 아래 버튼에서 선택해 주세요.");
}

module.exports = { handleKakaoSkill, getKakaoUserId, getUtterance };
