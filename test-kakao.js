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
    getOpenCycle: async () => ({ data: null, error: null }),
    createCycle: async () => ({ error: null }),
    closeCycle: async () => ({ error: null }),
    getUserCycles: async () => ({
      data: [{ period_start: "2026-07-01", period_end: "2026-07-05" }],
      error: null,
    }),
    predictCycle: () => ({ ready: true }),
    formatPrediction: () => "예측 결과",
    deleteUserData: async () => {},
    ...overrides,
  };
}

async function testSkillScenarios() {
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
