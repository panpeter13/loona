const assert = require("node:assert/strict");
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
  assert.match(text(firstVisit), /Choose your language/);
  assert.deepEqual(
    firstVisit.template.quickReplies.map((item) => item.messageText),
    ["Язык русский", "Language English", "언어 한국어"],
  );

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

  let createdDate;
  const startResult = await handleKakaoSkill(
    request("주기 시작", {
      action: { params: { date: "2026-07-20" } },
    }),
    createDependencies({
      createCycle: async (_user, date) => {
        createdDate = date;
        return { error: null };
      },
    }),
  );
  assert.equal(createdDate, "2026-07-20");
  assert.match(text(startResult), /2026-07-20/);

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

  const newsResult = await handleKakaoSkill(request("소식"), createDependencies());
  assert.match(text(newsResult), /사랑과 정성/);
  assert.match(text(newsResult), /Tiếng Việt/);

  const partnerMenu = await handleKakaoSkill(request("파트너"), createDependencies());
  assert.match(text(partnerMenu), /파트너 모드/);
  assert.deepEqual(partnerMenu.template.quickReplies.map((item) => item.messageText), ["파트너: 내 프로필", "파트너: 연결"]);

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

    const kakao = await fetch(`http://127.0.0.1:${port}/kakao/skill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
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
