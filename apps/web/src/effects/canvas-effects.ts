import type { EffectPass, EffectUniformValue } from "@/effects/types";
import type { ParamValues } from "@/params";

/**
 * Canvas effect shaders.
 *
 * The GPU pipeline (Rust/wgpu) only implements a small, fixed set of shaders.
 * Everything else is expressed as a `canvas-*` pass and executed on the CPU
 * with Canvas2D, so effects work even when the GPU path is unavailable and new
 * effects can be added without shipping a new wasm build.
 */
export const CANVAS_SHADER_PREFIX = "canvas-";
export const GAUSSIAN_BLUR_SHADER = "gaussian-blur";

export type CanvasEffectOp =
	| { kind: "vignette"; strength: number }
	| { kind: "pixelate"; blockSize: number }
	| { kind: "warmth"; amount: number }
	| { kind: "grain"; strength: number; size: number }
	| { kind: "duotone"; shadow: string; highlight: string; strength: number }
	| { kind: "glow"; strength: number; radius: number }
	| { kind: "rgbSplit"; amount: number }
	| { kind: "mirror" }
	| { kind: "posterize"; levels: number }
	| { kind: "sharpen"; amount: number }
	| { kind: "scanlines"; strength: number; spacing: number }
	| { kind: "tint"; hue: number; strength: number };

export type CanvasEffectPlan = {
	filter: string;
	ops: CanvasEffectOp[];
};

type EffectCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function isCanvasShader({ shader }: { shader: string }): boolean {
	return shader.startsWith(CANVAS_SHADER_PREFIX);
}

export function isGpuEffectShader({ shader }: { shader: string }): boolean {
	return shader === GAUSSIAN_BLUR_SHADER;
}

function clamp({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}): number {
	if (Number.isNaN(value)) return min;
	return Math.min(max, Math.max(min, value));
}

export function readEffectParamNumber({
	effectParams,
	key,
	fallback = 0,
}: {
	effectParams: ParamValues;
	key: string;
	fallback?: number;
}): number {
	const raw = effectParams[key];
	if (typeof raw === "number") return raw;
	if (typeof raw === "string") {
		const parsed = Number.parseFloat(raw);
		return Number.isNaN(parsed) ? fallback : parsed;
	}
	return fallback;
}

function readUniform({
	uniforms,
	key,
	fallback = 0,
}: {
	uniforms: Record<string, EffectUniformValue>;
	key: string;
	fallback?: number;
}): number {
	const value = uniforms[key];
	if (typeof value === "number") return value;
	if (Array.isArray(value)) {
		const first = value[0];
		return typeof first === "number" ? first : fallback;
	}
	return fallback;
}

/**
 * Convert a single effect pass into a canvas plan. Returns null when the pass
 * would produce no visible change.
 */
