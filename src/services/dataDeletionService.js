const supabase = require("../database/supabase");

async function assertSuccess(operation, label) {
  const { error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function deleteUserData(userId) {
  await assertSuccess(
    supabase
      .from("users")
      .update({ linked_user_id: null })
      .eq("linked_user_id", userId),
    "отвязка партнёров",
  );

  for (const table of [
    "notifications",
    "donations",
    "feedback",
    "symptoms",
    "cycles",
  ]) {
    await assertSuccess(
      supabase.from(table).delete().eq("user_id", userId),
      `удаление ${table}`,
    );
  }

  await assertSuccess(
    supabase.from("users").delete().eq("id", userId),
    "удаление профиля",
  );
}

module.exports = { deleteUserData };
