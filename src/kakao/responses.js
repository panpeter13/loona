const QUICK_REPLIES = [
  ["🌙 주기 시작", "주기 시작"],
  ["✅ 생리 종료", "생리 종료"],
  ["📅 내 주기", "내 주기"],
  ["❓ 도움말", "도움말"],
  ["🔒 개인정보", "개인정보"],
];

function response(text, quickReplies = QUICK_REPLIES) {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: quickReplies.map(([label, messageText]) => ({
        action: "message",
        label,
        messageText,
      })),
    },
  };
}

function consentResponse() {
  return response(
    "주기 날짜는 건강 관련 민감정보에 해당할 수 있어요. LOONA는 주기 기록과 예측 제공을 위해서만 이 정보를 사용합니다. 개인정보 처리방침을 확인하고 처리에 동의해 주세요.",
    [
      ["✅ 동의합니다", "민감정보 처리 동의"],
      ["🔒 개인정보 처리방침", "개인정보"],
    ],
  );
}

module.exports = { response, consentResponse };
