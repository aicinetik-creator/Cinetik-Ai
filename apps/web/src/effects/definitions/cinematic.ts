import type { EffectDefinition } from "@/effects/types";
import { readEffectParamNumber } from "@/effects/canvas-effects";

/**
 * Cinematic / texture looks. All of these run on the canvas pipeline, so they
 * work on any machine and in export without a GPU build.
 */

export const filmGrainEffectDefinition: EffectDefinition = {
	type: "film-grain",
	name: "Film Grain",
	keywords: ["grain", "film", "noise", "texture", "analog"],
	params: [
		{
			key: "strength",
			label: "Amount",
			type: "number",
			default: 35,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "size",
			label: "Grain size",
			type: "number",
			default: 2,
			min: 1,
			max: 8,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-grain",
				uniforms: ({ effectParams }) => ({
					u_strength:
						readEffectParamNumber({ effectParams, key: "strength", fallback: 35 }) / 100,
					u_size: readEffectParamNumber({ effectParams, key: "size", fallback: 2 }),
				}),
			},
		],
	},
};

export const duotoneEffectDefinition: EffectDefinition = {
	type: "duotone",
	name: "Duotone",
	keywords: ["duotone", "two tone", "colorize", "poster", "gradient map"],
	params: [
		{
			key: "shadowHue",
			label: "Shadow hue",
			type: "number",
			default: 230,
			min: 0,
			max: 360,
			step: 1,
		},
		{
			key: "highlightHue",
			label: "Highlight hue",
			type: "number",
			default: 35,
			min: 0,
			max: 360,
			step: 1,
		},
		{
			key: "strength",
			label: "Amount",
			type: "number",
			default: 85,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-duotone",
				uniforms: ({ effectParams }) => ({
					u_shadow_hue: readEffectParamNumber({ effectParams, key: "shadowHue", fallback: 230 }),
					u_highlight_hue: readEffectParamNumber({ effectParams, key: "highlightHue", fallback: 35 }),
					u_strength:
						readEffectParamNumber({ effectParams, key: "strength", fallback: 85 }) / 100,
				}),
			},
		],
	},
};

export const glowEffectDefinition: EffectDefinition = {
	type: "glow",
	name: "Glow",
	keywords: ["glow", "bloom", "dreamy", "soft", "light"],
	params: [
		{
			key: "strength",
			label: "Amount",
			type: "number",
			default: 45,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "radius",
			label: "Radius",
			type: "number",
			default: 14,
			min: 1,
			max: 60,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-glow",
				uniforms: ({ effectParams }) => ({
					u_strength:
						readEffectParamNumber({ effectParams, key: "strength", fallback: 45 }) / 100,
					u_radius: readEffectParamNumber({ effectParams, key: "radius", fallback: 14 }),
				}),
			},
		],
	},
};

export const chromaticEffectDefinition: EffectDefinition = {
	type: "chromatic",
	name: "Chromatic",
	keywords: ["chromatic", "aberration", "rgb", "split", "prism", "lens"],
	params: [
		{
			key: "amount",
			label: "Separation",
			type: "number",
			default: 5,
			min: 1,
			max: 30,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-rgb-split",
				uniforms: ({ effectParams }) => ({
					u_amount: readEffectParamNumber({ effectParams, key: "amount", fallback: 5 }),
				}),
			},
		],
	},
};

export const mirrorEffectDefinition: EffectDefinition = {
	type: "mirror",
	name: "Mirror",
	keywords: ["mirror", "reflect", "flip", "symmetry", "kaleidoscope"],
	params: [],
	renderer: {
		passes: [{ shader: "canvas-mirror", uniforms: () => ({}) }],
	},
};

export const posterizeEffectDefinition: EffectDefinition = {
	type: "posterize",
	name: "Posterize",
	keywords: ["posterize", "quantize", "flat", "comic", "paint"],
	params: [
		{
			key: "levels",
			label: "Levels",
			type: "number",
			default: 6,
			min: 2,
			max: 32,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-posterize",
				uniforms: ({ effectParams }) => ({
					u_levels: readEffectParamNumber({ effectParams, key: "levels", fallback: 6 }),
				}),
			},
		],
	},
};

export const sharpenEffectDefinition: EffectDefinition = {
	type: "sharpen",
	name: "Sharpen",
	keywords: ["sharpen", "crisp", "detail", "clarity", "unsharp"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 55,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-sharpen",
				uniforms: ({ effectParams }) => ({
					u_amount: readEffectParamNumber({ effectParams, key: "amount", fallback: 55 }) / 100,
				}),
			},
		],
	},
};

export const scanlinesEffectDefinition: EffectDefinition = {
	type: "scanlines",
	name: "CRT",
	keywords: ["crt", "scanlines", "retro", "tv", "vhs", "monitor"],
	params: [
		{
			key: "strength",
			label: "Strength",
			type: "number",
			default: 25,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "spacing",
			label: "Line spacing",
			type: "number",
			default: 4,
			min: 2,
			max: 12,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-scanlines",
				uniforms: ({ effectParams }) => ({
					u_strength:
						readEffectParamNumber({ effectParams, key: "strength", fallback: 25 }) / 100,
					u_spacing: readEffectParamNumber({ effectParams, key: "spacing", fallback: 4 }),
				}),
			},
		],
	},
};

export const tintEffectDefinition: EffectDefinition = {
	type: "tint",
	name: "Colour Tint",
	keywords: ["tint", "colour", "color", "wash", "mood", "hue"],
	params: [
		{
			key: "hue",
			label: "Hue",
			type: "number",
			default: 200,
			min: 0,
			max: 360,
			step: 1,
		},
		{
			key: "strength",
			label: "Amount",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-tint",
				uniforms: ({ effectParams }) => ({
					u_hue: readEffectParamNumber({ effectParams, key: "hue", fallback: 200 }),
					u_strength:
						readEffectParamNumber({ effectParams, key: "strength", fallback: 40 }) / 100,
				}),
			},
		],
	},
};

/** Multi-pass look: RGB split + grain + scanlines, i.e. a VHS tape. */
export const vhsEffectDefinition: EffectDefinition = {
	type: "vhs",
	name: "VHS",
	keywords: ["vhs", "tape", "retro", "glitch", "80s", "analog"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 60,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-rgb-split",
				uniforms: ({ effectParams }) => ({
					u_amount: 1 + (readEffectParamNumber({ effectParams, key: "amount", fallback: 60 }) / 100) * 9,
				}),
			},
			{
				shader: "canvas-grain",
				uniforms: ({ effectParams }) => ({
					u_strength:
						(readEffectParamNumber({ effectParams, key: "amount", fallback: 60 }) / 100) * 0.5,
					u_size: 2,
				}),
			},
			{
				shader: "canvas-scanlines",
				uniforms: ({ effectParams }) => ({
					u_strength:
						(readEffectParamNumber({ effectParams, key: "amount", fallback: 60 }) / 100) * 0.35,
					u_spacing: 3,
				}),
			},
		],
	},
};
