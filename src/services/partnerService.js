const supabase = require("../database/supabase");

function generatePartnerCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
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
  const { data: owner, error: findError } = await supabase
    .from("users")
    .select("id")
    .eq("partner_code", code.toUpperCase())
    .eq("mode", "female")
    .maybeSingle();

  if (findError) return { error: findError };
  if (!owner) return { notFound: true };
  if (owner.id === user.id) return { self: true };

  const { error } = await supabase
    .from("users")
    .update({ mode: "partner", linked_user_id: owner.id })
    .eq("id", user.id);
  return { error };
}

module.exports = { enablePersonalMode, enablePartnerMode, connectPartner };
