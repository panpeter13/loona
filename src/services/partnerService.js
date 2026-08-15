const supabase = require("../database/supabase");
const crypto = require("crypto");

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const partnerAttempts = new Map();

const attemptCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [userId, state] of partnerAttempts) {
    if (now - state.startedAt >= ATTEMPT_WINDOW_MS) partnerAttempts.delete(userId);
  }
}, ATTEMPT_WINDOW_MS);
attemptCleanupTimer.unref();

function generatePartnerCode() {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
}

function getAttemptState(userId) {
  const now = Date.now();
  const current = partnerAttempts.get(String(userId));
  if (!current || now - current.startedAt >= ATTEMPT_WINDOW_MS) {
    return { count: 0, startedAt: now };
  }
  return current;
}

function checkAttemptLimit(userId) {
  const state = getAttemptState(userId);
  if (state.count < ATTEMPT_LIMIT) return null;
  return Math.max(1, Math.ceil((ATTEMPT_WINDOW_MS - (Date.now() - state.startedAt)) / 60000));
}

function recordFailedAttempt(userId) {
  const state = getAttemptState(userId);
  partnerAttempts.set(String(userId), { ...state, count: state.count + 1 });
}

async function enablePersonalMode(user) {
  const partnerCode = user.partner_code || generatePartnerCode();
  const result = await supabase
    .from("users")
    .update({ mode: "female", partner_code: partnerCode, linked_user_id: null })
    .eq("id", user.id);
  return { ...result, partnerCode };
}

async function enablePartnerMode(userId) {
  return supabase
    .from("users")
    .update({ mode: "partner", linked_user_id: null })
    .eq("id", userId);
}

async function connectPartner(user, code) {
  const retryAfterMinutes = checkAttemptLimit(user.id);
  if (retryAfterMinutes) return { rateLimited: true, retryAfterMinutes };

  const { data: owner, error: findError } = await supabase
    .from("users")
    .select("id")
    .eq("partner_code", code.toUpperCase())
    .eq("mode", "female")
    .maybeSingle();

  if (findError) return { error: findError };
  if (!owner) {
    recordFailedAttempt(user.id);
    return { notFound: true };
  }
  if (owner.id === user.id) {
    recordFailedAttempt(user.id);
    return { self: true };
  }

  const { error } = await supabase
    .from("users")
    .update({ mode: "partner", linked_user_id: owner.id })
    .eq("id", user.id);
  if (!error) partnerAttempts.delete(String(user.id));
  return { error, ownerId: owner.id };
}

module.exports = { enablePersonalMode, enablePartnerMode, connectPartner, generatePartnerCode };
