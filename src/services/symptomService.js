const supabase = require("../database/supabase");

async function createSymptom({ userId, cycleId, date, type, intensity }) {
  return supabase.from("symptoms").insert({
    user_id: userId,
    cycle_id: cycleId,
    symptom_date: date,
    type,
    intensity,
  });
}

module.exports = {
  createSymptom,
};
