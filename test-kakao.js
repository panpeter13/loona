const assert = require("node:assert/strict");
process.env.KAKAO_WEBHOOK_SECRET ||= "test-kakao-webhook-secret-32-bytes";
process.env.HASH_PEPPER ||= "test-hash-pepper-at-least-32-bytes-long";
const { createApp } = require("./src/kakao/server");
const { handleKakaoSkill } = require("./src/kakao/skillHandler");

function request(utterance, extras = {}) {
  return {
    userRequest: {
      utterance,
      user: { id: "kakao-test-user" },
    },
    ...extras,
  };
}

function text(result) {
  return result.template.outputs[0].simpleText.text;
}

function createDependencies(overrides = {}) {
  const user = {
    id: 42,
    language: "ko",
    timezone: "Asia/Seoul",
    cycle_length: 28,
    period_length: 5,
    health_data_consent_at: "2026-07-01T00:00:00.000Z",
  };

  return {
    getOrCreateKakaoUser: async () => user,
    recordHealthDataConsent: async () => ({ data: { ...user }, error: null }),
    updateCycleLength: async () => ({ error: null }),
    updatePeriodLength: async () => ({ error: null }),
    updateLanguage: async () => ({ error: null }),
    getLastCycle: async () => ({ data: null, error: null }),
    getOpenCycle: async () => ({ data: null, error: null }),
    createCycle: async () => ({ error: null }),
    closeCycle: async () => ({ error: null }),
    deleteCycle: async () => ({ error: null }),
    reopenCycle: async () => ({ error: null }),
    getUserCycles: async () => ({
      data: [{ period_start: "2026-07-01", period_end: "2026-07-05" }],
      error: null,
    }),
    predictCycle: () => ({ ready: true }),
    formatPrediction: () => "예측 결과",
    getDashboardText: async () => "홈 상태",
    deleteUserData: async () => {},
    enablePersonalMode: async () => ({ error: null, partnerCode: "ABC123" }),
    enablePartnerMode: async () => ({ error: null }),
    connectPartner: async () => ({ error: null }),
    trackEvent: async () => {},
    markActive: async () => {},
    markOnboardingComplete: async () => ({ error: null }),
    markFirstCycle: async () => ({ error: null }),
    saveAttribution: async () => ({ error: null }),
    saveFeedback: async () => ({ error: null }),
    ...overrides,
  };
}

