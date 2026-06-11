const supabase = require("../database/supabase");

async function getExportData(user) {
  const { data: cycles, error: cyclesError } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: symptoms, error: symptomsError } = await supabase
    .from("symptoms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (cyclesError || symptomsError) {
    return {
      data: null,
      error: cyclesError || symptomsError,
    };
  }

  return {
    data: {
      exported_at: new Date().toISOString(),
      settings: {
        cycle_length: user.cycle_length,
        period_length: user.period_length,
        timezone: user.timezone,
        language: user.language,
      },
      cycles,
      symptoms,
    },
    error: null,
  };
}

module.exports = {
  getExportData,
};
