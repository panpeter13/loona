const copy = {
  ru: {
    title: "📅 Прогноз цикла", last: "Последнее начало", typicalCycle: "Типичная длина цикла", typicalPeriod: "Типичная длительность периода", history: "Учтено интервалов", confidence: "Уверенность", range: "Следующий период ожидается примерно", likely: "Наиболее вероятная дата", ovulation: "Предполагаемое окно овуляции", fertile: "Расширенное предполагаемое фертильное окно", noOvulation: "Для оценки окна овуляции пока недостаточно стабильной истории.", variable: "Цикл заметно меняется, поэтому диапазон прогноза расширен.", missing: "В истории возможна пропущенная запись; уверенность прогноза снижена.", warning: "Календарный прогноз приблизительный. Не используйте его как метод контрацепции или медицинскую рекомендацию.", confidenceLabels: { preliminary: "предварительный прогноз", low: "мало данных", medium: "средняя", improved: "улучшенная", limited: "ограниченная" }, days: "дн." },
  en: {
    title: "📅 Cycle estimate", last: "Latest start", typicalCycle: "Typical cycle length", typicalPeriod: "Typical period length", history: "Intervals included", confidence: "Confidence", range: "Next period is estimated around", likely: "Most likely date", ovulation: "Estimated ovulation window", fertile: "Expanded estimated fertile window", noOvulation: "There is not enough stable history to estimate an ovulation window yet.", variable: "Your recorded cycle length varies, so the estimate range is wider.", missing: "A record may be missing from your history; confidence has been reduced.", warning: "Calendar estimates are approximate. Do not use them as contraception or medical advice.", confidenceLabels: { preliminary: "preliminary", low: "limited data", medium: "medium", improved: "improved", limited: "limited" }, days: "days" },
  ko: {
    title: "📅 주기 예측", last: "최근 시작일", typicalCycle: "일반적인 주기", typicalPeriod: "일반적인 생리 기간", history: "반영된 주기 간격", confidence: "예측 신뢰도", range: "다음 생리 예상 범위", likely: "가장 가능성 높은 날짜", ovulation: "예상 배란 기간", fertile: "넓게 추정한 가임 기간", noOvulation: "배란 기간을 추정하기에는 아직 안정적인 기록이 부족해요.", variable: "기록된 주기 변화가 커서 예상 범위를 넓게 표시했어요.", missing: "기록이 누락됐을 가능성이 있어 예측 신뢰도를 낮췄어요.", warning: "달력 기반 예측은 참고용입니다. 피임 방법이나 의료 조언으로 사용하지 마세요.", confidenceLabels: { preliminary: "예비 예측", low: "기록 부족", medium: "보통", improved: "향상됨", limited: "제한적" }, days: "일" },
};

function formatPrediction(prediction, language = "ru", options = {}) {
  const c = copy[language] || copy.ru;
  const partnerTitles = {
    ru: "💕 Прогноз партнёрши",
    en: "💕 Partner's cycle estimate",
    ko: "💕 파트너 주기 예측",
  };
  const lines = [
    options.partner ? (partnerTitles[language] || partnerTitles.ru) : c.title,
    "",
    `${c.last}: ${prediction.lastPeriodStart}`,
    `${c.typicalCycle}: ${prediction.averageCycleLength} ${c.days}`,
    `${c.typicalPeriod}: ${prediction.averagePeriodLength} ${c.days}`,
    `${c.history}: ${prediction.cyclesUsed}`,
    `${c.confidence}: ${c.confidenceLabels[prediction.confidence]}`,
    "",
    `${c.range}:`,
    `${prediction.nextPeriodStartRangeStart} — ${prediction.nextPeriodStartRangeEnd}`,
    `${c.likely}: ${prediction.nextPeriodStart}`,
    "",
  ];

  if (prediction.ovulationWindowStart) {
    lines.push(
      `${c.ovulation}: ${prediction.ovulationWindowStart} — ${prediction.ovulationWindowEnd}`,
      `${c.fertile}: ${prediction.fertileWindowStart} — ${prediction.fertileWindowEnd}`,
      "",
    );
  } else {
    lines.push(c.noOvulation, "");
  }

  if (prediction.isVariable) lines.push(`⚠️ ${c.variable}`, "");
  if (prediction.possibleMissingEntries) lines.push(`⚠️ ${c.missing}`, "");
  lines.push(`🩷 ${c.warning}`);
  return lines.join("\n");
}

module.exports = { formatPrediction };
