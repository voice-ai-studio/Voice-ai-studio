// Netlify Function: generate-audio using OpenAI TTS
// URL: /.netlify/functions/generate-audio

exports.handler = async (event) => {
  try {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: "Method not allowed" };
    }

    // Read JSON from client
    const { text, voiceName, style } = JSON.parse(event.body || "{}");

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing text" })
      };
    }

    // Get OpenAI key from Netlify environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY env var" })
      };
    }

    // Voice mapping (your UI → OpenAI voices)
    const openAIVoiceMap = {
      Zephyr: "nova",         // bright & balanced narrator
      Puck: "alloy",          // energetic
      Charon: "coral",        // deep & dramatic
      Kore: "verse",          // calm & soft
      Fenrir: "alloy",        // intense
      Aoede: "verse",         // gentle bedtime narrator

      // EXTRA VOICES
      StoryNarrator: "nova",
      Grandpa: "coral",
      DeepVoice: "coral"
    };

    // Pick voice (default alloy)
    const selectedVoice = openAIVoiceMap[voiceName] || "alloy";

    // Automatic style hints for each voice
    let styleHint = "";

    switch (voiceName) {
      case "Grandpa":
        styleHint = "old wise grandfather, warm, slow, gentle.";
        break;
      case "StoryNarrator":
        styleHint = "cinematic story narrator, clear, expressive, engaging pacing.";
        break;
      case "DeepVoice":
      case "Charon":
        styleHint = "very deep, resonant, dramatic broadcast voice.";
        break;
      case "Kore":
        styleHint = "calm, soothing, peaceful voice.";
        break;
      case "Fenrir":
        styleHint = "intense, strong, powerful emphasis.";
        break;
      case "Aoede":
        styleHint = "soft, gentle bedtime storyteller.";
        break;
      case "Zephyr":
      case "Puck":
        styleHint = "bright, lively, modern narrator.";
        break;
      default:
        styleHint = "";
    }

    // Merge user style + automatic voice style
    let combinedStyle = "";
    if (style && styleHint) combinedStyle = `${style}; ${styleHint}`;
    else if (style) combinedStyle = style;
    else if (styleHint) combinedStyle = styleHint;

    const finalInput = combinedStyle
      ? `${text}\n\n[Read this with tone: ${combinedStyle}]`
      : text;

    // Call OpenAI speech API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: selectedVoice,
        input: finalInput,
        format: "wav"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorText })
      };
    }

    // Convert output WAV → base64 for frontend
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: base64Audio })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.toString() })
    };
  }
};
