"use client";

import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import type { AnimationPath } from "@/animation/types";
import type { ParamValue } from "@/params";
import {
	addMediaTime,
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	type MediaTime,
} from "@/wasm";

type Keyframe = {
	trackId: string;
	elementId: string;
	propertyPath: AnimationPath;
	time: MediaTime;
	value: ParamValue;
	interpolation?: "linear" | "hold" | "bezier";
};

type TransitionDefinition = {
	id: string;
	name: string;
	description: string;
	/**
	 * Builds keyframes for one element. `at` maps an offset in seconds from the
	 * element's start onto a clamped MediaTime, so short clips stay valid.
	 */
	build: ({
		at,
		durationSeconds,
	}: {
		at: (offsetSeconds: number) => MediaTime;
		durationSeconds: number;
	}) => Array<{ propertyPath: AnimationPath; time: MediaTime; value: ParamValue }>;
};

const TRANSITIONS: TransitionDefinition[] = [
	{
		id: "fade-in",
		name: "Fade in",
		description: "Fades up from transparent",
		build: ({ at, durationSeconds }) => {
			const end = Math.min(0.5, durationSeconds / 2);
			return [
				{ propertyPath: "opacity", time: at(0), value: 0 },
				{ propertyPath: "opacity", time: at(end), value: 1 },
			];
		},
	},
	{
		id: "fade-out",
		name: "Fade out",
		description: "Fades to transparent",
		build: ({ at, durationSeconds }) => {
			const begin = Math.max(durationSeconds - Math.min(0.5, durationSeconds / 2), 0);
			return [
				{ propertyPath: "opacity", time: at(begin), value: 1 },
				{ propertyPath: "opacity", time: at(durationSeconds), value: 0 },
			];
		},
	},
	{
		id: "fade-both",
		name: "Fade in + out",
		description: "Fades up and back down",
		build: ({ at, durationSeconds }) => {
			const edge = Math.min(0.5, durationSeconds / 3);
			return [
				{ propertyPath: "opacity", time: at(0), value: 0 },
				{ propertyPath: "opacity", time: at(edge), value: 1 },
				{ propertyPath: "opacity", time: at(durationSeconds - edge), value: 1 },
				{ propertyPath: "opacity", time: at(durationSeconds), value: 0 },
			];
		},
	},
	{
		id: "zoom-in",
		name: "Zoom in",
		description: "Grows into place",
		build: ({ at, durationSeconds }) => {
			const end = Math.min(0.6, durationSeconds / 2);
			return [
				{ propertyPath: "transform.scaleX", time: at(0), value: 0.85 },
				{ propertyPath: "transform.scaleY", time: at(0), value: 0.85 },
				{ propertyPath: "transform.scaleX", time: at(end), value: 1 },
				{ propertyPath: "transform.scaleY", time: at(end), value: 1 },
			];
		},
	},
	{
		id: "zoom-out",
		name: "Zoom out",
		description: "Shrinks away",
		build: ({ at, durationSeconds }) => {
			const begin = Math.max(durationSeconds - Math.min(0.6, durationSeconds / 2), 0);
			return [
				{ propertyPath: "transform.scaleX", time: at(begin), value: 1 },
				{ propertyPath: "transform.scaleY", time: at(begin), value: 1 },
				{ propertyPath: "transform.scaleX", time: at(durationSeconds), value: 0.85 },
				{ propertyPath: "transform.scaleY", time: at(durationSeconds), value: 0.85 },
			];
		},
	},
	{
		id: "slide-left",
		name: "Slide from left",
		description: "Slides in from the left",
		build: ({ at, durationSeconds }) => {
			const end = Math.min(0.5, durationSeconds / 2);
			return [
				{ propertyPath: "transform.positionX", time: at(0), value: -320 },
				{ propertyPath: "transform.positionX", time: at(end), value: 0 },
			];
		},
	},
	{
		id: "slide-right",
		name: "Slide from right",
		description: "Slides in from the right",
		build: ({ at, durationSeconds }) => {
			const end = Math.min(0.5, durationSeconds / 2);
			return [
				{ propertyPath: "transform.positionX", time: at(0), value: 320 },
				{ propertyPath: "transform.positionX", time: at(end), value: 0 },
			];
		},
	},
	{
		id: "rise",
		name: "Rise up",
		description: "Drifts up into place",
		build: ({ at, durationSeconds }) => {
			const end = Math.min(0.6, durationSeconds / 2);
			return [
				{ propertyPath: "transform.positionY", time: at(0), value: 200 },
				{ propertyPath: "transform.positionY", time: at(end), value: 0 },
			];
		},
	},
	{
		id: "pop",
		name: "Pop",
		description: "Overshoots then settles",
		build: ({ at, durationSeconds }) => {
			const peak = Math.min(0.25, durationSeconds / 3);
			const settle = Math.min(0.45, durationSeconds / 2);
			return [
				{ propertyPath: "transform.scaleX", time: at(0), value: 0.6 },
				{ propertyPath: "transform.scaleY", time: at(0), value: 0.6 },
				{ propertyPath: "transform.scaleX", time: at(peak), value: 1.06 },
				{ propertyPath: "transform.scaleY", time: at(peak), value: 1.06 },
				{ propertyPath: "transform.scaleX", time: at(settle), value: 1 },
				{ propertyPath: "transform.scaleY", time: at(settle), value: 1 },
			];
		},
	},
	{
		id: "spin-in",
		name: "Spin in",
		description: "Rotates into place",
		build: ({ at, durationSeconds }) => {
			const end = Math.min(0.7, durationSeconds / 2);
			return [
				{ propertyPath: "transform.rotate", time: at(0), value: -180 },
				{ propertyPath: "transform.rotate", time: at(end), value: 0 },
			];
		},
	},
];