export function canvasPlanForPass({
	pass,
}: {
	pass: EffectPass;
}): CanvasEffectPlan | null {
	const { shader, uniforms } = pass;

	switch (shader) {
		case "canvas-brightness": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount", fallback: 1 }),
				min: 0,
				max: 4,
			});
			if (Math.abs(amount - 1) < 0.001) return null;
			return { filter: `brightness(${amount})`, ops: [] };
		}
		case "canvas-contrast": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount", fallback: 1 }),
				min: 0,
				max: 4,
			});
			if (Math.abs(amount - 1) < 0.001) return null;
			return { filter: `contrast(${amount})`, ops: [] };
		}
		case "canvas-saturate": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount", fallback: 1 }),
				min: 0,
				max: 4,
			});
			if (Math.abs(amount - 1) < 0.001) return null;
			return { filter: `saturate(${amount})`, ops: [] };
		}
		case "canvas-grayscale": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount" }),
				min: 0,
				max: 1,
			});
			if (amount < 0.001) return null;
			return { filter: `grayscale(${amount})`, ops: [] };
		}
		case "canvas-sepia": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount" }),
				min: 0,
				max: 1,
			});
			if (amount < 0.001) return null;
			return { filter: `sepia(${amount})`, ops: [] };
		}
		case "canvas-invert": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount" }),
				min: 0,
				max: 1,
			});
			if (amount < 0.001) return null;
			return { filter: `invert(${amount})`, ops: [] };
		}
		case "canvas-hue-rotate": {
			const degrees = readUniform({ uniforms, key: "u_degrees" });
			if (Math.abs(degrees) < 0.001) return null;
			return { filter: `hue-rotate(${degrees}deg)`, ops: [] };
		}
		case "canvas-fade": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount" }),
				min: 0,
				max: 1,
			});
			if (amount < 0.001) return null;
			const brightness = 1 + 0.25 * amount;
			const contrast = 1 - 0.2 * amount;
			const opacity = 1 - 0.35 * amount;
			return {
				filter: `brightness(${brightness}) contrast(${contrast}) opacity(${opacity})`,
				ops: [],
			};
		}
		case "canvas-cinematic": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount", fallback: 1 }),
				min: 0,
				max: 1,
			});
			if (amount < 0.001) return null;
			const contrast = 1 + 0.25 * amount;
			const saturate = 1 + 0.15 * amount;
			const brightness = 1 - 0.05 * amount;
			return {
				filter: `contrast(${contrast}) saturate(${saturate}) brightness(${brightness})`,
				ops: [],
			};
		}
		case "canvas-vignette": {
			const strength = clamp({
				value: readUniform({ uniforms, key: "u_strength", fallback: 0.6 }),
				min: 0,
				max: 1,
			});
			if (strength < 0.001) return null;
			return { filter: "", ops: [{ kind: "vignette", strength }] };
		}
		case "canvas-pixelate": {
			const blockSize = Math.max(
				2,
				Math.round(readUniform({ uniforms, key: "u_block", fallback: 12 })),
			);
			return { filter: "", ops: [{ kind: "pixelate", blockSize }] };
		}
		case "canvas-warmth": {
			const amount = clamp({
				value: readUniform({ uniforms, key: "u_amount", fallback: 0.35 }),
				min: -1,
				max: 1,
			});
			if (Math.abs(amount) < 0.01) return null;
			return { filter: "", ops: [{ kind: "warmth", amount }] };
		}
		case "canvas-grain": {
			const strength = clamp({ value: readUniform({ uniforms, key: "u_strength", fallback: 0.35 }), min: 0, max: 1 });
			const size = Math.max(1, Math.round(readUniform({ uniforms, key: "u_size", fallback: 2 })));
			if (strength < 0.01) return null;
			return { filter: "", ops: [{ kind: "grain", strength, size }] };
		}
		case "canvas-duotone": {
			const strength = clamp({ value: readUniform({ uniforms, key: "u_strength", fallback: 0.85 }), min: 0, max: 1 });
			if (strength < 0.01) return null;
			const shadow = hslToCss({ h: readUniform({ uniforms, key: "u_shadow_hue", fallback: 230 }), s: 0.8, l: 0.22 });
			const highlight = hslToCss({ h: readUniform({ uniforms, key: "u_highlight_hue", fallback: 35 }), s: 0.85, l: 0.72 });
			return { filter: "", ops: [{ kind: "duotone", shadow, highlight, strength }] };
		}
		case "canvas-glow": {
			const strength = clamp({ value: readUniform({ uniforms, key: "u_strength", fallback: 0.5 }), min: 0, max: 1 });
			const radius = Math.max(1, readUniform({ uniforms, key: "u_radius", fallback: 12 }));
			if (strength < 0.01) return null;
			return { filter: "", ops: [{ kind: "glow", strength, radius }] };
		}
		case "canvas-rgb-split": {
			const amount = Math.max(0, readUniform({ uniforms, key: "u_amount", fallback: 4 }));
			if (amount < 0.5) return null;
			return { filter: "", ops: [{ kind: "rgbSplit", amount }] };
		}
		case "canvas-mirror":
			return { filter: "", ops: [{ kind: "mirror" }] };
		case "canvas-posterize": {
			const levels = Math.round(clamp({ value: readUniform({ uniforms, key: "u_levels", fallback: 6 }), min: 2, max: 32 }));
			return { filter: "", ops: [{ kind: "posterize", levels }] };
		}
		case "canvas-sharpen": {
			const amount = clamp({ value: readUniform({ uniforms, key: "u_amount", fallback: 0.6 }), min: 0, max: 1 });
			if (amount < 0.01) return null;
			return { filter: "", ops: [{ kind: "sharpen", amount }] };
		}
		case "canvas-scanlines": {
			const strength = clamp({ value: readUniform({ uniforms, key: "u_strength", fallback: 0.25 }), min: 0, max: 1 });
			const spacing = Math.max(2, Math.round(readUniform({ uniforms, key: "u_spacing", fallback: 4 })));
			if (strength < 0.01) return null;
			return { filter: "", ops: [{ kind: "scanlines", strength, spacing }] };
		}
		case "canvas-tint": {
			const strength = clamp({ value: readUniform({ uniforms, key: "u_strength", fallback: 0.4 }), min: 0, max: 1 });
			const hue = readUniform({ uniforms, key: "u_hue", fallback: 200 });
			if (strength < 0.01) return null;
			return { filter: "", ops: [{ kind: "tint", hue, strength }] };
		}
		case GAUSSIAN_BLUR_SHADER: {
			// CPU fallback for the GPU blur: sigma * step approximates the
			// effective radius of the multi-pass gaussian.
			const sigma = readUniform({ uniforms, key: "u_sigma" });
			const step = Math.max(
				readUniform({ uniforms, key: "u_step", fallback: 1 }),
				1,
			);
			const radius = sigma * step;
			if (!(radius > 0.05)) return null;
			return { filter: `blur(${radius.toFixed(2)}px)`, ops: [] };
		}
		default:
			return null;
	}
}

