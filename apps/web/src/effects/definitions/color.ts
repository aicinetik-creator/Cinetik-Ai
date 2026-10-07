import type { EffectDefinition } from "@/effects/types";
import { readEffectParamNumber } from "@/effects/canvas-effects";

/**
 * Colour correction effects. These run through the canvas pipeline
 * (`canvas-*` passes), so they work on every machine — no GPU required.
 */

export const brightnessEffectDefinition: EffectDefinition = {
	type: "brightness",
	name: "Brightness",
	keywords: ["brightness", "light", "exposure", "dark", "bright"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 25,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-brightness",
				uniforms: ({ effectParams }) => ({
					u_amount:
						1 +
						readEffectParamNumber({ effectParams, key: "amount" }) / 100,
				}),
			},
		],
	},
};

export const contrastEffectDefinition: EffectDefinition = {
	type: "contrast",
	name: "Contrast",
	keywords: ["contrast", "punch", "flat", "tone"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 30,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-contrast",
				uniforms: ({ effectParams }) => ({
					u_amount:
						1 +
						readEffectParamNumber({ effectParams, key: "amount" }) / 100,
				}),
			},
		],
	},
};

export const saturationEffectDefinition: EffectDefinition = {
	type: "saturation",
	name: "Saturation",
	keywords: ["saturation", "color", "colour", "vivid", "muted"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 35,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-saturate",
				uniforms: ({ effectParams }) => ({
					u_amount:
						1 +
						readEffectParamNumber({ effectParams, key: "amount" }) / 100,
				}),
			},
		],
	},
};

export const grayscaleEffectDefinition: EffectDefinition = {
	type: "grayscale",
	name: "Black & White",
	keywords: ["grayscale", "greyscale", "black", "white", "mono", "desaturate"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-grayscale",
				uniforms: ({ effectParams }) => ({
					u_amount:
						readEffectParamNumber({
							effectParams,
							key: "amount",
							fallback: 100,
						}) / 100,
				}),
			},
		],
	},
};

export const sepiaEffectDefinition: EffectDefinition = {
	type: "sepia",
	name: "Sepia",
	keywords: ["sepia", "vintage", "old", "warm", "retro", "film"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 75,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-sepia",
				uniforms: ({ effectParams }) => ({
					u_amount:
						readEffectParamNumber({
							effectParams,
							key: "amount",
							fallback: 75,
						}) / 100,
				}),
			},
		],
	},
};

export const invertEffectDefinition: EffectDefinition = {
	type: "invert",
	name: "Invert",
	keywords: ["invert", "negative", "reverse", "photo"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-invert",
				uniforms: ({ effectParams }) => ({
					u_amount:
						readEffectParamNumber({
							effectParams,
							key: "amount",
							fallback: 100,
						}) / 100,
				}),
			},
		],
	},
};

export const hueRotateEffectDefinition: EffectDefinition = {
	type: "hue-rotate",
	name: "Hue Shift",
	keywords: ["hue", "rotate", "shift", "color", "colour", "tint"],
	params: [
		{
			key: "degrees",
			label: "Degrees",
			type: "number",
			default: 90,
			min: -180,
			max: 180,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "canvas-hue-rotate",
				uniforms: ({ effectParams }) => ({
					u_degrees: readEffectParamNumber({
						effectParams,
						key: "degrees",
					}),
				}),
			},
		],
	},
};
