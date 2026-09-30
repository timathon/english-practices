export interface Env {
  APP_PASSCODE?: string;
  GOOGLE_API_KEY?: string; // Paid / Default
  GOOGLE_API_KEY_FREE?: string; // Free tier
  R2_BUCKET?: R2Bucket;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Passcode",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 1. Health check
    if (url.pathname === "/" || url.pathname === "/api/health") {
      return new Response(JSON.stringify({ status: "ok", name: "tts-api" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Passcode Auth Verification
    if (url.pathname === "/api/auth" && request.method === "POST") {
      try {
        const body = (await request.json()) as { passcode?: string };
        const correctPasscode = env.APP_PASSCODE || "1_titiaisI";
        if (body.passcode && body.passcode === correctPasscode) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: false, error: "Invalid passcode" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // Check auth for protected routes
    const authPasscode = request.headers.get("X-Passcode");
    const requiredPasscode = env.APP_PASSCODE || "1_titiaisI";
    if (authPasscode !== requiredPasscode) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 3. TTS Generation Proxy (Calls Gemini Flash TTS)
    if (url.pathname === "/api/tts" && request.method === "POST") {
      try {
        const payload = (await request.json()) as {
          model?: string;
          prompt: string;
          voiceName?: string;
          keyType?: 'paid' | 'free' | 'custom';
          customApiKey?: string;
        };

        // Determine API key
        let apiKey = env.GOOGLE_API_KEY;
        if (payload.keyType === 'free') {
          apiKey = env.GOOGLE_API_KEY_FREE || env.GOOGLE_API_KEY;
        } else if (payload.keyType === 'custom' && payload.customApiKey) {
          apiKey = payload.customApiKey;
        }

        if (!apiKey) {
          return new Response(JSON.stringify({ error: "No valid Gemini API key available on Cloudflare or provided in request." }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        const model = payload.model || "gemini-2.5-flash-preview-tts";
        const voiceName = payload.voiceName || (model.includes("3.1") ? "Achernar" : "Kore");

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Gemini REST API specification for Audio TTS
        const geminiBody = {
          contents: [
            {
              role: "user",
              parts: [{ text: payload.prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["audio"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName,
                },
              },
            },
          },
        };

        const startTime = Date.now();
        const resp = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });
        const elapsed = Date.now() - startTime;

        if (!resp.ok) {
          const errText = await resp.text();
          return new Response(JSON.stringify({ 
            error: `Gemini API returned ${resp.status}`, 
            status: resp.status,
            details: errText,
            elapsedMs: elapsed,
            model: model,
          }), {
            status: resp.status,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        const data: any = await resp.json();
        const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!candidate || !candidate.data) {
          return new Response(JSON.stringify({ error: "Empty audio payload received from Gemini." }), {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          mimeType: candidate.mimeType || "audio/wav",
          data: candidate.data, // Base64 audio PCM/WAV data
          modelUsed: model,
        }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // 4. Direct Upload to R2 Bucket
    if (url.pathname === "/api/upload" && request.method === "POST") {
      if (!env.R2_BUCKET) {
        return new Response(JSON.stringify({ error: "R2_BUCKET binding not found." }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      try {
        const key = url.searchParams.get("key");
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing 'key' query parameter" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        const contentType = request.headers.get("Content-Type") || "audio/mpeg";
        const bodyBuffer = await request.arrayBuffer();

        await env.R2_BUCKET.put(key, bodyBuffer, {
          httpMetadata: { contentType: contentType },
        });

        return new Response(JSON.stringify({
          success: true,
          key: key,
          url: `https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/${key}`,
        }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
