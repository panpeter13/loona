const supabase = require("../database/supabase");

async function getExportData(user) {
  const { data: cycles, error: cyclesError } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (cyclesError) {
    return {
      data: null,
      error: cyclesError,
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
    },
    error: null,
  };
}

module.exports = {
  getExportData,
};
