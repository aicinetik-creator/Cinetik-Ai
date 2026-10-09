import type { EditorCore } from "@/core";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import type { AiScene } from "./types";

/**
 * Places each generated scene as an image clip on the timeline, back to back, and
 * drops its voiceover onto an audio track at the same start time. Reuses the same
 * media + timeline APIs the asset panel uses, so the result is a normal, fully
 * editable project.
 */
export async function buildTimelineFromScenes({
	editor,
	projectId,
	scenes,
	voiceovers,
}: {
	editor: EditorCore;
	projectId: string;
	scenes: AiScene[];
	voiceovers?: Record<string, Blob>;
}): Promise<{ addedScenes: number; skipped: number; addedVoiceovers: number }> {
	let cursorSeconds = 0;
	let addedScenes = 0;
	let skipped = 0;
	let addedVoiceovers = 0;

	for (const scene of scenes) {
		const sceneStart = cursorSeconds;

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
				startTime: mediaTimeFromSeconds({ seconds: sceneStart }),
			}),
			placement: { mode: "auto" },
		});
		addedScenes++;

		const voice = voiceovers?.[scene.id];
		if (voice) {
			const voiceFile = new File(
				[voice],
				`cinetik-voice-${scene.index + 1}.wav`,
				{ type: "audio/wav" },
			);
			const voiceAsset = await editor.media.addMediaAsset({
				projectId,
				asset: {
					file: voiceFile,
					name: `Voice ${scene.index + 1} - ${scene.title}`,
					type: "audio",
					duration: scene.durationSeconds,
				},
			});
			if (voiceAsset) {
				editor.timeline.insertElement({
					element: buildElementFromMedia({
						mediaId: voiceAsset.id,
						mediaType: "audio",
						name: voiceAsset.name,
						duration: mediaTimeFromSeconds({ seconds: scene.durationSeconds }),
						startTime: mediaTimeFromSeconds({ seconds: sceneStart }),
					}),
					placement: { mode: "auto" },
				});
				addedVoiceovers++;
			}
		}

		cursorSeconds += scene.durationSeconds;
	}

	return { addedScenes, skipped, addedVoiceovers };
}
