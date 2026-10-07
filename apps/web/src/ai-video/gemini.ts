import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from "./api-key";
import type {
	AiBrief,
	AiImageResult,
	AiScene,
	AiScript,
	AiScriptResult,
} from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function sceneId(): string {
	return `scene-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function clampDuration(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return 5;
	return Math.min(20, Math.max(2, Math.round(n)));
}

function formatLabel(format: AiBrief["format"]): string {
	if (format === "vertical") return "Vertical 9:16 (Reels / Shorts)";
	if (format === "horizontal") return "Horizontal 16:9 (YouTube)";
	return "Square 1:1 (feed post)";
}

function scriptPrompt(brief: AiBrief): string {
	return [
		"You are the video director inside Cinetik AI, an Indian creator tool.",
		"Write a short, shootable video script from the creator's brief below.",
		"",
		`CREATOR BRIEF: """${brief.brief}"""`,
		`NARRATION LANGUAGE: ${brief.language}`,
		`FORMAT: ${formatLabel(brief.format)}`,
		`TARGET LENGTH: about ${brief.durationSeconds} seconds`,
		`THEME & STYLE: ${brief.style}`,
		"",
		"Rules:",
		`- Write every narration line in ${brief.language}.`,
		`- Split the video into 3 to 6 scenes whose durations add up to about ${brief.durationSeconds} seconds.`,
		"- For each scene give: a short title, the narration (voiceover) line, a vivid visual description of what the camera sees (good enough to be used as an image-generation prompt), the camera angle, and one practical shooting tip (best time to shoot, lighting, framing).",
		"- Keep it realistic to film on a phone. No studio gear assumptions.",
		"- Return ONLY minified JSON. No markdown, no commentary.",
		"",
		"JSON shape:",
		'{"title":"","logline":"","scenes":[{"title":"","narration":"","visual":"","cameraAngle":"","shootTip":"","durationSeconds":5}]}',
	].join("\n");
}

function imagePrompt({
	scene,
	brief,
}: {
	scene: AiScene;
	brief: AiBrief;
}): string {
	const aspect =
		brief.format === "vertical"
			? "9:16 vertical"
			: brief.format === "horizontal"
				? "16:9 horizontal"
				: "1:1 square";
	return [
		`Cinematic still frame for a ${brief.style} video, ${aspect} aspect ratio.`,
		`Scene: ${scene.visual || scene.title}.`,
		`Camera: ${scene.cameraAngle || "eye level"}.`,
		"Photorealistic, well lit, no text, no watermarks, no borders.",
	].join(" ");
}

async function callGemini({
	model,
	apiKey,
	body,
}: {
	model: string;
	apiKey: string;
	body: unknown;
}): Promise<unknown> {
	const res = await fetch(
		`${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Gemini ${res.status}: ${text.slice(0, 180)}`);
	}
	return res.json();
}

function extractText(data: unknown): string {
	const parts = getParts(data);
	return parts
		.map((p) => (typeof p?.text === "string" ? p.text : ""))
		.join("")
		.trim();
}

function getParts(data: unknown): Array<Record<string, unknown>> {
	const candidates = (data as { candidates?: unknown })?.candidates;
	if (!Array.isArray(candidates) || candidates.length === 0) return [];
	const content = (candidates[0] as { content?: { parts?: unknown } })?.content;
	const parts = content?.parts;
	return Array.isArray(parts) ? (parts as Array<Record<string, unknown>>) : [];
}

function extractInlineImage(
	data: unknown,
): { data: string; mimeType: string } | null {
	for (const part of getParts(data)) {
		const inline =
			(part.inlineData as { data?: string; mimeType?: string }) ??
			(part.inline_data as { data?: string; mime_type?: string });
		if (inline?.data) {
			return {
				data: inline.data,
				mimeType:
					(inline as { mimeType?: string }).mimeType ??
					(inline as { mime_type?: string }).mime_type ??
					"image/png",
			};
		}
	}
	return null;
}

function parseScriptJson(text: string): Record<string, unknown> {
	const cleaned = text
		.replace(/^```(?:json)?/i, "")
		.replace(/```$/i, "")
		.trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start === -1 || end === -1) {
		throw new Error("Model did not return JSON");
	}
	return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: mimeType });
}

export async function generateScript({
	brief,
	apiKey,
	textModel,
}: {
	brief: AiBrief;
	apiKey: string;
	textModel?: string;
}): Promise<AiScriptResult> {
	if (!apiKey) {
		return {
			script: demoScript({ brief }),
			source: "demo",
			warning: "No Gemini API key set, so this is a sample script.",
		};
	}

	try {
		const data = await callGemini({
			model: textModel || DEFAULT_TEXT_MODEL,
			apiKey,
			body: {
				contents: [{ parts: [{ text: scriptPrompt(brief) }] }],
				generationConfig: {
					temperature: 0.85,
					responseMimeType: "application/json",
				},
			},
		});

		const raw = parseScriptJson(extractText(data));
		const rawScenes = Array.isArray(raw.scenes) ? raw.scenes : [];
		const scenes: AiScene[] = rawScenes.map((scene, index) => {
			const s = scene as Record<string, unknown>;
			return {
				id: sceneId(),
				index,
				title: String(s.title ?? `Scene ${index + 1}`),
				narration: String(s.narration ?? ""),
				visual: String(s.visual ?? ""),
				cameraAngle: String(s.cameraAngle ?? s.camera_angle ?? ""),
				shootTip: String(s.shootTip ?? s.shoot_tip ?? ""),
				durationSeconds: clampDuration(s.durationSeconds ?? s.duration_seconds),
			};
		});

		if (scenes.length === 0) {
			throw new Error("Model returned no scenes");
		}

		return {
			script: {
				title: String(raw.title ?? "Untitled video"),
				logline: String(raw.logline ?? ""),
				scenes,
			},
			source: "ai",
		};
	} catch (error) {
		return {
			script: demoScript({ brief }),
			source: "demo",
			warning: `AI request failed (${error instanceof Error ? error.message : "unknown error"}). Showing a sample script.`,
		};
	}
}

export async function generateSceneImage({
	scene,
	brief,
	apiKey,
	imageModel,
}: {
	scene: AiScene;
	brief: AiBrief;
	apiKey: string;
	imageModel?: string;
}): Promise<AiImageResult> {
	if (!apiKey) {
		return { blob: await demoSceneImage({ scene, brief }), source: "demo" };
	}

	try {
		const data = await callGemini({
			model: imageModel || DEFAULT_IMAGE_MODEL,
			apiKey,
			body: {
				contents: [{ parts: [{ text: imagePrompt({ scene, brief }) }] }],
			},
		});
		const inline = extractInlineImage(data);
		if (!inline) {
			throw new Error("No image returned");
		}
		return {
			blob: base64ToBlob(inline.data, inline.mimeType),
			source: "ai",
		};
	} catch (error) {
		return {
			blob: await demoSceneImage({ scene, brief }),
			source: "demo",
			warning: `Image generation failed (${error instanceof Error ? error.message : "unknown error"}). Using a placeholder.`,
		};
	}
}

/** A canned, sensible script used when no key is present or the API fails. */
function demoScript({ brief }: { brief: AiBrief }): AiScript {
	const subject =
		brief.brief.trim().split(/[.\n]/)[0]?.slice(0, 70) || "your product";
	const beats = [
		{
			title: "Hook",
			narration: `Ever wished ${subject} was simpler? Watch this.`,
			visual: `A close-up of a person holding the product up to the camera, natural window light, ${brief.style.toLowerCase()} mood`,
			cameraAngle: "Handheld close-up, eye level",
			shootTip: "Shoot in the morning near a window for soft, even light.",
			durationSeconds: 5,
		},
		{
			title: "The problem",
			narration: "Most people give up because it feels like too much work.",
			visual: "Medium shot of the same person talking to camera, slightly frustrated expression, everyday setting",
			cameraAngle: "Medium shot, chest up",
			shootTip: "Keep the phone at chest height so you look natural.",
			durationSeconds: 6,
		},
		{
			title: "The reveal",
			narration: "Then I tried this — and two weeks later I could see the difference.",
			visual: "Product placed on a clean surface with a soft highlight, gentle push-in",
			cameraAngle: "Slow push-in, product centred",
			shootTip: "Place the product on a plain surface so nothing distracts.",
			durationSeconds: 7,
		},
		{
			title: "Call to action",
			narration: "Tap the link and try it yourself today.",
			visual: "Person smiling at camera, product in hand, bright and upbeat, space for an on-screen text overlay",
			cameraAngle: "Selfie angle, slightly above eye level",
			shootTip: "Leave empty space at the top for your text overlay.",
			durationSeconds: 5,
		},
	];

	return {
		title: "Sample video",
		logline: `A sample ${brief.style.toLowerCase()} script generated in demo mode. Add a Gemini API key for a script written from your own brief.`,
		scenes: beats.map((beat, index) => ({
			id: sceneId(),
			index,
			...beat,
		})),
	};
}

const BRAND_GRADIENT = ["#00D2FF", "#B026FF"];

/** Draws a branded placeholder frame so the flow works with no API key. */
async function demoSceneImage({
	scene,
	brief,
}: {
	scene: AiScene;
	brief: AiBrief;
}): Promise<Blob> {
	const sizes: Record<AiBrief["format"], [number, number]> = {
		vertical: [1080, 1920],
		horizontal: [1920, 1080],
		square: [1080, 1080],
	};
	const [width, height] = sizes[brief.format];

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return new Blob([], { type: "image/png" });
	}

	const gradient = ctx.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, "#0B0B12");
	gradient.addColorStop(0.55, "#2A1250");
	gradient.addColorStop(1, "#0B0B12");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	const glow = ctx.createRadialGradient(
		width * 0.2,
		height * 0.2,
		0,
		width * 0.2,
		height * 0.2,
		Math.max(width, height) * 0.8,
	);
	glow.addColorStop(0, "rgba(0,210,255,0.55)");
	glow.addColorStop(0.5, "rgba(176,38,255,0.35)");
	glow.addColorStop(1, "rgba(11,11,18,0)");
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, width, height);

	const accent = ctx.createLinearGradient(0, 0, width, 0);
	accent.addColorStop(0, BRAND_GRADIENT[0]);
	accent.addColorStop(1, BRAND_GRADIENT[1]);
	ctx.fillStyle = accent;
	ctx.fillRect(0, height - 14, width, 14);

	ctx.fillStyle = "rgba(255,255,255,0.92)";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	const pad = Math.round(width * 0.08);
	ctx.font = `600 ${Math.round(width * 0.045)}px Inter, system-ui, sans-serif`;
	ctx.fillText(`SCENE ${scene.index + 1}`, pad, pad);

	ctx.font = `700 ${Math.round(width * 0.075)}px Inter, system-ui, sans-serif`;
	wrapText({
		ctx,
		text: scene.title || "Scene",
		x: pad,
		y: pad + Math.round(width * 0.09),
		maxWidth: width - pad * 2,
		lineHeight: Math.round(width * 0.095),
	});

	ctx.font = `400 ${Math.round(width * 0.036)}px Inter, system-ui, sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,0.72)";
	wrapText({
		ctx,
		text: scene.visual || scene.narration || "Placeholder frame",
		x: pad,
		y: height * 0.62,
		maxWidth: width - pad * 2,
		lineHeight: Math.round(width * 0.05),
	});

	ctx.font = `500 ${Math.round(width * 0.03)}px Inter, system-ui, sans-serif`;
	ctx.fillStyle = "rgba(255,255,255,0.5)";
	ctx.fillText("Cinetik AI · placeholder frame", pad, height - pad);

	return await new Promise<Blob>((resolve) => {
		canvas.toBlob(
			(blob) => resolve(blob ?? new Blob([], { type: "image/png" })),
			"image/png",
		);
	});
}

function wrapText({
	ctx,
	text,
	x,
	y,
	maxWidth,
	lineHeight,
}: {
	ctx: CanvasRenderingContext2D;
	text: string;
	x: number;
	y: number;
	maxWidth: number;
	lineHeight: number;
}): void {
	const words = text.split(/\s+/);
	let line = "";
	let cursorY = y;
	for (const word of words) {
		const test = line ? `${line} ${word}` : word;
		if (ctx.measureText(test).width > maxWidth && line) {
			ctx.fillText(line, x, cursorY);
			line = word;
			cursorY += lineHeight;
		} else {
			line = test;
		}
	}
	if (line) ctx.fillText(line, x, cursorY);
}
