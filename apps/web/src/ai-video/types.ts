export type AiVideoFormat = "vertical" | "horizontal" | "square";

export type AiGenerationSource = "ai" | "demo";

export interface AiScene {
	id: string;
	index: number;
	title: string;
	narration: string;
	visual: string;
	cameraAngle: string;
	shootTip: string;
	durationSeconds: number;
	imageBlob?: Blob;
	imageUrl?: string;
	imageSource?: AiGenerationSource;
	imageWarning?: string;
}

export interface AiScript {
	title: string;
	logline: string;
	scenes: AiScene[];
}

export interface AiBrief {
	brief: string;
	language: string;
	format: AiVideoFormat;
	durationSeconds: number;
	style: string;
}

export interface AiScriptResult {
	script: AiScript;
	source: AiGenerationSource;
	warning?: string;
}

export interface AiImageResult {
	blob: Blob;
	source: AiGenerationSource;
	warning?: string;
}
