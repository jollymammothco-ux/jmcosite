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

  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not configured");
    return json(500, { error: "Transcription is not configured yet." });
  }

  if (apiKey.startsWith("re_")) {
    console.error("OPENAI_API_KEY appears to be a Resend key, not an OpenAI key");
    return json(500, {
      error:
        "Transcription is misconfigured: OPENAI_API_KEY must be an OpenAI key (starts with sk-), not a Resend key (re-).",
    });
  }

  if (!apiKey.startsWith("sk-")) {
    console.error("OPENAI_API_KEY has an unexpected format");
    return json(500, {
      error: "Transcription is misconfigured: OPENAI_API_KEY should be from platform.openai.com and start with sk-.",
    });
  }

  const mime = typeof payload.mime === "string" && payload.mime ? payload.mime : "audio/webm";
  const extension = pickExtension(mime);
  const filename = `recording.${extension}`;

  console.log("Transcribing intake audio", {
    bytes: audioBuffer.length,
    mime,
    filename,
  });

  try {
    const form = new FormData();
    form.append("file", new File([audioBuffer], filename, { type: mime }));
    form.append("model", "whisper-1");

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
      return json(502, {
        error: whisperErrorMessage(response.status, detail),
      });
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

function pickExtension(mime) {
  const normalized = mime.toLowerCase();
  if (normalized.includes("mp4") || normalized.includes("m4a")) return "m4a";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  return "webm";
}

function whisperErrorMessage(status, detail) {
  let message = "";

  try {
    const parsed = JSON.parse(detail);
    message = parsed?.error?.message || "";
  } catch {
    message = detail;
  }

  if (status === 401) {
    return "Transcription failed: invalid OpenAI API key. Check OPENAI_API_KEY in Netlify (must start with sk-).";
  }

  if (status === 429) {
    return "Transcription is temporarily busy. Wait a moment and try again.";
  }

  if (message.includes("insufficient_quota") || message.includes("billing")) {
    return "Transcription failed: OpenAI billing is not set up. Add a payment method at platform.openai.com.";
  }

  if (message.includes("Invalid file format")) {
    return "Could not read that recording format. Try again or type your answer.";
  }

  if (message) {
    return `Could not transcribe your recording (${message}). Try again or type your answer.`;
  }

  return "Could not transcribe your recording. Try again or type your answer.";
}

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