export function combineCanvasPlans({
	plans,
}: {
	plans: Array<CanvasEffectPlan | null>;
}): CanvasEffectPlan | null {
	const filters: string[] = [];
	const ops: CanvasEffectOp[] = [];

	for (const plan of plans) {
		if (!plan) continue;
		if (plan.filter) filters.push(plan.filter);
		ops.push(...plan.ops);
	}

	if (filters.length === 0 && ops.length === 0) return null;
	return { filter: filters.join(" "), ops };
}

export function describeCanvasPlan({ plan }: { plan: CanvasEffectPlan }): string {
	const ops = plan.ops
		.map((op) => {
			switch (op.kind) {
				case "vignette":
					return `vignette:${op.strength}`;
				case "pixelate":
					return `pixelate:${op.blockSize}`;
				case "warmth":
					return `warmth:${op.amount}`;
				case "grain":
					return `grain:${op.strength}:${op.size}`;
				case "duotone":
					return `duotone:${op.shadow}:${op.highlight}:${op.strength}`;
				case "glow":
					return `glow:${op.strength}:${op.radius}`;
				case "rgbSplit":
					return `rgbSplit:${op.amount}`;
				case "mirror":
					return "mirror";
				case "posterize":
					return `posterize:${op.levels}`;
				case "sharpen":
					return `sharpen:${op.amount}`;
				case "scanlines":
					return `scanlines:${op.strength}:${op.spacing}`;
				case "tint":
					return `tint:${op.hue}:${op.strength}`;
			}
		})
		.join(",");
	return `${plan.filter}|${ops}`;
}

/**
 * Split resolved effect pass groups into what the GPU can still handle and
 * what must run on the CPU canvas.
 */
export function buildCanvasEffectPlan({
	passGroups,
	gpuAvailable,
}: {
	passGroups: EffectPass[][];
	gpuAvailable: boolean;
}): {
	plan: CanvasEffectPlan | null;
	gpuPassGroups: EffectPass[][];
} {
	const plans: Array<CanvasEffectPlan | null> = [];
	const gpuPassGroups: EffectPass[][] = [];

	for (const group of passGroups) {
		const remaining: EffectPass[] = [];
		for (const pass of group) {
			if (isCanvasShader(pass)) {
				plans.push(canvasPlanForPass({ pass }));
				continue;
			}
			if (isGpuEffectShader(pass)) {
				if (gpuAvailable) {
					remaining.push(pass);
				} else {
					plans.push(canvasPlanForPass({ pass }));
				}
				continue;
			}
			// Unknown shader: leave it on the GPU path so behaviour matches the
			// previous pipeline exactly.
			remaining.push(pass);
		}
		if (remaining.length > 0) gpuPassGroups.push(remaining);
	}

	return { plan: combineCanvasPlans({ plans }), gpuPassGroups };
}

// ---------------------------------------------------------------------------
// Canvas execution
// ---------------------------------------------------------------------------

