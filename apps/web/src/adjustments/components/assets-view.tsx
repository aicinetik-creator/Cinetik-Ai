"use client";

import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { effectsRegistry } from "@/effects";
import type { NumberParamDefinition } from "@/params";

/** Colour/tone effects offered as one-tap adjustments for the selected clip. */
const QUICK_ADJUSTMENTS: Array<{ type: string; label: string }> = [
	{ type: "brightness", label: "Brightness" },
	{ type: "contrast", label: "Contrast" },
	{ type: "saturation", label: "Saturation" },
	{ type: "warmth", label: "Warm / Cool" },
	{ type: "tint", label: "Colour tint" },
	{ type: "vignette", label: "Vignette" },
	{ type: "sharpen", label: "Sharpen" },
	{ type: "glow", label: "Glow" },
];

function firstNumberParam({
	type,
}: {
	type: string;
}): NumberParamDefinition | null {
	const definition = effectsRegistry.get(type);
	if (!definition) return null;
	const param = definition.params.find((candidate) => candidate.type === "number");
	return (param as NumberParamDefinition | undefined) ?? null;
}

export function AdjustmentsView() {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	// Re-render when the scene changes (adding/removing effects edits the scene),
	// then derive in render. Deriving inside the store selector would return a new
	// array on every call and spin React into an infinite update loop.
	useEditor((instance) => instance.scenes.getActiveSceneOrNull());
	const resolved = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});

	const addAdjustment = ({ type }: { type: string }) => {
		for (const { track, element } of resolved) {
			editor.timeline.addClipEffect({
				trackId: track.id,
				elementId: element.id,
				effectType: type,
			});
		}
	};

	if (selectedElements.length === 0) {
		return (
			<PanelView title="Adjustments">
				<p className="text-muted-foreground text-xs">
					Select a clip on the timeline, then add an adjustment to grade it.
				</p>
			</PanelView>
		);
	}

	return (
		<PanelView title="Adjustments">
			<div className="flex flex-col gap-4">
				<section className="flex flex-col gap-2">
					<h3 className="text-muted-foreground text-xs font-medium">
						Add to selected clip
					</h3>
					<div className="grid grid-cols-2 gap-2">
						{QUICK_ADJUSTMENTS.map((adjustment) => (
							<Button
								key={adjustment.type}
								variant="outline"
								size="sm"
								onClick={() => addAdjustment({ type: adjustment.type })}
							>
								{adjustment.label}
							</Button>
						))}
					</div>
				</section>

				{resolved.map(({ track, element }) => {
					const effects = element.effects ?? [];
					return (
						<section key={element.id} className="flex flex-col gap-2">
							<h3 className="text-muted-foreground text-xs font-medium">
								{effects.length > 0
									? `Adjustments on “${element.name}”`
									: `“${element.name}” has no adjustments yet`}
							</h3>
							{effects.map((effect) => {
								const definition = effectsRegistry.get(effect.type);
								const numeric = firstNumberParam({ type: effect.type });
								const value = numeric
									? Number(effect.params[numeric.key] ?? numeric.default)
									: null;

								return (
									<div
										key={effect.id}
										className="flex flex-col gap-2 rounded-md border p-2"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-medium">
												{definition?.name ?? effect.type}
											</span>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													className="text-[0.7rem]"
													onClick={() =>
														editor.timeline.toggleClipEffect({
															trackId: track.id,
															elementId: element.id,
															effectId: effect.id,
														})
													}
												>
													{effect.enabled ? "On" : "Off"}
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="text-[0.7rem]"
													onClick={() =>
														editor.timeline.removeClipEffect({
															trackId: track.id,
															elementId: element.id,
															effectId: effect.id,
														})
													}
												>
													Remove
												</Button>
											</div>
										</div>

										{numeric && value !== null && (
											<div className="flex flex-col gap-1">
												<Slider
													min={numeric.min}
													max={numeric.max ?? 100}
													step={numeric.step}
													value={[value]}
													onValueChange={([next]) => {
														if (typeof next !== "number") return;
														editor.timeline.updateClipEffectParams({
															trackId: track.id,
															elementId: element.id,
															effectId: effect.id,
															params: { [numeric.key]: next },
															pushHistory: false,
														});
													}}
												/>
												<span className="text-muted-foreground text-[0.65rem]">
													{numeric.label}: {value}
												</span>
											</div>
										)}
									</div>
								);
							})}
						</section>
					);
				})}
			</div>
		</PanelView>
	);
}
