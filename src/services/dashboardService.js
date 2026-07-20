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
  let targetUser = currentUser;
  let title = "✨ Главный экран LOONA 🌙";

  if (currentUser.mode === "partner") {
    if (!currentUser.linked_user_id) {
      return (
        "🤝 Режим партнёра\n\n" +
        "Вы ещё не подключились к профилю. " +
        "Откройте 👤 Режим и введите код партнёрши."
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.linked_user_id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Связанный профиль не найден");

    targetUser = data;
    title = "✨ Статус партнёрши 🌙";
  }

  const { data: cycle, error } = await getLastCycle(targetUser.id);

  if (error) throw error;

  const cycleLength = targetUser.cycle_length || 28;
  const periodLength = targetUser.period_length || 5;
  let statusText =
    "Циклы ещё не зафиксированы. Отметьте начало кнопкой ниже 👇";

  if (cycle) {
    const daysSinceStart = getDaysDiff(getToday(), cycle.period_start) + 1;

    if (daysSinceStart < 1) {
      statusText = `Последняя запись начинается ${cycle.period_start}.`;
    } else if (!cycle.period_end) {
      statusText =
        `🔴 Идёт период — ${daysSinceStart}-й день\n` +
        `Обычная длительность: около ${periodLength} дней.`;
    } else if (daysSinceStart <= cycleLength) {
      const daysLeft = cycleLength - daysSinceStart + 1;
      const ovulationDay = Math.max(1, cycleLength - 14);
      let phase = "лютеиновая фаза";

      if (daysSinceStart <= periodLength) phase = "менструальная фаза";
      else if (daysSinceStart < ovulationDay) phase = "фолликулярная фаза";
      else if (daysSinceStart <= ovulationDay + 1) phase = "примерная овуляция";

      statusText =
        `🌸 ${daysSinceStart}-й день цикла — ${phase}\n` +
        `До следующего периода: примерно ${daysLeft} дн.`;
    } else {
      const delay = daysSinceStart - cycleLength;
      statusText =
        `⚠️ Возможная задержка: ${delay} дн.\n` +
        "Если новый цикл уже начался, отметьте его в LOONA.";
    }
  }

  return (
    `${title}\n\n${statusText}\n\n` +
    `Параметры: цикл ${cycleLength} дн., период ${periodLength} дн.\n\n` +
    "Прогноз приблизительный и не является медицинской рекомендацией."
  );
}

module.exports = { getDashboardText };
