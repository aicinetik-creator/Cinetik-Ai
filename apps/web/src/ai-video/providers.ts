import { generateSceneImageGemini, generateScriptGemini } from "./gemini";
import {
	generateSceneImageOpenRouter,
	generateScriptOpenRouter,
} from "./openrouter";
import type { AiBrief, AiImageResult, AiScene, AiScriptResult } from "./types";

export type AiProviderId = "openrouter" | "gemini";

export interface AiConfig {
	provider: AiProviderId;
	apiKey: string;
	textModel: string;
	imageModel: string;
}

export interface AiProviderInfo {
	id: AiProviderId;
	label: string;
	keyPlaceholder: string;
	keyHelp: string;
	/** Free text models worth offering for this provider. */
	freeTextModels: string[];
	textModelHint: string;
	imageModelHint: string;
	imageNote: string;
}

export const AI_PROVIDERS: AiProviderInfo[] = [
	{
		id: "openrouter",
		label: "OpenRouter",
		keyPlaceholder: "sk-or-v1-...",
		keyHelp: "One key for many models. Free models (id ends in :free) cost nothing.",
		freeTextModels: [
			"nvidia/nemotron-3-super-120b-a12b:free",
			"google/gemma-4-26b-a4b-it:free",
			"thinkingmachines/inkling:free",
			"inclusionai/ling-3.0-flash-sante:free",
		],
		textModelHint: "nvidia/nemotron-3-super-120b-a12b:free",
		imageModelHint: "google/gemini-2.5-flash-image",
		imageNote:
			"OpenRouter has no free image models, so scene frames need a little credit on the account.",
	},
	{
		id: "gemini",
		label: "Google Gemini",
		keyPlaceholder: "AQ....",
		keyHelp:
			"Google AI Studio key (starts with AQ.). Free for scripts; image frames need billing enabled.",
		freeTextModels: [],
		textModelHint: "gemini-3.8-flash",
		imageModelHint: "gemini-2.5-flash-image",
		imageNote:
			"Google's free tier does not include image generation (its quota is 0), so scene frames need billing enabled on the Google Cloud project. Scripts are free.",
	},
];

export function providerInfo(id: AiProviderId): AiProviderInfo {
	return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

export async function generateScript({
	brief,
	config,
}: {
	brief: AiBrief;
	config: AiConfig;
}): Promise<AiScriptResult> {
	if (config.provider === "gemini") {
		return generateScriptGemini({
			brief,
			apiKey: config.apiKey,
			textModel: config.textModel,
		});
	}
	return generateScriptOpenRouter({
		brief,
		apiKey: config.apiKey,
		textModel: config.textModel,
	});
}

export async function generateSceneImage({
	scene,
	brief,
	config,
}: {
	scene: AiScene;
	brief: AiBrief;
	config: AiConfig;
}): Promise<AiImageResult> {
	if (config.provider === "gemini") {
		return generateSceneImageGemini({
			scene,
			brief,
			apiKey: config.apiKey,
			imageModel: config.imageModel,
		});
	}
	return generateSceneImageOpenRouter({
		scene,
		brief,
		apiKey: config.apiKey,
		imageModel: config.imageModel,
	});
}
