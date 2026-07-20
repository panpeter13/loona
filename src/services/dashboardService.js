const supabase = require("../database/supabase");
const { getLastCycle } = require("./cycleService");

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function getDaysDiff(laterDate, earlierDate) {
  return Math.floor(
    (parseDateOnly(laterDate) - parseDateOnly(earlierDate)) / DAY_MS,
  );
}

function getToday() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function getDashboardText(currentUser) {
  const lang = ["ru", "en", "ko"].includes(currentUser.language) ? currentUser.language : "ru";
  const c = {
    ru: { title: "✨ Главный экран LOONA 🌙", partnerTitle: "✨ Статус партнёрши 🌙", connect: "🤝 Режим партнёра\n\nВы ещё не подключились к профилю. Откройте 👤 Режим и введите код партнёрши.", empty: "Циклы ещё не зафиксированы. Отметьте начало кнопкой ниже 👇", active: (d,p) => `🔴 Идёт период — ${d}-й день\nОбычная длительность: около ${p} дней.`, next: (d,p) => `🌸 ${d}-й день цикла — ${p}\nДо следующего периода: примерно`, late: "⚠️ Возможная задержка", started: "Если новый цикл уже начался, отметьте его в LOONA.", params: "Параметры", disclaimer: "Прогноз приблизительный и не является медицинской рекомендацией.", days: "дн.", phases: ["менструальная фаза", "фолликулярная фаза", "примерная овуляция", "лютеиновая фаза"] },
    en: { title: "✨ LOONA Dashboard 🌙", partnerTitle: "✨ Partner status 🌙", connect: "🤝 Partner mode\n\nYou are not connected yet. Open 👤 Mode and enter your partner's code.", empty: "No cycles recorded yet. Use the button below to mark the start 👇", active: (d,p) => `🔴 Period in progress — day ${d}\nTypical length: about ${p} days.`, next: (d,p) => `🌸 Cycle day ${d} — ${p}\nUntil the next period: about`, late: "⚠️ Possible delay", started: "If a new cycle has already started, record it in LOONA.", params: "Settings", disclaimer: "This estimate is approximate and is not medical advice.", days: "days", phases: ["menstrual phase", "follicular phase", "estimated ovulation", "luteal phase"] },
    ko: { title: "✨ LOONA 홈 🌙", partnerTitle: "✨ 파트너 상태 🌙", connect: "🤝 파트너 모드\n\n아직 연결되지 않았어요. 👤 모드에서 파트너 코드를 입력해 주세요.", empty: "아직 기록된 주기가 없어요. 아래 버튼으로 시작일을 기록해 주세요 👇", active: (d,p) => `🔴 생리 중 — ${d}일차\n평균 기간: 약 ${p}일`, next: (d,p) => `🌸 주기 ${d}일차 — ${p}\n다음 생리까지 약`, late: "⚠️ 예상 지연", started: "새 주기가 이미 시작됐다면 LOONA에 기록해 주세요.", params: "설정", disclaimer: "예측은 참고용이며 의료 조언이 아닙니다.", days: "일", phases: ["생리기", "난포기", "예상 배란기", "황체기"] },
  }[lang];
  let targetUser = currentUser;
  let title = c.title;

  if (currentUser.mode === "partner") {
    if (!currentUser.linked_user_id) {
      return c.connect;
    }

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

  const { data: cycle, error } = await getLastCycle(targetUser.id);

  if (error) throw error;

  const cycleLength = targetUser.cycle_length || 28;
  const periodLength = targetUser.period_length || 5;
  let statusText = c.empty;

  if (cycle) {
    const daysSinceStart = getDaysDiff(getToday(), cycle.period_start) + 1;

    if (daysSinceStart < 1) {
      statusText = `Последняя запись начинается ${cycle.period_start}.`;
    } else if (!cycle.period_end) {
      statusText = c.active(daysSinceStart, periodLength);
    } else if (daysSinceStart <= cycleLength) {
      const daysLeft = cycleLength - daysSinceStart + 1;
      const ovulationDay = Math.max(1, cycleLength - 14);
      let phase = c.phases[3];

      if (daysSinceStart <= periodLength) phase = c.phases[0];
      else if (daysSinceStart < ovulationDay) phase = c.phases[1];
      else if (daysSinceStart <= ovulationDay + 1) phase = c.phases[2];

      statusText = `${c.next(daysSinceStart, phase)} ${daysLeft} ${c.days}`;
    } else {
      const delay = daysSinceStart - cycleLength;
      statusText = `${c.late}: ${delay} ${c.days}\n${c.started}`;
    }
  }

  return (
    `${title}\n\n${statusText}\n\n` +
    `${c.params}: ${cycleLength} / ${periodLength} ${c.days}\n\n${c.disclaimer}`
  );
}

module.exports = { getDashboardText };
