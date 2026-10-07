import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import {
	brightnessEffectDefinition,
	contrastEffectDefinition,
	grayscaleEffectDefinition,
	hueRotateEffectDefinition,
	invertEffectDefinition,
	saturationEffectDefinition,
	sepiaEffectDefinition,
} from "./color";
import {
	chromaticEffectDefinition,
	duotoneEffectDefinition,
	filmGrainEffectDefinition,
	glowEffectDefinition,
	mirrorEffectDefinition,
	posterizeEffectDefinition,
	scanlinesEffectDefinition,
	sharpenEffectDefinition,
	tintEffectDefinition,
	vhsEffectDefinition,
} from "./cinematic";
import {
	cinematicEffectDefinition,
	fadeEffectDefinition,
	pixelateEffectDefinition,
	vignetteEffectDefinition,
	warmthEffectDefinition,
} from "./stylize";

const defaultEffects = [
	blurEffectDefinition,
	brightnessEffectDefinition,
	contrastEffectDefinition,
	saturationEffectDefinition,
	grayscaleEffectDefinition,
	sepiaEffectDefinition,
	invertEffectDefinition,
	hueRotateEffectDefinition,
	vignetteEffectDefinition,
	pixelateEffectDefinition,
	warmthEffectDefinition,
	fadeEffectDefinition,
	cinematicEffectDefinition,
	filmGrainEffectDefinition,
	duotoneEffectDefinition,
	glowEffectDefinition,
	chromaticEffectDefinition,
	mirrorEffectDefinition,
	posterizeEffectDefinition,
	sharpenEffectDefinition,
	scanlinesEffectDefinition,
	tintEffectDefinition,
	vhsEffectDefinition,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