function hslToCss({ h, s, l }: { h: number; s: number; l: number }): string {
	const hue = ((h % 360) + 360) % 360;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = l - c / 2;
	const seg = Math.floor(hue / 60) % 6;
	const rgb = [
		[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
	][seg] as [number, number, number];
	const to255 = (v: number) => Math.round((v + m) * 255);
	return `rgb(${to255(rgb[0])}, ${to255(rgb[1])}, ${to255(rgb[2])})`;
}

const scratchCanvases = new Map<string, OffscreenCanvas>();
const MAX_SCRATCH_CANVASES = 6;

function acquireScratchCanvas({
	width,
	height,
	key: keySuffix = "scratch",
}: {
	width: number;
	height: number;
	key?: string;
}): OffscreenCanvas | null {
	if (typeof OffscreenCanvas === "undefined") return null;
	const key = `${keySuffix}:${width}x${height}`;
	const existing = scratchCanvases.get(key);
	if (existing) return existing;

	const canvas = new OffscreenCanvas(width, height);
	scratchCanvases.set(key, canvas);
	if (scratchCanvases.size > MAX_SCRATCH_CANVASES) {
		const oldest = scratchCanvases.keys().next().value;
		if (typeof oldest === "string" && oldest !== key) {
			scratchCanvases.delete(oldest);
		}
	}
	return canvas;
}

function drawVignette({
	ctx,
	strength,
	width,
	height,
}: {
	ctx: EffectCtx;
	strength: number;
	width: number;
	height: number;
}): void {
	const centerX = width / 2;
	const centerY = height / 2;
	const innerRadius = Math.min(width, height) * 0.35;
	const outerRadius = Math.max(
		Math.hypot(centerX, centerY),
		innerRadius + 1,
	);

	const gradient = ctx.createRadialGradient(
		centerX,
		centerY,
		innerRadius,
		centerX,
		centerY,
		outerRadius,
	);
	gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
	gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);

	ctx.save();
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);
	ctx.restore();
}

function drawWarmth({
	ctx,
	amount,
	width,
	height,
}: {
	ctx: EffectCtx;
	amount: number;
	width: number;
	height: number;
}): void {
	const alpha = Math.min(Math.abs(amount), 1) * 0.6;
	const overlay =
		amount >= 0
			? `rgba(255, 147, 41, ${alpha})`
			: `rgba(64, 132, 255, ${alpha})`;

	ctx.save();
	ctx.globalCompositeOperation = "soft-light";
	ctx.fillStyle = overlay;
	ctx.fillRect(0, 0, width, height);
	ctx.restore();
}

function drawPixelate({
	ctx,
	blockSize,
	width,
	height,
}: {
	ctx: EffectCtx;
	blockSize: number;
	width: number;
	height: number;
}): void {
	const smallWidth = Math.max(1, Math.round(width / blockSize));
	const smallHeight = Math.max(1, Math.round(height / blockSize));
	const scratch = acquireScratchCanvas({
		width: smallWidth,
		height: smallHeight,
	});
	if (!scratch) return;
	const scratchCtx = scratch.getContext("2d");
	if (!scratchCtx) return;

	scratchCtx.clearRect(0, 0, smallWidth, smallHeight);
	scratchCtx.drawImage(
		ctx.canvas,
		0,
		0,
		width,
		height,
		0,
		0,
		smallWidth,
		smallHeight,
	);

	ctx.save();
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, width, height);
	ctx.drawImage(
		scratch,
		0,
		0,
		smallWidth,
		smallHeight,
		0,
		0,
		width,
		height,
	);
	ctx.restore();
}


/** Copy the current canvas content into a cached scratch surface. */
function copyCanvas({
	ctx,
	width,
	height,
	key = "copy",
}: {
	ctx: EffectCtx;
	width: number;
	height: number;
	key?: string;
}): OffscreenCanvas | null {
	const scratch = acquireScratchCanvas({ width, height, key });
	if (!scratch) return null;
	const scratchCtx = scratch.getContext("2d");
	if (!scratchCtx) return null;
	scratchCtx.clearRect(0, 0, width, height);
	scratchCtx.drawImage(ctx.canvas, 0, 0, width, height);
	return scratch;
}

/** Copy an arbitrary surface (not necessarily the current canvas) into a scratch. */
function copySurface({
	source,
	width,
	height,
	key,
}: {
	source: CanvasImageSource;
	width: number;
	height: number;
	key: string;
}): OffscreenCanvas | null {
	const scratch = acquireScratchCanvas({ width, height, key });
	if (!scratch) return null;
	const scratchCtx = scratch.getContext("2d");
	if (!scratchCtx) return null;
	scratchCtx.globalCompositeOperation = "source-over";
	scratchCtx.globalAlpha = 1;
	scratchCtx.clearRect(0, 0, width, height);
	scratchCtx.drawImage(source, 0, 0, width, height);
	return scratch;
}

const noiseTiles = new Map<string, OffscreenCanvas>();