export function TransitionsView() {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();

	const applyTransition = ({ transition }: { transition: TransitionDefinition }) => {
		if (selectedElements.length === 0) return;

		const resolved = editor.timeline.getElementsWithTracks({
			elements: selectedElements,
		});

		const keyframes: Keyframe[] = [];
		for (const { track, element } of resolved) {
			const durationSeconds = mediaTimeToSeconds({ time: element.duration });
			if (durationSeconds <= 0) continue;

			const at = (offsetSeconds: number) => {
				const clamped = Math.min(Math.max(offsetSeconds, 0), durationSeconds);
				return addMediaTime(
					element.startTime,
					mediaTimeFromSeconds({ seconds: clamped }),
				);
			};

			for (const frame of transition.build({ at, durationSeconds })) {
				keyframes.push({
					trackId: track.id,
					elementId: element.id,
					propertyPath: frame.propertyPath,
					time: frame.time,
					value: frame.value,
					interpolation: "linear",
				});
			}
		}

		if (keyframes.length > 0) {
			editor.timeline.upsertKeyframes({ keyframes });
		}
	};

	return (
		<PanelView title="Transitions">
			<div className="flex flex-col gap-3">
				{selectedElements.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						Select a clip on the timeline, then choose a transition to animate it.
					</p>
				) : (
					<p className="text-muted-foreground text-xs">
						Applies to {selectedElements.length} selected{" "}
						{selectedElements.length === 1 ? "element" : "elements"}.
					</p>
				)}
				<div className="grid grid-cols-2 gap-2">
					{TRANSITIONS.map((transition) => (
						<button
							key={transition.id}
							type="button"
							title={transition.description}
							disabled={selectedElements.length === 0}
							onClick={() => applyTransition({ transition })}
							className="hover:border-foreground/40 flex h-16 flex-col items-center justify-center gap-0.5 rounded-md border p-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span className="text-xs font-medium">{transition.name}</span>
							<span className="text-muted-foreground text-[0.65rem] leading-tight">
								{transition.description}
							</span>
						</button>
					))}
				</div>
			</div>
		</PanelView>
	);
}
