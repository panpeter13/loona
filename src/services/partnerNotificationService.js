const supabase = require("../database/supabase");

const copy = {
  ru: "💗 Партнёрша отметила начало нового цикла в LOONA.\n\nСамое время проявить немного больше заботы и спросить, чем можно помочь.",
  en: "💗 Your partner recorded the start of a new cycle in LOONA.\n\nThis may be a good time to offer a little extra care and ask how you can help.",
  ko: "💗 파트너가 LOONA에 새로운 주기의 시작을 기록했어요.\n\n조금 더 세심하게 살피고 필요한 도움이 있는지 물어봐 주세요.",
};

function partnerCycleStartedText(language) {
  return copy[language] || copy.ru;
}

async function notifyPartnersCycleStarted(telegram, ownerId) {
  const { data: partners, error } = await supabase
    .from("users")
    .select("id, telegram_id, language")
    .eq("mode", "partner")
    .eq("linked_user_id", ownerId)
    .not("telegram_id", "is", null);

  if (error) {
    console.log("Ошибка получения партнёров для уведомления:", error);
    return;
  }

  for (const partner of partners || []) {
    try {
      await telegram.sendMessage(
        partner.telegram_id,
        partnerCycleStartedText(partner.language),
      );
    } catch (sendError) {
      console.log("Ошибка отправки уведомления партнёру:", sendError);
    }
  }
}

module.exports = {
  notifyPartnersCycleStarted,
  partnerCycleStartedText,
};
