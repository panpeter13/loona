const supabase = require("../database/supabase");

async function saveFeedback(userId, type, message) {
  return await supabase.from("feedback").insert({
    user_id: userId,
    type,
    message,
  });
}

async function getLatestFeedback(limit = 10) {
  return await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
}

async function updateFeedbackStatus(feedbackId, status) {
  return await supabase
    .from("feedback")
    .update({
      status,
    })
    .eq("id", feedbackId);
}

module.exports = {
  saveFeedback,
  getLatestFeedback,
  updateFeedbackStatus,
};
