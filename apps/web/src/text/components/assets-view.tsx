"use client";

import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { DEFAULTS } from "@/timeline/defaults";
import { buildTextElement } from "@/timeline/element-utils";
import { TEXT_PRESETS, type TextPreset } from "@/text/presets";
import type { ParamValue } from "@/params";
import type { MediaTime } from "@/wasm";

export function TextView() {
	const editor = useEditor();

	const addText = ({
		currentTime,
		params,
		name,
	}: {
		currentTime: MediaTime;
		params?: Record<string, ParamValue>;
		name?: string;
	}) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const element = buildTextElement({
			raw: {
				...DEFAULTS.text.element,
				name: name ?? DEFAULTS.text.element.name,
				params: { ...DEFAULTS.text.element.params, ...(params ?? {}) },
			},
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	return (
		<PanelView title="Text">
			<div className="flex flex-col gap-5">
				<section className="flex flex-col gap-2">
					<h3 className="text-muted-foreground text-xs font-medium">
						Presets — click to add
					</h3>
					<div className="grid grid-cols-2 gap-2">
						{TEXT_PRESETS.map((preset) => (
							<PresetCard
								key={preset.id}
								preset={preset}
								onAdd={() =>
									addText({
										currentTime: editor.playback.getCurrentTime(),
										params: preset.params,
										name: preset.name,
									})
								}
							/>
						))}
					</div>
				</section>

				<section className="flex flex-col gap-2">
					<h3 className="text-muted-foreground text-xs font-medium">
						Basic — drag or click
					</h3>
					<DraggableItem
						name="Default text"
						preview={
							<div className="bg-accent flex size-full items-center justify-center rounded">
								<span className="text-xs select-none">Default text</span>
							</div>
						}
						dragData={{
							id: "temp-text-id",
							type: DEFAULTS.text.element.type,
							name: DEFAULTS.text.element.name,
							content: "Default text",
						}}
						aspectRatio={1}
						onAddToTimeline={({ currentTime }: { currentTime: MediaTime }) =>
							addText({ currentTime })
						}
						shouldShowLabel={false}
					/>
				</section>
			</div>
		</PanelView>
	);
}

/** Renders the preset on a dark frame so the styling is visible in any theme. */
function PresetCard({
	preset,
	onAdd,
}: {
	preset: TextPreset;
	onAdd: () => void;
}) {
	const { params } = preset;
	const backgroundEnabled = params["background.enabled"] === true;
	const fontSize = typeof params.fontSize === "number" ? params.fontSize : 12;

	return (
		<button
			type="button"
			onClick={onAdd}
			title={preset.description}
			className="hover:border-foreground/40 flex flex-col gap-1 rounded-md border p-1.5 transition-colors"
		>
			{/* dark frame mimics the video canvas, so light preset colours stay visible */}
			<span className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black/85 px-1.5">
				<span
					className="max-w-full truncate"
					style={{
						color: typeof params.color === "string" ? params.color : undefined,
						fontSize: `${Math.min(Math.max(fontSize * 0.5, 8), 18)}px`,
						fontWeight: params.fontWeight === "bold" ? 700 : 400,
						fontStyle: params.fontStyle === "italic" ? "italic" : "normal",
						letterSpacing:
							typeof params.letterSpacing === "number"
								? `${params.letterSpacing * 0.5}px`
								: undefined,
						backgroundColor: backgroundEnabled
							? (params["background.color"] as string | undefined)
							: undefined,
						borderRadius: backgroundEnabled
							? `${Math.min(Number(params["background.cornerRadius"] ?? 4), 12)}px`
							: undefined,
						padding: backgroundEnabled ? "2px 6px" : undefined,
					}}
				>
					{preset.name}
				</span>
			</span>
			<span className="text-muted-foreground w-full truncate text-[0.65rem]">
				{preset.description}
			</span>
		</button>
	);
}