/** A small tile of grey noise, tiled over the frame to produce film grain. */
function acquireNoiseTile({ size }: { size: number }): OffscreenCanvas | null {
	if (typeof OffscreenCanvas === "undefined") return null;
	const key = `grain:${size}`;
	const cached = noiseTiles.get(key);
	if (cached) return cached;

	const dimension = 256;
	const canvas = new OffscreenCanvas(dimension, dimension);
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	const image = ctx.createImageData(dimension, dimension);
	const data = image.data;
	for (let y = 0; y < dimension; y++) {
		for (let x = 0; x < dimension; x++) {
			const value = 90 + Math.floor(Math.random() * 76);
			const index = (y * dimension + x) * 4;
			data[index] = value;
			data[index + 1] = value;
			data[index + 2] = value;
			data[index + 3] = 255;
		}
	}
	ctx.putImageData(image, 0, 0);
	noiseTiles.set(key, canvas);
	return canvas;
}

function drawGrain({
	ctx,
	strength,
	size,
	width,
	height,
}: {
	ctx: EffectCtx;
	strength: number;
	size: number;
	width: number;
	height: number;
}): void {
	const tile = acquireNoiseTile({ size });
	if (!tile) return;
	ctx.save();
	ctx.globalCompositeOperation = "overlay";
	ctx.globalAlpha = strength;
	ctx.drawImage(tile, 0, 0, width, height);
	ctx.restore();
}

function drawDuotone({
	ctx,
	shadow,
	highlight,
	strength,
	width,
	height,
}: {
	ctx: EffectCtx;
	shadow: string;
	highlight: string;
	strength: number;
	width: number;
	height: number;
}): void {
	const snapshot = copyCanvas({ ctx, width, height, key: "duotone" });
	if (!snapshot) return;
	ctx.save();
	ctx.globalCompositeOperation = "multiply";
	ctx.globalAlpha = strength;
	ctx.fillStyle = shadow;
	ctx.fillRect(0, 0, width, height);
	ctx.globalCompositeOperation = "screen";
	ctx.fillStyle = highlight;
	ctx.fillRect(0, 0, width, height);
	ctx.restore();
}

function drawGlow({
	ctx,
	strength,
	radius,
	width,
	height,
}: {
	ctx: EffectCtx;
	strength: number;
	radius: number;
	width: number;
	height: number;
}): void {
	const snapshot = copyCanvas({ ctx, width, height, key: "glow" });
	if (!snapshot) return;
	ctx.save();
	ctx.globalCompositeOperation = "lighter";
	ctx.globalAlpha = strength;
	ctx.filter = `blur(${radius}px)`;
	ctx.drawImage(snapshot, 0, 0, width, height);
	ctx.filter = "none";
	ctx.restore();
}

function drawRgbSplit({
	ctx,
	amount,
	width,
	height,
}: {
	ctx: EffectCtx;
	amount: number;
	width: number;
	height: number;
}): void {
	const snapshot = copyCanvas({ ctx, width, height, key: "rgbsplit-src" });
	if (!snapshot) return;
	const channels: Array<{ color: string; offset: number }> = [
		{ color: "rgb(255, 0, 0)", offset: -amount },
		{ color: "rgb(0, 255, 0)", offset: 0 },
		{ color: "rgb(0, 0, 255)", offset: amount },
	];

	ctx.save();
	ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = "lighter";
	for (const channel of channels) {
		const tinted = copySurface({ source: snapshot, width, height, key: "rgbsplit-channel" });
		if (!tinted) continue;
		const tintCtx = tinted.getContext("2d");
		if (!tintCtx) continue;
		// isolate the channel by multiplying the copy with a pure colour
		tintCtx.globalCompositeOperation = "multiply";
		tintCtx.fillStyle = channel.color;
		tintCtx.fillRect(0, 0, width, height);
		tintCtx.globalCompositeOperation = "source-over";
		ctx.drawImage(tinted, channel.offset, 0, width, height);
	}
	ctx.restore();
}

function drawMirror({
	ctx,
	width,
	height,
}: {
	ctx: EffectCtx;
	width: number;
	height: number;
}): void {
	const snapshot = copyCanvas({ ctx, width, height, key: "mirror" });
	if (!snapshot) return;
	ctx.save();
	ctx.beginPath();
	ctx.rect(width / 2, 0, width / 2, height);
	ctx.clip();
	ctx.translate(width, 0);
	ctx.scale(-1, 1);
	ctx.drawImage(snapshot, 0, 0, width, height);
	ctx.restore();
}

