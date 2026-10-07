import type { ParamValue } from "@/params";

export type TextPreset = {
	id: string;
	name: string;
	description: string;
	/** Partial text-element params; anything omitted falls back to the defaults. */
	params: Record<string, ParamValue>;
};

/**
 * Text presets. These are plain param maps applied on top of the text-element
 * defaults, so every preset stays fully editable afterwards in Properties.
 */
export const TEXT_PRESETS: TextPreset[] = [
	{
		id: "title",
		name: "Title",
		description: "Large bold headline",
		params: {
			content: "Your title here",
			fontSize: 26,
			fontWeight: "bold",
			color: "#ffffff",
			textAlign: "center",
			lineHeight: 1.1,
			letterSpacing: -0.5,
		},
	},
	{
		id: "subtitle",
		name: "Subtitle",
		description: "Supporting line under a title",
		params: {
			content: "A supporting subtitle",
			fontSize: 16,
			fontWeight: "normal",
			color: "#e5e5e5",
			textAlign: "center",
			lineHeight: 1.3,
		},
	},
	{
		id: "statement",
		name: "Statement",
		description: "Huge centred statement",
		params: {
			content: "BIG IDEA",
			fontSize: 34,
			fontWeight: "bold",
			color: "#ffffff",
			textAlign: "center",
			lineHeight: 1.0,
			letterSpacing: -1,
		},
	},
	{
		id: "lower-third",
		name: "Lower third",
		description: "Name plate with a dark box",
		params: {
			content: "Name here",
			fontSize: 14,
			fontWeight: "bold",
			color: "#ffffff",
			textAlign: "left",
			"background.enabled": true,
			"background.color": "#000000",
			"background.cornerRadius": 6,
			"background.paddingX": 18,
			"background.paddingY": 10,
		},
	},
	{
		id: "caption",
		name: "Caption",
		description: "Small boxed caption",
		params: {
			content: "Caption text",
			fontSize: 10,
			fontWeight: "normal",
			color: "#ffffff",
			textAlign: "center",
			"background.enabled": true,
			"background.color": "#000000",
			"background.cornerRadius": 4,
			"background.paddingX": 10,
			"background.paddingY": 6,
		},
	},
	{
		id: "quote",
		name: "Quote",
		description: "Italic centred quotation",
		params: {
			content: "“A line worth quoting.”",
			fontSize: 18,
			fontStyle: "italic",
			color: "#f5f5f5",
			textAlign: "center",
			lineHeight: 1.4,
		},
	},
	{
		id: "tag",
		name: "Tag",
		description: "Small pill label",
		params: {
			content: "NEW",
			fontSize: 9,
			fontWeight: "bold",
			color: "#ffffff",
			textAlign: "center",
			letterSpacing: 2,
			"background.enabled": true,
			"background.color": "#7c3aed",
			"background.cornerRadius": 999,
			"background.paddingX": 12,
			"background.paddingY": 6,
		},
	},
	{
		id: "highlight",
		name: "Highlight",
		description: "Bold text on a bright box",
		params: {
			content: "KEY POINT",
			fontSize: 12,
			fontWeight: "bold",
			color: "#111111",
			textAlign: "center",
			"background.enabled": true,
			"background.color": "#facc15",
			"background.cornerRadius": 4,
			"background.paddingX": 12,
			"background.paddingY": 6,
		},
	},
	{
		id: "big-number",
		name: "Big number",
		description: "Oversized statistic",
		params: {
			content: "100%",
			fontSize: 40,
			fontWeight: "bold",
			color: "#ffffff",
			textAlign: "center",
			lineHeight: 1.0,
		},
	},
	{
		id: "sign-off",
		name: "Sign-off",
		description: "Small closing line",
		params: {
			content: "Made with Cinetik",
			fontSize: 12,
			fontWeight: "normal",
			color: "#ffffff",
			textAlign: "center",
			letterSpacing: 1,
			opacity: 0.85,
		},
	},
];
