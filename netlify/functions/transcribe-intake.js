const MAX_BYTES = 5 * 1024 * 1024;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const audioBase64 = typeof payload.audio === "string" ? payload.audio.trim() : "";
  if (!audioBase64) {
    return json(400, { error: "No audio was provided." });
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audioBase64, "base64");
  } catch {
    return json(400, { error: "Could not read the recording." });
  }

  if (!audioBuffer.length) {
    return json(400, { error: "The recording was empty." });
  }

  if (audioBuffer.length > MAX_BYTES) {
    return json(400, { error: "Recording is too long. Please keep it under 3 minutes." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not configured");
    return json(500, { error: "Transcription is not configured yet." });
  }

  const mime = typeof payload.mime === "string" && payload.mime ? payload.mime : "audio/webm";
  const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";

  try {
    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: mime }), `recording.${extension}`);
    form.append("model", "whisper-1");
    form.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Whisper API error:", response.status, detail);
      return json(502, { error: "Could not transcribe your recording. Try again or type your answer." });
    }

    const data = await response.json();
    const transcript = typeof data.text === "string" ? data.text.trim() : "";

    if (!transcript) {
      return json(400, { error: "We couldn't pick up any speech. Try recording again." });
    }

    return json(200, { transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return json(502, { error: "Could not transcribe your recording. Try again or type your answer." });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
