import type { AiVideoFormat } from "./types";

export const QUICK_START_PRESETS: { label: string; brief: string }[] = [
	{
		label: "UGC Ad",
		brief:
			"I want a UGC ad for my skincare brand — a real person showing the product, talking about how it cleared their skin in two weeks. Upbeat, phone-shot feel.",
	},
	{
		label: "Product Explainer",
		brief:
			"A 30 second product explainer for a smart water bottle that tracks how much you drink and reminds you to stay hydrated.",
	},
	{
		label: "Festival Reel",
		brief:
			"A festive reel for my clothing store's Diwali sale — bright lights, happy customers, and a strong call to visit the store.",
	},
	{
		label: "Founder Story",
		brief:
			"A founder story about starting a small business from a village in Bihar and growing it into a brand people trust.",
	},
];

export const VIDEO_STYLES = [
	"Authentic / UGC",
	"Cinematic",
	"Bright & playful",
	"Minimal studio",
	"Documentary",
];

/** A broad set of Indian languages, so narration can be written in any of them. */
export const LANGUAGES = [
	"English (India)",
	"Hindi",
	"Tamil",
	"Telugu",
	"Bengali",
	"Marathi",
	"Kannada",
	"Malayalam",
	"Gujarati",
	"Punjabi",
	"Odia",
	"Assamese",
	"Urdu",
	"Nepali",
	"Konkani",
	"Maithili",
	"Sanskrit",
	"Kashmiri",
	"Sindhi",
	"Dogri",
	"Manipuri",
	"Bodo",
	"Santali",
];

export const FORMATS: { value: AiVideoFormat; label: string; hint: string }[] = [
	{ value: "vertical", label: "Vertical 9:16", hint: "Reels / Shorts" },
	{ value: "horizontal", label: "Horizontal 16:9", hint: "YouTube" },
	{ value: "square", label: "Square 1:1", hint: "Feed post" },
];

export const DURATION_TARGETS = [15, 30, 45, 60];

export const STEP_LABELS = ["Brief", "Script", "Scenes", "Audio", "Timeline"];
