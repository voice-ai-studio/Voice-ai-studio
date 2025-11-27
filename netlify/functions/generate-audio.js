// Netlify Function: generate-audio
// It will live at /.netlify/functions/generate-audio

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { text, voiceName, style } = JSON.parse(event.body || '{}');

    if (!text || !voiceName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text or voiceName' })
      };
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfigured: no API key' })
      };
    }

    const userPrompt =
      `Say the following text: "${text}".\n\n` +
      `Style instructions: Use a ${voiceName} voice. ` +
      (style ? `Tone: ${style}` : '');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/` +
                `gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    };

    // Netlify functions on Node 18+ have global fetch
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (!resp.ok) {
      const msg = data.error ? data.error.message : 'Unknown Google API error';
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: msg })
      };
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    const inlineData = parts?.[0]?.inlineData;

    if (!inlineData || !inlineData.data) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No audio data returned from Google' })
      };
    }

    // Send base64 audio back to browser
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ audioBase64: inlineData.data })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
