import { DEFAULT_GEMINI_TTS_MODEL, DEFAULT_GEMINI_VOICE } from "./api-key";
import { friendlyProviderError } from "./shared";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface VoiceoverResult {
	blob: Blob | null;
	warning?: string;
}

/** Wraps raw 16-bit PCM in a WAV container so it can be played and put on a timeline. */
export function pcm16ToWav({
	pcm,
	sampleRate = 24000,
	channels = 1,
}: {
	pcm: Uint8Array;
	sampleRate?: number;
	channels?: number;
}): Blob {
	const header = new ArrayBuffer(44);
	const view = new DataView(header);
	const writeAscii = (offset: number, text: string) => {
		for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
	};

	const bytesPerSample = 2;
	const byteRate = sampleRate * channels * bytesPerSample;

	writeAscii(0, "RIFF");
	view.setUint32(4, 36 + pcm.byteLength, true);
	writeAscii(8, "WAVE");
	writeAscii(12, "fmt ");
	view.setUint32(16, 16, true); // PCM chunk size
	view.setUint16(20, 1, true); // PCM format
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, channels * bytesPerSample, true);
	view.setUint16(34, 16, true); // bits per sample
	writeAscii(36, "data");
	view.setUint32(40, pcm.byteLength, true);

	return new Blob([header, pcm], { type: "audio/wav" });
}

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** Reads the sample rate out of a mime type like audio/L16;codec=pcm;rate=24000. */
function sampleRateFromMimeType(mimeType: string): number {
	const match = /rate=(\d+)/i.exec(mimeType);
	return match ? Number(match[1]) : 24000;
}

/**
 * Generates a real spoken voiceover with Google TTS and returns it as a WAV blob.
 * There is no synthetic fallback: on failure this returns no audio plus the reason,
 * so the UI can never present a fake voice as a real one.
 */
export async function generateVoiceoverGemini({
	text,
	apiKey,
	ttsModel,
	voice,
}: {
	text: string;
	apiKey: string;
	ttsModel?: string;
	voice?: string;
}): Promise<VoiceoverResult> {
	if (!apiKey) {
		return { blob: null, warning: "Add a Google Gemini API key to generate voiceover." };
	}
	const clean = text.trim();
	if (!clean) return { blob: null, warning: "This scene has no narration to speak." };

	try {
		const res = await fetch(
			`${API_BASE}/${encodeURIComponent(ttsModel || DEFAULT_GEMINI_TTS_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: `Read this as a natural video voiceover. Speak only the words, do not add anything: ${clean}`,
								},
							],
						},
					],
					generationConfig: {
						responseModalities: ["AUDIO"],
						speechConfig: {
							voiceConfig: {
								prebuiltVoiceConfig: {
									voiceName: voice || DEFAULT_GEMINI_VOICE,
								},
							},
						},
					},
				}),
			},
		);

		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(
				friendlyProviderError({ provider: "gemini", status: res.status, body }),
			);
		}

		const data = (await res.json()) as {
			candidates?: Array<{
				content?: {
					parts?: Array<{
						inlineData?: { data?: string; mimeType?: string };
						inline_data?: { data?: string; mime_type?: string };
					}>;
				};
			}>;
		};

		const parts = data.candidates?.[0]?.content?.parts ?? [];
		for (const part of parts) {
			const inline = part.inlineData ?? part.inline_data;
			if (inline?.data) {
				const mimeType =
					(inline as { mimeType?: string }).mimeType ??
					(inline as { mime_type?: string }).mime_type ??
					"audio/L16;rate=24000";
				return {
					blob: pcm16ToWav({
						pcm: base64ToBytes(inline.data),
						sampleRate: sampleRateFromMimeType(mimeType),
					}),
				};
			}
		}

		return { blob: null, warning: "The speech model returned no audio." };
	} catch (error) {
		return {
			blob: null,
			warning:
				error instanceof Error ? error.message : "Could not generate the voiceover.",
		};
	}
}
