import { DEFAULT_GEMINI_IMAGE_MODEL, DEFAULT_GEMINI_TEXT_MODEL } from "./api-key";
import {
	base64ToBlob,
	demoSceneImage,
	demoScript,
	friendlyProviderError,
	imagePrompt,
	parseScriptJson,
	scriptPrompt,
	toScript,
} from "./shared";
import type { AiBrief, AiImageResult, AiScene, AiScriptResult } from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getParts(data: unknown): Array<Record<string, unknown>> {
	const candidates = (data as { candidates?: unknown })?.candidates;
	if (!Array.isArray(candidates) || candidates.length === 0) return [];
	const content = (candidates[0] as { content?: { parts?: unknown } })?.content;
	const parts = content?.parts;
	return Array.isArray(parts) ? (parts as Array<Record<string, unknown>>) : [];
}

function extractText(data: unknown): string {
	return getParts(data)
		.map((p) => (typeof p?.text === "string" ? p.text : ""))
		.join("")
		.trim();
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
		throw new Error(friendlyProviderError({ provider: "Gemini", status: res.status, body: text }));
	}
	return res.json();
}

export async function generateScriptGemini({
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
			model: textModel || DEFAULT_GEMINI_TEXT_MODEL,
			apiKey,
			body: {
				contents: [{ parts: [{ text: scriptPrompt(brief) }] }],
				generationConfig: {
					temperature: 0.85,
					responseMimeType: "application/json",
				},
			},
		});
		const script = toScript(parseScriptJson(extractText(data)));
		if (script.scenes.length === 0) throw new Error("Model returned no scenes");
		return { script, source: "ai" };
	} catch (error) {
		return {
			script: demoScript({ brief }),
			source: "demo",
			warning: `AI request failed (${error instanceof Error ? error.message : "unknown error"}). Showing a sample script.`,
		};
	}
}

export async function generateSceneImageGemini({
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
			model: imageModel || DEFAULT_GEMINI_IMAGE_MODEL,
			apiKey,
			body: { contents: [{ parts: [{ text: imagePrompt({ scene, brief }) }] }] },
		});
		const inline = extractInlineImage(data);
		if (!inline) throw new Error("No image returned");
		return { blob: base64ToBlob(inline.data, inline.mimeType), source: "ai" };
	} catch (error) {
		return {
			blob: await demoSceneImage({ scene, brief }),
			source: "demo",
			warning: `Image generation failed (${error instanceof Error ? error.message : "unknown error"}). Using a placeholder.`,
		};
	}
}
