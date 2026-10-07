"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getFreesoundApiKey,
	setFreesoundApiKey,
} from "@/sounds/freesound-client";
import { useSoundsStore } from "@/sounds/sounds-store";

/**
 * The editor is a static site with no server, so searching music and sound
 * effects talks to Freesound directly with the visitor's own free API key.
 * This prompt collects it (localStorage only) and re-runs the search after it
 * is saved. Importing your own audio files needs no key at all.
 */
export function FreesoundKeyPrompt() {
	const [draft, setDraft] = useState("");
	const [hasKey, setHasKey] = useState(() => getFreesoundApiKey() !== null);

	if (hasKey) {
		return (
			<div className="text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[0.65rem]">
				<span>Freesound key saved</span>
				<button
					type="button"
					className="underline"
					onClick={() => {
						setFreesoundApiKey({ key: "" });
						setHasKey(false);
					}}
				>
					Remove
				</button>
			</div>
		);
	}

	const save = () => {
		if (draft.trim().length === 0) return;
		setFreesoundApiKey({ key: draft });
		setHasKey(true);
		// let the panel refetch with the key in place
		useSoundsStore.getState().setHasLoaded({ loaded: false });
		useSoundsStore.getState().setError({ error: null });
	};

	return (
		<div className="border-b px-3 py-2.5">
			<p className="text-xs font-medium">Enable music &amp; sound effects</p>
			<p className="text-muted-foreground mt-0.5 text-[0.7rem] leading-relaxed">
				Paste a free Freesound API key to search sounds. Importing your own
				audio files works without one.
			</p>
			<div className="mt-2 flex gap-2">
				<Input
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					placeholder="Freesound API key"
					className="h-8 text-xs"
					aria-label="Freesound API key"
				/>
				<Button size="sm" onClick={save} disabled={draft.trim().length === 0}>
					Save
				</Button>
			</div>
			<a
				className="text-muted-foreground mt-1 inline-block text-[0.65rem] underline"
				href="https://freesound.org/apiv2/apply/"
				target="_blank"
				rel="noreferrer"
			>
				Get a free key →
			</a>
		</div>
	);
}