async function testSkillScenarios() {
  const firstVisit = await handleKakaoSkill(
    request("안녕"),
    createDependencies({
      getOrCreateKakaoUser: async () => ({
        id: 42,
        language: "select",
        timezone: "Asia/Seoul",
        cycle_length: 28,
        period_length: 5,
        health_data_consent_at: null,
      }),
    }),
  );
  assert.match(text(firstVisit), /생리 주기를 간편하게 기록/);
  assert.match(text(firstVisit), /파트너는 Telegram에서도 연결/);
  assert.match(text(firstVisit), /개인 메모 없이 주기 요약만/);
  assert.match(text(firstVisit), /언제든지 직접 삭제/);
  assert.match(text(firstVisit), /의료 조언이나 피임 방법이 아닙니다/);
  assert.match(text(firstVisit), /Choose your language/);
  const welcomeCarousel = firstVisit.template.outputs[1].carousel;
  assert.equal(welcomeCarousel.type, "basicCard");
  assert.equal(welcomeCarousel.items.length, 4);
  assert.match(welcomeCarousel.items[0].thumbnail.imageUrl, /loona-welcome-01\.png$/);
  assert.match(welcomeCarousel.items[3].thumbnail.imageUrl, /loona-welcome-04\.png$/);
  assert.deepEqual(
    welcomeCarousel.items[0].buttons.map((item) => item.messageText),
    ["언어 한국어", "Language English", "Язык русский"],
  );
  assert.deepEqual(
    firstVisit.template.quickReplies.map((item) => item.label),
    ["Русский · Начать", "English · Start", "한국어 · 시작하기"],
  );
  assert.deepEqual(
    firstVisit.template.quickReplies.map((item) => item.messageText),
    ["Язык русский", "Language English", "언어 한국어"],
  );

  const returningVisit = await handleKakaoSkill(
    request("🌙 LOONA 시작하기"),
    createDependencies({
      getOrCreateKakaoUser: async () => ({
        id: 42,
        language: "ko",
        timezone: "Asia/Seoul",
        cycle_length: 28,
        period_length: 5,
        health_data_consent_at: "2026-08-20T00:00:00.000Z",
      }),
    }),
  );
  assert.match(text(returningVisit), /생리 주기를 간편하게 기록/);
  assert.equal(returningVisit.template.outputs[1].carousel.items.length, 4);

  const withoutConsent = createDependencies({
    getOrCreateKakaoUser: async () => ({
      id: 42,
      language: "ko",
      timezone: "Asia/Seoul",
      cycle_length: 28,
      period_length: 5,
      health_data_consent_at: null,
    }),
  });
  const consentPrompt = await handleKakaoSkill(request("주기 시작"), withoutConsent);
  assert.match(text(consentPrompt), /민감정보/);
  assert.equal(consentPrompt.template.quickReplies[0].messageText, "민감정보 처리 동의");
  assert.equal(consentPrompt.template.quickReplies.at(-1).messageText, "홈");

  const startDatePicker = await handleKakaoSkill(
    request("주기 시작"),
    createDependencies(),
  );
  assert.match(text(startDatePicker), /시작일을 선택/);
  assert.equal(startDatePicker.template.quickReplies.length, 9);
  assert.match(
    startDatePicker.template.quickReplies[0].messageText,
    /^주기 시작 \d{4}-\d{2}-\d{2}$/,
  );

  const endDatePicker = await handleKakaoSkill(
    request("생리 종료"),
    createDependencies({
      getOpenCycle: async () => ({
        data: { id: 7, period_start: "2026-07-20" },
        error: null,
      }),
    }),
  );
  assert.match(text(endDatePicker), /종료일을 선택/);
  assert.match(
    endDatePicker.template.quickReplies[0].messageText,
    /^생리 종료 \d{4}-\d{2}-\d{2}$/,
  );

  let pluginDate;
  const pluginConfirmation = await handleKakaoSkill(
    request("주기 시작", {
      action: {
        params: {
          date: JSON.stringify({ date: "2026-07-18", calendar_type: "solar" }),
        },
      },
    }),
    createDependencies({
      createCycle: async (_user, date) => {
        pluginDate = date;
        return { error: null };
      },
    }),
  );
  assert.equal(pluginDate, undefined);
  assert.match(text(pluginConfirmation), /2026-07-18/);
  assert.deepEqual(
    pluginConfirmation.template.quickReplies.map((item) => item.messageText),
    ["시작일 저장 2026-07-18", "시작일 선택", "홈"],
  );

  let confirmedEndDate;
  const confirmedEnd = await handleKakaoSkill(
    request("종료일 저장 2026-07-18", {
      action: { params: { date: "2026-07-18" } },
    }),
    createDependencies({
      getOpenCycle: async () => ({
        data: { id: 7, period_start: "2026-07-15" },
        error: null,
      }),
      closeCycle: async (_cycleId, date) => {
        confirmedEndDate = date;
        return { error: null };
      },
    }),
  );
  assert.equal(confirmedEndDate, "2026-07-18");
  assert.match(text(confirmedEnd), /종료일을 기록했어요/);

  await handleKakaoSkill(
    request("주기 시작 2026-07-18"),
    createDependencies({
      createCycle: async (_user, date) => {
        pluginDate = date;
        return { error: null };
      },
    }),
  );
  assert.equal(pluginDate, "2026-07-18");

  let intentPluginDate;
  const intentConfirmation = await handleKakaoSkill(
    request("July 17, 2026 (Fri)", {
      intent: { name: "주기 시작 날짜 선택" },
      action: { params: { date: "2026-07-17" } },
    }),
    createDependencies({
      createCycle: async (_user, date) => {
        intentPluginDate = date;
        return { error: null };
      },
    }),
  );
  assert.equal(intentPluginDate, undefined);
  assert.match(text(intentConfirmation), /이 날짜가 맞나요/);

  let calendarBlockStarted = false;
  let calendarBlockEnded = false;
  const ambiguousCalendarResult = await handleKakaoSkill(
    request("July 16, 2026 (Thu)", {
      intent: { name: "Calendar Block" },
      action: { params: { date: "2026-07-16" } },
    }),
    createDependencies({
      createCycle: async () => {
        calendarBlockStarted = true;
        return { error: null };
      },
      closeCycle: async () => {
        calendarBlockEnded = true;
        return { error: null };
      },
    }),
  );
  assert.equal(calendarBlockStarted, false);
  assert.equal(calendarBlockEnded, false);
  assert.match(text(ambiguousCalendarResult), /원하는 기능/);

  let createdDate;
  const startResult = await handleKakaoSkill(
    request("주기 시작 2026-07-20"),
    createDependencies({
      createCycle: async (_user, date) => {
        createdDate = date;
        return { error: null };
      },
    }),
  );
  assert.equal(createdDate, "2026-07-20");
  assert.match(text(startResult), /2026-07-20/);

  const duplicateStart = await handleKakaoSkill(
    request("주기 시작 2026-07-20"),
    createDependencies({
      createCycle: async () => ({ error: null, duplicate: true }),
    }),
  );
  assert.match(text(duplicateStart), /중복 저장하지 않았어요/);

  const futureResult = await handleKakaoSkill(
    request("주기 시작 2099-01-01"),
    createDependencies(),
  );
  assert.match(text(futureResult), /미래 날짜/);

  const invalidEnd = await handleKakaoSkill(
    request("생리 종료 2026-07-19"),
    createDependencies({
      getOpenCycle: async () => ({
        data: { id: 7, period_start: "2026-07-20" },
        error: null,
      }),
    }),
  );
  assert.match(text(invalidEnd), /빠를 수 없어요/);

  let updatedCycleLength;
  const settingsResult = await handleKakaoSkill(
    request("주기 30일"),
    createDependencies({
      updateCycleLength: async (_userId, value) => {
        updatedCycleLength = value;
        return { error: null };
      },
    }),
  );
  assert.equal(updatedCycleLength, 30);
  assert.match(text(settingsResult), /평균 주기: 30일/);

  let deletedUserId;
  const deleteResult = await handleKakaoSkill(
    request("데이터 완전 삭제"),
    createDependencies({
      deleteUserData: async (userId) => {
        deletedUserId = userId;
      },
    }),
  );
  assert.equal(deletedUserId, 42);
  assert.match(text(deleteResult), /모든 데이터가 삭제/);

  const predictionResult = await handleKakaoSkill(
    request("내 주기"),
    createDependencies(),
  );
  assert.equal(text(predictionResult), "예측 결과");

  let changedLanguage;
  const englishResult = await handleKakaoSkill(
    request("Language English"),
    createDependencies({
      updateLanguage: async (_userId, language) => {
        changedLanguage = language;
        return { error: null };
      },
    }),
  );
  assert.equal(changedLanguage, "en");
  assert.match(text(englishResult), /Hi, I’m LOONA/);
  assert.equal(englishResult.template.quickReplies[0].label, "✨ Home");
  assert.equal(englishResult.template.quickReplies[0].messageText, "Home");

  let reopenedCycleId;
  const undoEndResult = await handleKakaoSkill(
    request("최근 기록 취소"),
    createDependencies({
      getLastCycle: async () => ({
        data: { id: 9, period_start: "2026-07-01", period_end: "2026-07-05" },
        error: null,
      }),
      reopenCycle: async (cycleId) => {
        reopenedCycleId = cycleId;
        return { error: null };
      },
    }),
  );
  assert.equal(reopenedCycleId, 9);
  assert.match(text(undoEndResult), /다시 열렸어요/);

  const dashboardResult = await handleKakaoSkill(
    request("홈"),
    createDependencies({ getDashboardText: async () => "LOONA dashboard" }),
  );
  assert.equal(text(dashboardResult), "LOONA dashboard");
  assert.deepEqual(
    dashboardResult.template.quickReplies.find((item) => item.label === "📰 소식"),
    { action: "message", label: "📰 소식", messageText: "소식" },
  );
  assert.deepEqual(
    dashboardResult.template.quickReplies.find((item) => item.label === "💬 의견"),
    { action: "message", label: "💬 의견", messageText: "의견" },
  );

  const feedbackMenu = await handleKakaoSkill(request("의견"), createDependencies());
  assert.deepEqual(feedbackMenu.template.quickReplies.map((item) => item.messageText), ["기능 제안", "오류 신고", "홈"]);

  let savedFeedback;
  const feedbackSaved = await handleKakaoSkill(request("의견: 알림 시간을 선택하고 싶어요"), createDependencies({
    saveFeedback: async (userId, type, message) => {
      savedFeedback = { userId, type, message };
      return { error: null };
    },
  }));
  assert.deepEqual(savedFeedback, { userId: 42, type: "idea", message: "알림 시간을 선택하고 싶어요" });
  assert.match(text(feedbackSaved), /감사합니다/);

  const newsResult = await handleKakaoSkill(request("소식"), createDependencies());
  assert.match(text(newsResult), /공개 베타 테스트/);
  assert.match(text(newsResult), /Kakao 알림/);

  const partnerMenu = await handleKakaoSkill(request("파트너"), createDependencies());
  assert.match(text(partnerMenu), /파트너 모드/);
  assert.deepEqual(partnerMenu.template.quickReplies.map((item) => item.messageText), ["파트너: 내 프로필", "파트너: 연결", "홈"]);

  const settingsMenu = await handleKakaoSkill(request("설정"), createDependencies());
  assert.equal(settingsMenu.template.quickReplies.at(-1).messageText, "홈");

  const deleteMenu = await handleKakaoSkill(request("내 데이터 삭제"), createDependencies());
  assert.equal(deleteMenu.template.quickReplies.at(-1).messageText, "홈");

  const languageMenu = await handleKakaoSkill(request("언어"), createDependencies());
  assert.equal(languageMenu.template.quickReplies.at(-1).messageText, "홈");

  const ownProfile = await handleKakaoSkill(request("파트너: 내 프로필"), createDependencies());
  assert.match(text(ownProfile), /ABC123/);

  let connectedCode;
  const linked = await handleKakaoSkill(request("파트너 코드 ZXCV12"), createDependencies({
    connectPartner: async (_user, code) => { connectedCode = code; return { error: null }; },
  }));
  assert.equal(connectedCode, "ZXCV12");
  assert.match(text(linked), /연결됐어요/);
  assert.equal(linked.template.quickReplies.some((item) => item.messageText === "주기 시작"), false);

  const readOnly = await handleKakaoSkill(request("주기 시작"), createDependencies({
    getOrCreateKakaoUser: async () => ({
      id: 42, language: "ko", timezone: "Asia/Seoul", mode: "partner",
      linked_user_id: 99, health_data_consent_at: "2026-07-01T00:00:00.000Z",
    }),
  }));
  assert.match(text(readOnly), /변경할 수 없으며/);

  let savedAttribution;
  const attributedStart = await handleKakaoSkill(request("시작 ad_kr_cycle_care_a"), createDependencies({
    saveAttribution: async (_user, source, campaign) => {
      savedAttribution = { source, campaign };
      return { error: null };
    },
  }));
  assert.deepEqual(savedAttribution, { source: "kakao_moment", campaign: "kr_cycle_care_a" });
  assert.match(text(attributedStart), /안녕하세요/);
}

