const assert = require("assert");
const { handler } = require("./transcribe-intake");

(async () => {
  const missingAudio = await handler({
    httpMethod: "POST",
    body: JSON.stringify({}),
  });
  assert.strictEqual(missingAudio.statusCode, 400);
  assert.ok(JSON.parse(missingAudio.body).error.includes("No audio"));

  const emptyAudio = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ audio: "" }),
  });
  assert.strictEqual(emptyAudio.statusCode, 400);

  const savedKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const noKey = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ audio: Buffer.from("test").toString("base64") }),
  });
  assert.strictEqual(noKey.statusCode, 500);

  if (savedKey) process.env.OPENAI_API_KEY = savedKey;

  const options = await handler({ httpMethod: "OPTIONS" });
  assert.strictEqual(options.statusCode, 204);

  console.log("transcribe-intake tests passed");
})();
