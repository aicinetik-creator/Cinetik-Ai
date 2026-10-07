import type { AiBrief, AiImageResult, AiScene, AiScript } from "./types";

export function sceneId(): string {
	return `scene-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function clampDuration(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return 5;
	return Math.min(20, Math.max(2, Math.round(n)));
}

export function formatLabel(format: AiBrief["format"]): string {
	if (format === "vertical") return "Vertical 9:16 (Reels / Shorts)";
	if (format === "horizontal") return "Horizontal 16:9 (YouTube)";
	return "Square 1:1 (feed post)";
}

export function scriptPrompt(brief: AiBrief): string {
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
		"- Use straight double quotes, escape any quotes inside a string, and never leave a trailing comma.",
		"- Return ONLY minified JSON. No markdown, no commentary.",
		"",
		"JSON shape:",
		'{"title":"","logline":"","scenes":[{"title":"","narration":"","visual":"","cameraAngle":"","shootTip":"","durationSeconds":5}]}',
	].join("\n");
}

export function imagePrompt({
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

function stripFences(text: string): string {
	const cleaned = text
		.replace(/^```(?:json)?/i, "")
		.replace(/```$/i, "")
		.trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start === -1 || end === -1) return cleaned;
	return cleaned.slice(start, end + 1);
}

function removeTrailingCommas(text: string): string {
	return text.replace(/,\s*([}\]])/g, "$1");
}

function tryParse(text: string): Record<string, unknown> | null {
	try {
		const value = JSON.parse(text) as unknown;
		return value && typeof value === "object"
			? (value as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

/** Pulls the first balanced {...} object that parses, starting at `from`. */
function salvageObjects(text: string): Record<string, unknown>[] {
	const found: Record<string, unknown>[] = [];
	let depth = 0;
	let objectStart = -1;
	let inString = false;
	let escaped = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === "{") {
			if (depth === 0) objectStart = i;
			depth++;
			continue;
		}
		if (ch === "}") {
			depth--;
			if (depth === 0 && objectStart !== -1) {
				const piece = text.slice(objectStart, i + 1);
				const parsed =
					tryParse(piece) ?? tryParse(removeTrailingCommas(piece));
				if (parsed) found.push(parsed);
				objectStart = -1;
			}
			if (depth < 0) depth = 0;
		}
	}
	return found;
}

function firstString({
	text,
	key,
}: {
	text: string;
	key: string;
}): string {
	const match = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
	if (!match) return "";
	try {
		return JSON.parse(`"${match[1]}"`) as string;
	} catch {
		return match[1];
	}
}

/**
 * Free models occasionally emit slightly malformed JSON. Rather than throwing the
 * whole script away, try the strict parse, then a comma-repaired parse, then
 * salvage whatever scene objects are individually valid.
 */
export function parseScriptJson(text: string): Record<string, unknown> {
	const cleaned = stripFences(text);

	const direct = tryParse(cleaned) ?? tryParse(removeTrailingCommas(cleaned));
	if (direct && (Array.isArray(direct.scenes) || direct.title || direct.logline)) {
		return direct;
	}

	const scenesIndex = cleaned.search(/"scenes"\s*:/);
	const searchFrom = scenesIndex === -1 ? 0 : cleaned.indexOf("[", scenesIndex);
	const objects = salvageObjects(
		searchFrom > 0 ? cleaned.slice(searchFrom) : cleaned,
	);
	const sceneLike = objects.filter(
		(o) => o.narration !== undefined || o.visual !== undefined || o.title !== undefined,
	);

	if (sceneLike.length > 0) {
		return {
			title: firstString({ text: cleaned, key: "title" }) || "Untitled video",
			logline: firstString({ text: cleaned, key: "logline" }),
			scenes: sceneLike,
		};
	}

	if (direct) return direct;
	throw new Error("The AI reply was not valid JSON");
}

/** Normalises whatever shape the model returned into our scene list. */
export function toScenes(raw: Record<string, unknown>): AiScene[] {
	const rawScenes = Array.isArray(raw.scenes) ? raw.scenes : [];
	return rawScenes.map((scene, index) => {
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
}

export function toScript(raw: Record<string, unknown>): AiScript {
	return {
		title: String(raw.title ?? "Untitled video"),
		logline: String(raw.logline ?? ""),
		scenes: toScenes(raw),
	};
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new Blob([bytes], { type: mimeType });
}

/** A canned, sensible script used when no key is present or the API fails. */
export function demoScript({ brief }: { brief: AiBrief }): AiScript {
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
			visual:
				"Medium shot of the same person talking to camera, slightly frustrated expression, everyday setting",
			cameraAngle: "Medium shot, chest up",
			shootTip: "Keep the phone at chest height so you look natural.",
			durationSeconds: 6,
		},
		{
			title: "The reveal",
			narration:
				"Then I tried this - and two weeks later I could see the difference.",
			visual:
				"Product placed on a clean surface with a soft highlight, gentle push-in",
			cameraAngle: "Slow push-in, product centred",
			shootTip: "Place the product on a plain surface so nothing distracts.",
			durationSeconds: 7,
		},
		{
			title: "Call to action",
			narration: "Tap the link and try it yourself today.",
			visual:
				"Person smiling at camera, product in hand, bright and upbeat, space for an on-screen text overlay",
			cameraAngle: "Selfie angle, slightly above eye level",
			shootTip: "Leave empty space at the top for your text overlay.",
			durationSeconds: 5,
		},
	];

	return {
		title: "Sample video",
		logline: `A sample ${brief.style.toLowerCase()} script generated in demo mode. Add a provider key for a script written from your own brief.`,
		scenes: beats.map((beat, index) => ({ id: sceneId(), index, ...beat })),
	};
}

const BRAND_GRADIENT = ["#00D2FF", "#B026FF"];

/** Draws a branded placeholder frame so the flow works with no key / no credits. */
export async function demoSceneImage({
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
	if (!ctx) return new Blob([], { type: "image/png" });

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
	ctx.fillText("Cinetik AI - placeholder frame", pad, height - pad);

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

/** Turns a provider HTTP failure into something a creator can act on. */
export function friendlyProviderError({
	provider,
	status,
	body,
}: {
	provider: string;
	status: number;
	body: string;
}): string {
	const p = provider.toLowerCase();
	if (status === 402) {
		return p === "openrouter"
			? "OpenRouter has no credit for image models, so frames fell back to placeholders. Add a little credit, or switch to Google Gemini (free tier) in the AI provider settings to get real frames."
			: "This Google account has no quota left for this model.";
	}
	if (status === 401 || status === 403) {
		return "That API key was rejected. Check it in the AI provider settings.";
	}
	if (status === 429) {
		return "Rate limited - free models allow only a few requests per minute. Wait a moment and try again.";
	}
	const detail = body.replace(/\s+/g, " ").slice(0, 160);
	return `${provider} returned ${status}${detail ? `: ${detail}` : ""}`;
}
