import type { SoundEffect } from "@/sounds/types";

/**
 * Client-side Freesound search.
 *
 * The editor ships as a static site with no server, so the browser talks to
 * Freesound directly using the visitor's own (free) API key. The key lives in
 * localStorage only — it is never sent anywhere except freesound.org.
 */

const API_BASE = "https://freesound.org/apiv2";
const KEY_STORAGE = "freesound-api-key";

const SEARCH_FIELDS = [
	"id",
	"name",
	"description",
	"previews",
	"download",
	"duration",
	"filesize",
	"type",
	"channels",
	"bitrate",
	"bitdepth",
	"samplerate",
	"username",
	"tags",
	"license",
	"created",
	"downloads",
	"avg_rating",
	"num_ratings",
].join(",");

export class FreesoundKeyMissingError extends Error {
	constructor() {
		super(
			"Add a free Freesound API key to search music and sound effects (see the panel header).",
		);
		this.name = "FreesoundKeyMissingError";
	}
}

export function getFreesoundApiKey(): string | null {
	if (typeof window === "undefined") return null;
	const key = window.localStorage.getItem(KEY_STORAGE);
	return key && key.trim().length > 0 ? key.trim() : null;
}

export function setFreesoundApiKey({ key }: { key: string }): void {
	if (typeof window === "undefined") return;
	const trimmed = key.trim();
	if (trimmed.length === 0) {
		window.localStorage.removeItem(KEY_STORAGE);
		return;
	}
	window.localStorage.setItem(KEY_STORAGE, trimmed);
}

export function clearFreesoundApiKey(): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(KEY_STORAGE);
}

type FreesoundResult = {
	id: number;
	name: string;
	description?: string;
	previews?: Record<string, string>;
	download?: string;
	duration?: number;
	filesize?: number;
	type?: string;
	channels?: number;
	bitrate?: number;
	bitdepth?: number;
	samplerate?: number;
	username?: string;
	tags?: string[];
	license?: string;
	created?: string;
	downloads?: number;
	avg_rating?: number;
	num_ratings?: number;
};

type FreesoundSearchResponse = {
	count?: number;
	next?: string | null;
	results?: FreesoundResult[];
};

function toSoundEffect({ result }: { result: FreesoundResult }): SoundEffect {
	const previews = result.previews ?? {};
	const previewUrl =
		previews["preview-hq-mp3"] ??
		previews["preview-lq-mp3"] ??
		previews["preview-hq-ogg"] ??
		previews["preview-lq-ogg"] ??
		undefined;

	return {
		id: result.id,
		name: result.name,
		description: result.description ?? "",
		url: `https://freesound.org/s/${result.id}/`,
		previewUrl,
		downloadUrl: result.download,
		duration: result.duration ?? 0,
		filesize: result.filesize ?? 0,
		type: result.type ?? "",
		channels: result.channels ?? 0,
		bitrate: result.bitrate ?? 0,
		bitdepth: result.bitdepth ?? 0,
		samplerate: result.samplerate ?? 0,
		username: result.username ?? "",
		tags: result.tags ?? [],
		license: result.license ?? "",
		created: result.created ?? "",
		downloads: result.downloads ?? 0,
		rating: result.avg_rating ?? 0,
		ratingCount: result.num_ratings ?? 0,
	};
}

export async function searchFreesound({
	query,
	page = 1,
	pageSize = 30,
	commercialOnly = false,
	sort,
	signal,
}: {
	query: string;
	page?: number;
	pageSize?: number;
	commercialOnly?: boolean;
	sort?: "downloads" | "rating" | "created" | "score";
	signal?: AbortSignal;
}): Promise<{ results: SoundEffect[]; next: string | null; count: number }> {
	const token = getFreesoundApiKey();
	if (!token) throw new FreesoundKeyMissingError();

	const params = new URLSearchParams({
		token,
		fields: SEARCH_FIELDS,
		page: String(page),
		page_size: String(pageSize),
	});
	if (query.trim()) params.set("query", query.trim());
	if (sort) params.set("sort", sort);
	// Freesound filters are Lucene syntax; CC0 is the "use anywhere" licence.
	if (commercialOnly) params.set("filter", 'license:"Creative Commons 0"');

	const response = await fetch(`${API_BASE}/search/text/?${params.toString()}`, {
		signal,
	});
	if (response.status === 401) {
		throw new Error("Freesound rejected the API key — check it and try again.");
	}
	if (response.status === 429) {
		throw new Error("Freesound rate limit reached — wait a moment and retry.");
	}
	if (!response.ok) {
		throw new Error(`Freesound search failed (${response.status}).`);
	}

	const data = (await response.json()) as FreesoundSearchResponse;
	return {
		results: (data.results ?? []).map((result) => toSoundEffect({ result })),
		next: data.next ?? null,
		count: data.count ?? 0,
	};
}