async function run() {
  await testSkillScenarios();

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((res) => res.json());
    assert.equal(health.ok, true);
    assert.equal(health.version, require("./package.json").version);

    const privacy = await fetch(`http://127.0.0.1:${port}/privacy`);
    assert.equal(privacy.status, 200);
    assert.match(await privacy.text(), /PAN PETR/);

    const landing = await fetch(`http://127.0.0.1:${port}/kakao`);
    assert.equal(landing.status, 200);
    const landingHtml = await landing.text();
    assert.match(landingHtml, /편안하게/);
    assert.match(landingHtml, /pf\.kakao\.com\/_xfltxnX\/chat/);

    const hero = await fetch(`http://127.0.0.1:${port}/assets/loona-kakao-hero.png`);
    assert.equal(hero.status, 200);
    assert.equal(hero.headers.get("content-type"), "image/png");

    const unauthorized = await fetch(`http://127.0.0.1:${port}/kakao/skill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(unauthorized.status, 401);

    const legacyQueryToken = await fetch(`http://127.0.0.1:${port}/kakao/skill?token=${encodeURIComponent(process.env.KAKAO_WEBHOOK_SECRET)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(legacyQueryToken.status, 401);

    const kakao = await fetch(`http://127.0.0.1:${port}/kakao/skill`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-loona-webhook-secret": process.env.KAKAO_WEBHOOK_SECRET,
      },
      body: JSON.stringify({}),
    }).then((res) => res.json());

    assert.equal(kakao.version, "2.0");
    assert.ok(kakao.template.outputs[0].simpleText.text);
    console.log("Kakao Skill scenarios and HTTP API OK");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
