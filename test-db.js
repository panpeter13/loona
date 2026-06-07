require("dotenv").config();

const supabase = require("./supabase");

async function test() {
  const { data, error } = await supabase.from("users").select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

test();
