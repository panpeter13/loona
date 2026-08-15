const { Markup } = require("telegraf");

const copy = {
  ru: {
    prompt: "🔒 Перед записью данных цикла нужно ваше явное согласие на обработку данных о здоровье. Вы можете отозвать его, удалив данные в настройках.",
    accept: "Согласна",
    decline: "Не согласна",
    saved: "Согласие сохранено. Теперь повторите действие.",
    declined: "Без согласия LOONA не будет записывать данные цикла.",
  },
  en: {
    prompt: "🔒 Before saving cycle data, we need your explicit consent to process health data. You can withdraw it by deleting your data in Settings.",
    accept: "I agree",
    decline: "I do not agree",
    saved: "Consent saved. Please repeat the action.",
    declined: "Without consent, LOONA will not save cycle data.",
  },
  ko: {
    prompt: "🔒 주기 데이터를 저장하기 전에 건강정보 처리에 대한 명시적 동의가 필요해요. 설정에서 데이터를 삭제하여 동의를 철회할 수 있어요.",
    accept: "동의해요",
    decline: "동의하지 않아요",
    saved: "동의가 저장됐어요. 작업을 다시 선택해 주세요.",
    declined: "동의하지 않으면 LOONA는 주기 데이터를 저장하지 않아요.",
  },
};

function consentCopy(user) {
  return copy[user?.language] || copy.ru;
}

async function requireHealthConsent(ctx, user) {
  if (user?.health_data_consent_at) return false;
  const c = consentCopy(user);
  await ctx.reply(c.prompt, Markup.inlineKeyboard([
    Markup.button.callback(c.accept, "health_consent_accept"),
    Markup.button.callback(c.decline, "health_consent_decline"),
  ]));
  return true;
}

module.exports = { requireHealthConsent, consentCopy };