function drawPosterize({
	ctx,
	levels,
	width,
	height,
}: {
	ctx: EffectCtx;
	levels: number;
	width: number;
	height: number;
}): void {
	const image = ctx.getImageData(0, 0, width, height);
	const data = image.data;
	const step = 255 / (levels - 1);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = Math.round(data[i] / step) * step;
		data[i + 1] = Math.round(data[i + 1] / step) * step;
		data[i + 2] = Math.round(data[i + 2] / step) * step;
	}
	ctx.putImageData(image, 0, 0);
}

function drawSharpen({
	ctx,
	amount,
	width,
	height,
}: {
	ctx: EffectCtx;
	amount: number;
	width: number;
	height: number;
}): void {
	const snapshot = copyCanvas({ ctx, width, height, key: "sharpen" });
	if (!snapshot) return;
	ctx.save();
	ctx.globalCompositeOperation = "overlay";
	ctx.globalAlpha = amount;
	ctx.filter = "blur(1.5px)";
	ctx.drawImage(snapshot, 0, 0, width, height);
	ctx.filter = "none";
	ctx.restore();
}

function drawScanlines({
	ctx,
	strength,
	spacing,
	width,
	height,
}: {
	ctx: EffectCtx;
	strength: number;
	spacing: number;
	width: number;
	height: number;
}): void {
	ctx.save();
	ctx.globalAlpha = strength;
	ctx.fillStyle = "#000000";
	for (let y = 0; y < height; y += spacing * 2) {
		ctx.fillRect(0, y, width, spacing);
	}
	ctx.restore();
}

function drawTint({
	ctx,
	hue,
	strength,
	width,
	height,
}: {
	ctx: EffectCtx;
	hue: number;
	strength: number;
	width: number;
	height: number;
}): void {
	ctx.save();
	ctx.globalCompositeOperation = "soft-light";
	ctx.globalAlpha = strength;
	ctx.fillStyle = hslToCss({ h: hue, s: 0.7, l: 0.5 });
	ctx.fillRect(0, 0, width, height);
	ctx.restore();
}

function applyCanvasOps({
	ctx,
	ops,
	width,
	height,
}: {
	ctx: EffectCtx;
	ops: CanvasEffectOp[];
	width: number;
	height: number;
}): void {
	for (const op of ops) {
		switch (op.kind) {
			case "vignette":
				drawVignette({ ctx, strength: op.strength, width, height });
				break;
			case "pixelate":
				drawPixelate({ ctx, blockSize: op.blockSize, width, height });
				break;
			case "warmth":
				drawWarmth({ ctx, amount: op.amount, width, height });
				break;
			case "grain":
				drawGrain({ ctx, strength: op.strength, size: op.size, width, height });
				break;
			case "duotone":
				drawDuotone({ ctx, shadow: op.shadow, highlight: op.highlight, strength: op.strength, width, height });
				break;
			case "glow":
				drawGlow({ ctx, strength: op.strength, radius: op.radius, width, height });
				break;
			case "rgbSplit":
				drawRgbSplit({ ctx, amount: op.amount, width, height });
				break;
			case "mirror":
				drawMirror({ ctx, width, height });
				break;
			case "posterize":
				drawPosterize({ ctx, levels: op.levels, width, height });
				break;
			case "sharpen":
				drawSharpen({ ctx, amount: op.amount, width, height });
				break;
			case "scanlines":
				drawScanlines({ ctx, strength: op.strength, spacing: op.spacing, width, height });
				break;
			case "tint":
				drawTint({ ctx, hue: op.hue, strength: op.strength, width, height });
				break;
		}
	}
}

/**
 * Run `draw` with the plan's CSS filter applied, then layer the plan's canvas
 * operations (vignette, pixelate, warmth) on top of the result.
 */
export function applyCanvasPlanToDraw({
	ctx,
	plan,
	width,
	height,
	draw,
}: {
	ctx: EffectCtx;
	plan: CanvasEffectPlan | null;
	width: number;
	height: number;
	draw: () => void;
}): void {
	if (!plan) {
		draw();
		return;
	}

	ctx.save();
	if (plan.filter) {
		ctx.filter = plan.filter;
	}
	draw();
	ctx.filter = "none";
	ctx.restore();

	if (plan.ops.length > 0) {
		applyCanvasOps({ ctx, ops: plan.ops, width, height });
	}
}
