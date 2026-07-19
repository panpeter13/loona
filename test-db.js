require("dotenv").config({
  path: process.env.DOTENV_CONFIG_PATH || ".env",
  quiet: true,
});

const supabase = require("./src/database/supabase");

async function test() {
  const startedAt = Date.now();
  const { error, count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  if (error) throw error;

  console.log(
    `Supabase OK: users=${count ?? 0}, latency=${Date.now() - startedAt}ms`,
  );
}

test().catch((error) => {
  console.error(`Supabase ERROR: ${error.message}`);
  process.exitCode = 1;
});
