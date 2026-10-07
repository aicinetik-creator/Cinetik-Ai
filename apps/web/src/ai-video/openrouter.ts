import {
	DEFAULT_OPENROUTER_IMAGE_MODEL,
	DEFAULT_OPENROUTER_TEXT_MODEL,
} from "./api-key";
import {
	demoSceneImage,
	demoScript,
	friendlyProviderError,
	imagePrompt,
	parseScriptJson,
	scriptPrompt,
	toScript,
} from "./shared";
import type { AiBrief, AiImageResult, AiScene, AiScriptResult } from "./types";

const API_BASE = "https://openrouter.ai/api/v1";

type ChatContent = string;

async function chat({
	apiKey,
	model,
	content,
	modalities,
	timeoutMs = 120000,
}: {
	apiKey: string;
	model: string;
	content: ChatContent;
	modalities?: string[];
	timeoutMs?: number;
}): Promise<Record<string, unknown>> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	let res: Response;
	try {
		res = await fetch(`${API_BASE}/chat/completions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "https://edit.cinetik.in",
				"X-Title": "Cinetik Editor",
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content }],
				...(modalities ? { modalities } : {}),
			}),
			signal: controller.signal,
		});
	} catch (error) {
		clearTimeout(timer);
		throw new Error(
			error instanceof Error && error.name === "AbortError"
				? "OpenRouter timed out"
				: `Could not reach OpenRouter (${error instanceof Error ? error.message : "network error"})`,
		);
	}
	clearTimeout(timer);

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			friendlyProviderError({ provider: "OpenRouter", status: res.status, body: text }),
		);
	}
	return (await res.json()) as Record<string, unknown>;
}

function messageOf(data: Record<string, unknown>): Record<string, unknown> {
	const choices = data.choices;
	if (!Array.isArray(choices) || choices.length === 0) {
		throw new Error("OpenRouter returned no choices");
	}
	const message = (choices[0] as { message?: unknown })?.message;
	if (!message || typeof message !== "object") {
		throw new Error("OpenRouter returned no message");
	}
	return message as Record<string, unknown>;
}

export async function generateScriptOpenRouter({
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
			warning: "No OpenRouter API key set, so this is a sample script.",
		};
	}

	try {
		const data = await chat({
			apiKey,
			model: textModel || DEFAULT_OPENROUTER_TEXT_MODEL,
			content: scriptPrompt(brief),
		});
		const message = messageOf(data);
		const text = typeof message.content === "string" ? message.content : "";
		const script = toScript(parseScriptJson(text));
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

export async function generateSceneImageOpenRouter({
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
		const data = await chat({
			apiKey,
			model: imageModel || DEFAULT_OPENROUTER_IMAGE_MODEL,
			content: imagePrompt({ scene, brief }),
			modalities: ["image", "text"],
		});
		const message = messageOf(data);
		const images = Array.isArray(message.images) ? message.images : [];
		const first = images[0] as
			| { image_url?: { url?: string } }
			| undefined;
		const url = first?.image_url?.url;
		if (!url || !url.startsWith("data:")) {
			throw new Error("OpenRouter returned no image");
		}
		const commaIndex = url.indexOf(",");
		const meta = url.slice(5, commaIndex);
		const mimeType = meta.split(";")[0] || "image/png";
		const base64 = url.slice(commaIndex + 1);
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return { blob: new Blob([bytes], { type: mimeType }), source: "ai" };
	} catch (error) {
		return {
			blob: await demoSceneImage({ scene, brief }),
			source: "demo",
			warning: `${error instanceof Error ? error.message : "Image generation failed."} Using a placeholder.`,
		};
	}
}
