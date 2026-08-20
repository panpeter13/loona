const supabase = require("../database/supabase");
const logger = require("../utils/logger");

function roleOf(user) {
  return user?.mode === "partner" ? "partner" : "owner";
}

async function trackEvent(user, eventName, attribution = {}) {
  if (!user?.id) return;
  const platform = user.platform || (user.telegram_id ? "telegram" : "kakao");
  const { error } = await supabase.from("analytics_events").insert({
    user_id: user.id,
    event_name: eventName,
    platform,
    user_role: roleOf(user),
    source: attribution.source || user.acquisition_source || null,
    campaign: attribution.campaign || user.acquisition_campaign || null,
  });
  if (error) logger.warn("Analytics event was not saved", { eventName, message: error.message });
}

async function markActive(userId) {
  const { error } = await supabase.from("users")
    .update({ last_active_at: new Date().toISOString() }).eq("id", userId);
  if (error) logger.warn("User activity was not saved", { message: error.message });
}

async function markOnboardingComplete(userId) {
  const now = new Date().toISOString();
  return supabase.from("users")
    .update({ onboarding_completed_at: now, last_active_at: now })
    .eq("id", userId).is("onboarding_completed_at", null);
}

async function markFirstCycle(userId) {
  return supabase.from("users")
    .update({ first_cycle_recorded_at: new Date().toISOString() })
    .eq("id", userId).is("first_cycle_recorded_at", null);
}

async function saveAttribution(user, source, campaign) {
  if (!source && !campaign) return { error: null };
  return supabase.from("users").update({
    acquisition_source: user.acquisition_source || source || null,
    acquisition_campaign: user.acquisition_campaign || campaign || null,
  }).eq("id", user.id);
}

async function countUsers(filters = []) {
  let query = supabase.from("users").select("id", { count: "exact", head: true });
  for (const [column, operator, value, extra] of filters) {
    query = operator === "not" ? query.not(column, value, extra) : query[operator](column, value);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function getGrowthSummary() {
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
  const [kakaoProfiles, kakaoPartners, onboarded, firstCycle, active7d, paid, telegramOwners] = await Promise.all([
    countUsers([["platform", "eq", "kakao"], ["mode", "eq", "female"]]),
    countUsers([["platform", "eq", "kakao"], ["mode", "eq", "partner"]]),
    countUsers([["platform", "eq", "kakao"], ["mode", "eq", "female"], ["onboarding_completed_at", "not", "is", null]]),
    countUsers([["platform", "eq", "kakao"], ["mode", "eq", "female"], ["first_cycle_recorded_at", "not", "is", null]]),
    countUsers([["platform", "eq", "kakao"], ["mode", "eq", "female"], ["onboarding_completed_at", "not", "is", null], ["last_active_at", "gte", since7d]]),
    countUsers([["platform", "eq", "kakao"], ["mode", "eq", "female"], ["subscription_status", "eq", "plus"]]),
    countUsers([["platform", "eq", "telegram"], ["mode", "eq", "female"]]),
  ]);
  return { kakaoProfiles, kakaoPartners, onboarded, firstCycle, active7d, paid, telegramOwners };
}

module.exports = {
  roleOf, trackEvent, markActive, markOnboardingComplete, markFirstCycle,
  saveAttribution, getGrowthSummary,
};
