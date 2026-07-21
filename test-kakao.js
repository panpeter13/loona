const assert = require("node:assert/strict");
const { createApp } = require("./src/kakao/server");

async function run() {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((res) => res.json());
    assert.equal(health.ok, true);
    assert.equal(health.version, require("./package.json").version);

    const kakao = await fetch(`http://127.0.0.1:${port}/kakao/skill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).then((res) => res.json());

    assert.equal(kakao.version, "2.0");
    assert.ok(kakao.template.outputs[0].simpleText.text);
    console.log("Kakao HTTP API OK");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
