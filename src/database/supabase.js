const { createClient } = require("@supabase/supabase-js");

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;

if (!process.env.SUPABASE_URL || !supabaseKey) {
  throw new Error("SUPABASE_URL и секретный ключ Supabase обязательны");
}

if (supabaseKey.startsWith("sb_publishable_")) {
  throw new Error(
    "LOONA нельзя запускать с публичным Supabase-ключом. Используйте SUPABASE_SECRET_KEY.",
  );
}

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

module.exports = supabase;
