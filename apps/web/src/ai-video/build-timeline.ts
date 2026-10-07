import type { EditorCore } from "@/core";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import type { AiScene } from "./types";

/**
 * Places each generated scene as an image clip on the timeline, back to back.
 * Reuses the same media + timeline APIs the asset panel uses, so the result is
 * a normal, fully editable project.
 */
export async function buildTimelineFromScenes({
	editor,
	projectId,
	scenes,
}: {
	editor: EditorCore;
	projectId: string;
	scenes: AiScene[];
}): Promise<{ addedScenes: number; skipped: number }> {
	let cursorSeconds = 0;
	let addedScenes = 0;
	let skipped = 0;

	for (const scene of scenes) {
		if (!scene.imageBlob) {
			skipped++;
			cursorSeconds += scene.durationSeconds;
			continue;
		}

		const file = new File(
			[scene.imageBlob],
			`cinetik-scene-${scene.index + 1}.png`,
			{ type: scene.imageBlob.type || "image/png" },
		);

		const asset = await editor.media.addMediaAsset({
			projectId,
			asset: {
				file,
				name: `Scene ${scene.index + 1} - ${scene.title}`,
				type: "image",
				duration: scene.durationSeconds,
			},
		});

		if (!asset) {
			skipped++;
			cursorSeconds += scene.durationSeconds;
			continue;
		}

		editor.timeline.insertElement({
			element: buildElementFromMedia({
				mediaId: asset.id,
				mediaType: "image",
				name: asset.name,
				duration: mediaTimeFromSeconds({ seconds: scene.durationSeconds }),
				startTime: mediaTimeFromSeconds({ seconds: cursorSeconds }),
			}),
			placement: { mode: "auto" },
		});

		addedScenes++;
		cursorSeconds += scene.durationSeconds;
	}

	return { addedScenes, skipped };
}
