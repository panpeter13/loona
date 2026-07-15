const supabase = require("../database/supabase");

async function recordPaidDonation({
  userId,
  telegramId,
  amountStars,
  payload,
  telegramPaymentChargeId,
  providerPaymentChargeId,
}) {
  return supabase
    .from("donations")
    .insert({
      user_id: userId,
      telegram_id: telegramId,
      amount_stars: amountStars,
      payload,
      status: "paid",
      telegram_payment_charge_id: telegramPaymentChargeId,
      provider_payment_charge_id: providerPaymentChargeId,
      paid_at: new Date().toISOString(),
    })
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
  recordPaidDonation,
  getUserDonations,
};
