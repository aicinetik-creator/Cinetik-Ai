import type { EffectDefinition } from "@/effects/types";
import { readEffectParamNumber } from "@/effects/canvas-effects";

/**
 * Stylised looks. Vignette, pixelate and warmth are composited on the canvas;
 * the rest are CSS filter stacks — all executed on the CPU pipeline.
 */

export const vignetteEffectDefinition: EffectDefinition = {
	type: "vignette",
	name: "Vignette",
	keywords: ["vignette", "edges", "darken", "corners", "focus"],
	params: [
		{
			key: "strength",
			label: "Strength",
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
				shader: "canvas-vignette",
				uniforms: ({ effectParams }) => ({
					u_strength:
						readEffectParamNumber({
							effectParams,
							key: "strength",
							fallback: 60,
						}) / 100,
				}),
			},
		],
	},
};

export const pixelateEffectDefinition: EffectDefinition = {
	type: "pixelate",
	name: "Pixelate",
	keywords: ["pixelate", "pixel", "mosaic", "blur", "censor", "8bit"],
	params: [
		{
			key: "block",
			label: "Block size",
			type: "number",
			default: 14,
			min: 2,
			max: 64,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-pixelate",
				uniforms: ({ effectParams }) => ({
					u_block: readEffectParamNumber({
						effectParams,
						key: "block",
						fallback: 14,
					}),
				}),
			},
		],
	},
};

export const warmthEffectDefinition: EffectDefinition = {
	type: "warmth",
	name: "Warm / Cool",
	keywords: ["warmth", "warm", "cool", "temperature", "tint", "white balance"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 40,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-warmth",
				uniforms: ({ effectParams }) => ({
					u_amount:
						readEffectParamNumber({ effectParams, key: "amount" }) / 100,
				}),
			},
		],
	},
};

export const fadeEffectDefinition: EffectDefinition = {
	type: "fade",
	name: "Fade",
	keywords: ["fade", "matte", "washed", "film", "soft", "pastel"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 45,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-fade",
				uniforms: ({ effectParams }) => ({
					u_amount:
						readEffectParamNumber({
							effectParams,
							key: "amount",
							fallback: 45,
						}) / 100,
				}),
			},
		],
	},
};

export const cinematicEffectDefinition: EffectDefinition = {
	type: "cinematic",
	name: "Cinematic",
	keywords: ["cinematic", "film", "movie", "teal", "orange", "look"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 70,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-cinematic",
				uniforms: ({ effectParams }) => ({
					u_amount:
						readEffectParamNumber({
							effectParams,
							key: "amount",
							fallback: 70,
						}) / 100,
				}),
			},
		],
	},
};
