const supabase = require("../database/supabase");
const { getUserCycles } = require("./cycleService");
const { predictCycle } = require("./predictionService");
const { getToday } = require("../utils/dateUtils");

const DAY_MS = 86400000;

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function getDaysDiff(laterDate, earlierDate) {
  return Math.floor((parseDateOnly(laterDate) - parseDateOnly(earlierDate)) / DAY_MS);
}

const copy = {
  ru: {
    title: "✨ Главный экран LOONA 🌙", partnerTitle: "✨ Статус партнёрши 🌙",
    connect: "🤝 Режим партнёра\n\nВы ещё не подключились к профилю. Откройте 👤 Режим и введите код партнёрши.",
    empty: "Циклы ещё не зафиксированы. Отметьте начало кнопкой ниже 👇",
    active: (day, length) => `🔴 Идёт период — ${day}-й день\nТипичная длительность: около ${length} дн.`,
    cycleDay: (day) => `🌸 ${day}-й день цикла`, range: "Следующий период ожидается примерно", likely: "Наиболее вероятная дата",
    late: (days) => `⚠️ Прогнозируемый диапазон закончился ${days} дн. назад.\nЕсли новый цикл уже начался, отметьте его в LOONA.`,
    future: (date) => `Последняя запись начинается ${date}.`, params: "Параметры",
    disclaimer: "Прогноз приблизительный. Не используйте его как метод контрацепции или медицинскую рекомендацию.", days: "дн.",
  },
  en: {
    title: "✨ LOONA Dashboard 🌙", partnerTitle: "✨ Partner status 🌙",
    connect: "🤝 Partner mode\n\nYou are not connected yet. Open 👤 Mode and enter your partner's code.",
    empty: "No cycles recorded yet. Use the button below to mark the start 👇",
    active: (day, length) => `🔴 Period in progress — day ${day}\nTypical length: about ${length} days.`,
    cycleDay: (day) => `🌸 Cycle day ${day}`, range: "Next period is estimated around", likely: "Most likely date",
    late: (days) => `⚠️ The estimated range ended ${days} days ago.\nIf a new cycle has started, record it in LOONA.`,
    future: (date) => `The latest entry starts on ${date}.`, params: "Settings",
    disclaimer: "Estimates are approximate. Do not use them as contraception or medical advice.", days: "days",
  },
  ko: {
    title: "✨ LOONA 홈 🌙", partnerTitle: "✨ 파트너 상태 🌙",
    connect: "🤝 파트너 모드\n\n아직 연결되지 않았어요. 👤 모드에서 파트너 코드를 입력해 주세요.",
    empty: "아직 기록된 주기가 없어요. 아래 버튼으로 시작일을 기록해 주세요 👇",
    active: (day, length) => `🔴 생리 중 — ${day}일차\n일반적인 기간: 약 ${length}일`,
    cycleDay: (day) => `🌸 주기 ${day}일차`, range: "다음 생리 예상 범위", likely: "가장 가능성 높은 날짜",
    late: (days) => `⚠️ 예상 범위가 ${days}일 전에 지났어요.\n새 주기가 시작됐다면 LOONA에 기록해 주세요.`,
    future: (date) => `최근 기록의 시작일은 ${date}예요.`, params: "설정",
    disclaimer: "예측은 참고용입니다. 피임 방법이나 의료 조언으로 사용하지 마세요.", days: "일",
  },
};

async function getDashboardText(currentUser) {
  const language = copy[currentUser.language] ? currentUser.language : "ru";
  const c = copy[language];
  let targetUser = currentUser;
  let title = c.title;

  if (currentUser.mode === "partner") {
    if (!currentUser.linked_user_id) return c.connect;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.linked_user_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Связанный профиль не найден");
    targetUser = data;
    title = c.partnerTitle;
  }

  const { data: cycles, error } = await getUserCycles(targetUser.id);
  if (error) throw error;
  if (!cycles?.length) return `${title}\n\n${c.empty}\n\n${c.disclaimer}`;

  const prediction = predictCycle(cycles, targetUser);
  const lastCycle = cycles[cycles.length - 1];
  const today = getToday(targetUser.timezone);
  const daysSinceStart = getDaysDiff(today, lastCycle.period_start) + 1;
  let statusText;

  if (daysSinceStart < 1) {
    statusText = c.future(lastCycle.period_start);
  } else if (!lastCycle.period_end) {
    statusText = c.active(daysSinceStart, prediction.averagePeriodLength);
  } else if (today > prediction.nextPeriodStartRangeEnd) {
    statusText = c.late(getDaysDiff(today, prediction.nextPeriodStartRangeEnd));
  } else {
    statusText =
      `${c.cycleDay(daysSinceStart)}\n` +
      `${c.range}: ${prediction.nextPeriodStartRangeStart} — ${prediction.nextPeriodStartRangeEnd}\n` +
      `${c.likely}: ${prediction.nextPeriodStart}`;
  }

  return (
    `${title}\n\n${statusText}\n\n` +
    `${c.params}: ${prediction.averageCycleLength} / ${prediction.averagePeriodLength} ${c.days}\n\n` +
    c.disclaimer
  );
}

module.exports = { getDashboardText, getDaysDiff };
