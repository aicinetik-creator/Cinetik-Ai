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
	| { kind: "warmth"; amount: number };

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

const scratchCanvases = new Map<string, OffscreenCanvas>();
const MAX_SCRATCH_CANVASES = 6;

function acquireScratchCanvas({
	width,
	height,
}: {
	width: number;
	height: number;
}): OffscreenCanvas | null {
	if (typeof OffscreenCanvas === "undefined") return null;
	const key = `${width}x${height}`;
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
