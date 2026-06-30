const supabase = require("../database/supabase");

async function createDonation({ userId, telegramId, amountStars, payload }) {
  return supabase
    .from("donations")
    .insert({
      user_id: userId,
      telegram_id: telegramId,
      amount_stars: amountStars,
      payload,
      status: "pending",
    })
    .select()
    .single();
}

async function markDonationPaid({
  payload,
  telegramPaymentChargeId,
  providerPaymentChargeId,
}) {
  return supabase
    .from("donations")
    .update({
      status: "paid",
      telegram_payment_charge_id: telegramPaymentChargeId,
      provider_payment_charge_id: providerPaymentChargeId,
      paid_at: new Date().toISOString(),
    })
    .eq("payload", payload)
    .select()
    .single();
}

async function getUserDonations(userId) {
  return supabase
    .from("donations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });
}

module.exports = {
  createDonation,
  markDonationPaid,
  getUserDonations,
};
