import type { AiConfig, AiProviderId } from "./providers";

const PROVIDER_STORAGE = "cinetik.ai-video.provider";

const GEMINI_KEY = "cinetik.ai-video.gemini-key";
const GEMINI_TEXT_MODEL = "cinetik.ai-video.gemini-model";
const GEMINI_IMAGE_MODEL = "cinetik.ai-video.gemini-image-model";

const OPENROUTER_KEY = "cinetik.ai-video.openrouter-key";
const OPENROUTER_TEXT_MODEL = "cinetik.ai-video.openrouter-text-model";
const OPENROUTER_IMAGE_MODEL = "cinetik.ai-video.openrouter-image-model";

export const DEFAULT_PROVIDER: AiProviderId = "openrouter";

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.8-flash";
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * Default script model. Paid, but a full script costs a fraction of a cent and the
 * quality matters for demos. The free models below stay available as a fallback.
 */
export const DEFAULT_OPENROUTER_TEXT_MODEL = "google/gemini-2.5-flash";
export const DEFAULT_OPENROUTER_IMAGE_MODEL = "google/gemini-2.5-flash-image";

/** Free text models, offered in the picker as a zero-cost fallback. */
export const OPENROUTER_FREE_TEXT_MODELS = [
	"nvidia/nemotron-3-super-120b-a12b:free",
	"google/gemma-4-26b-a4b-it:free",
	"thinkingmachines/inkling:free",
	"inclusionai/ling-3.0-flash-sante:free",
];

function read({ name, fallback }: { name: string; fallback: string }): string {
	if (typeof window === "undefined") return fallback;
	try {
		return window.localStorage.getItem(name) ?? fallback;
	} catch {
		return fallback;
	}
}

function write({ name, value }: { name: string; value: string }): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(name, value);
	} catch {
		// storage may be unavailable (private mode) - ignore
	}
}

/**
 * Keys are kept only in this browser's localStorage and are sent directly to the
 * provider (OpenRouter or Google). Nothing is proxied through Cinetik's servers,
 * and no key is ever committed to the repository.
 */
export const aiVideoKeys = {
	getProvider: (): AiProviderId => {
		const value = read({ name: PROVIDER_STORAGE, fallback: DEFAULT_PROVIDER });
		return value === "gemini" ? "gemini" : "openrouter";
	},
	setProvider: (value: AiProviderId) =>
		write({ name: PROVIDER_STORAGE, value }),

	getOpenRouterKey: () => read({ name: OPENROUTER_KEY, fallback: "" }),
	setOpenRouterKey: (value: string) =>
		write({ name: OPENROUTER_KEY, value: value.trim() }),
	getOpenRouterTextModel: () =>
		read({ name: OPENROUTER_TEXT_MODEL, fallback: DEFAULT_OPENROUTER_TEXT_MODEL }),
	setOpenRouterTextModel: (value: string) =>
		write({
			name: OPENROUTER_TEXT_MODEL,
			value: value.trim() || DEFAULT_OPENROUTER_TEXT_MODEL,
		}),
	getOpenRouterImageModel: () =>
		read({
			name: OPENROUTER_IMAGE_MODEL,
			fallback: DEFAULT_OPENROUTER_IMAGE_MODEL,
		}),
	setOpenRouterImageModel: (value: string) =>
		write({
			name: OPENROUTER_IMAGE_MODEL,
			value: value.trim() || DEFAULT_OPENROUTER_IMAGE_MODEL,
		}),

	getGeminiKey: () => read({ name: GEMINI_KEY, fallback: "" }),
	setGeminiKey: (value: string) => write({ name: GEMINI_KEY, value: value.trim() }),
	getGeminiTextModel: () =>
		read({ name: GEMINI_TEXT_MODEL, fallback: DEFAULT_GEMINI_TEXT_MODEL }),
	setGeminiTextModel: (value: string) =>
		write({
			name: GEMINI_TEXT_MODEL,
			value: value.trim() || DEFAULT_GEMINI_TEXT_MODEL,
		}),
	getGeminiImageModel: () =>
		read({ name: GEMINI_IMAGE_MODEL, fallback: DEFAULT_GEMINI_IMAGE_MODEL }),
	setGeminiImageModel: (value: string) =>
		write({
			name: GEMINI_IMAGE_MODEL,
			value: value.trim() || DEFAULT_GEMINI_IMAGE_MODEL,
		}),

	/** Everything the generators need for the currently selected provider. */
	getConfig: (): AiConfig => {
		const provider = aiVideoKeys.getProvider();
		if (provider === "gemini") {
			return {
				provider: "gemini",
				apiKey: aiVideoKeys.getGeminiKey(),
				textModel: aiVideoKeys.getGeminiTextModel(),
				imageModel: aiVideoKeys.getGeminiImageModel(),
			};
		}
		return {
			provider: "openrouter",
			apiKey: aiVideoKeys.getOpenRouterKey(),
			textModel: aiVideoKeys.getOpenRouterTextModel(),
			imageModel: aiVideoKeys.getOpenRouterImageModel(),
		};
	},

	hasKey: (): boolean => aiVideoKeys.getConfig().apiKey.length > 0,
};
