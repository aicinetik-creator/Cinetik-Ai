const KEY_STORAGE = "cinetik.ai-video.gemini-key";
const MODEL_STORAGE = "cinetik.ai-video.gemini-model";
const IMAGE_MODEL_STORAGE = "cinetik.ai-video.gemini-image-model";

export const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

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
 * The Gemini key is kept only in this browser's localStorage and is sent
 * directly to Google's API. Nothing is proxied through our servers.
 */
export const aiVideoKeys = {
	getApiKey: () => read({ name: KEY_STORAGE, fallback: "" }),
	setApiKey: (value: string) => write({ name: KEY_STORAGE, value: value.trim() }),
	getTextModel: () => read({ name: MODEL_STORAGE, fallback: DEFAULT_TEXT_MODEL }),
	setTextModel: (value: string) =>
		write({ name: MODEL_STORAGE, value: value.trim() || DEFAULT_TEXT_MODEL }),
	getImageModel: () =>
		read({ name: IMAGE_MODEL_STORAGE, fallback: DEFAULT_IMAGE_MODEL }),
	setImageModel: (value: string) =>
		write({ name: IMAGE_MODEL_STORAGE, value: value.trim() || DEFAULT_IMAGE_MODEL }),
};
