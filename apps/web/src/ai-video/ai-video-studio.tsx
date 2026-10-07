"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Clapperboard,
	Clock,
	Film,
	KeyRound,
	Languages,
	Loader2,
	Music,
	Play,
	RefreshCw,
	Sparkles,
	Square,
	Trash2,
	Volume2,
	Wand2,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/editor/use-editor";
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, aiVideoKeys } from "./api-key";
import { useAiVideoStore } from "./ai-video-store";
import { buildTimelineFromScenes } from "./build-timeline";
import { generateSceneImage, generateScript } from "./gemini";
import {
	DURATION_TARGETS,
	FORMATS,
	LANGUAGES,
	QUICK_START_PRESETS,
	STEP_LABELS,
	VIDEO_STYLES,
} from "./presets";
import type {
	AiBrief,
	AiGenerationSource,
	AiScene,
	AiScript,
	AiVideoFormat,
} from "./types";

const BRAND_GRADIENT = "linear-gradient(90deg,#00D2FF 0%,#B026FF 100%)";
const BRAND_TEXT = "bg-gradient-to-r from-[#00D2FF] to-[#B026FF] bg-clip-text text-transparent";

const TTS_CODES: Record<string, string> = {
	"English (India)": "en-IN",
	Hindi: "hi-IN",
	Tamil: "ta-IN",
	Telugu: "te-IN",
	Bengali: "bn-IN",
	Marathi: "mr-IN",
	Kannada: "kn-IN",
	Malayalam: "ml-IN",
	Gujarati: "gu-IN",
	Punjabi: "pa-IN",
	Odia: "or-IN",
	Assamese: "as-IN",
	Urdu: "ur-IN",
	Nepali: "ne-NP",
};

export function AiVideoStudio() {
	const isOpen = useAiVideoStore((state) => state.isOpen);
	const close = useAiVideoStore((state) => state.close);
	const editor = useEditor();

	const [step, setStep] = useState(0);
	const [briefText, setBriefText] = useState("");
	const [language, setLanguage] = useState("English (India)");
	const [format, setFormat] = useState<AiVideoFormat>("vertical");
	const [duration, setDuration] = useState(30);
	const [style, setStyle] = useState(VIDEO_STYLES[0]);

	const [script, setScript] = useState<AiScript | null>(null);
	const [scriptSource, setScriptSource] = useState<AiGenerationSource | null>(null);
	const [isScripting, setIsScripting] = useState(false);

	const [isImaging, setIsImaging] = useState(false);
	const [imageProgress, setImageProgress] = useState({ done: 0, total: 0 });

	const [isBuilding, setIsBuilding] = useState(false);
	const [builtCount, setBuiltCount] = useState<number | null>(null);

	const [keyOpen, setKeyOpen] = useState(false);

	const objectUrlsRef = useRef<string[]>([]);
	useEffect(() => {
		return () => {
			for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
			objectUrlsRef.current = [];
		};
	}, []);

	// Opened from a link (/editor?ai=1)? The project load may rewrite the URL,
	// so the intent is carried in sessionStorage and honoured on mount.
	const autoOpenCheckedRef = useRef(false);
	useEffect(() => {
		if (autoOpenCheckedRef.current) return;
		autoOpenCheckedRef.current = true;
		try {
			if (window.sessionStorage.getItem("cinetik.ai-video.autoopen") === "1") {
				window.sessionStorage.removeItem("cinetik.ai-video.autoopen");
				useAiVideoStore.getState().open();
			}
		} catch {
			// sessionStorage unavailable - ignore
		}
	}, []);

	const currentBrief = useMemo<AiBrief>(
		() => ({ brief: briefText.trim(), language, format, durationSeconds: duration, style }),
		[briefText, language, format, duration, style],
	);

	const resetAll = useCallback(() => {
		setStep(0);
		setScript(null);
		setScriptSource(null);
		setBuiltCount(null);
		setImageProgress({ done: 0, total: 0 });
		for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
		objectUrlsRef.current = [];
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, close]);

	if (!isOpen) return null;

	const handleGenerateScript = async () => {
		if (!currentBrief.brief) {
			toast.error("Add a brief first", {
				description: "Describe the video you want in plain language.",
			});
			return;
		}
		setIsScripting(true);
		setStep(1);
		const result = await generateScript({
			brief: currentBrief,
			apiKey: aiVideoKeys.getApiKey(),
			textModel: aiVideoKeys.getTextModel(),
		});
		setScript(result.script);
		setScriptSource(result.source);
		setIsScripting(false);
		if (result.warning) {
			toast.warning(result.warning);
		} else {
			toast.success("Script ready");
		}
	};

	const runImageGeneration = useCallback(
		async (scenes: AiScene[]) => {
			const targets = scenes.filter((scene) => !scene.imageBlob);
			if (targets.length === 0) return;
			setIsImaging(true);
			setImageProgress({ done: 0, total: targets.length });

			const apiKey = aiVideoKeys.getApiKey();
			const imageModel = aiVideoKeys.getImageModel();
			let done = 0;
			let usedDemo = false;

			for (const scene of targets) {
				const result = await generateSceneImage({
					scene,
					brief: currentBrief,
					apiKey,
					imageModel,
				});
				if (result.source === "demo") usedDemo = true;
				const url = URL.createObjectURL(result.blob);
				objectUrlsRef.current.push(url);
				setScript((prev) =>
					prev
						? {
								...prev,
								scenes: prev.scenes.map((item) =>
									item.id === scene.id
										? {
												...item,
												imageBlob: result.blob,
												imageUrl: url,
												imageSource: result.source,
												imageWarning: result.warning,
											}
										: item,
								),
							}
						: prev,
				);
				done++;
				setImageProgress({ done, total: targets.length });
			}

			setIsImaging(false);
			if (usedDemo && apiKey) {
				toast.warning("Some frames used placeholders", {
					description: "The image model could not be reached for every scene.",
				});
			}
		},
		[currentBrief],
	);

	const handleGoToScenes = async () => {
		if (!script) return;
		setStep(2);
		await runImageGeneration(script.scenes);
	};

	const handleBuildTimeline = async () => {
		if (!script) return;
		const active = editor.project.getActive();
		if (!active) {
			toast.error("Open a project first");
			return;
		}
		setIsBuilding(true);
		try {
			const { addedScenes, skipped } = await buildTimelineFromScenes({
				editor,
				projectId: active.metadata.id,
				scenes: script.scenes,
			});
			setBuiltCount(addedScenes);
			setStep(4);
			if (addedScenes === 0) {
				toast.error("Nothing was added", {
					description: "No scene frames were ready. Generate the scenes first.",
				});
			} else {
				toast.success(`${addedScenes} scene${addedScenes === 1 ? "" : "s"} added to the timeline`, {
					description: skipped > 0 ? `${skipped} scene(s) skipped.` : undefined,
				});
			}
		} finally {
			setIsBuilding(false);
		}
	};

	const canGoNext =
		(step === 0 && briefText.trim().length > 0) ||
		(step === 1 && !!script) ||
		(step === 2 && !!script) ||
		(step === 3 && !!script);

	return (
		<div className="bg-background text-foreground fixed inset-0 z-[200] flex h-[100dvh] w-full flex-col">
			<div className="h-1 w-full" style={{ background: BRAND_GRADIENT }} />

			<header className="flex items-center justify-between gap-3 border-b px-4 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<div
						className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
						style={{ background: BRAND_GRADIENT }}
					>
						<Clapperboard className="size-4" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold tracking-wide">AI VIDEO</span>
							{scriptSource === "demo" && (
								<Badge variant="secondary" className="text-[10px]">
									DEMO MODE
								</Badge>
							)}
						</div>
						<p className="text-muted-foreground truncate text-xs">
							Describe it. Cinetik shoots it.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setKeyOpen(true)}>
						<KeyRound className="size-3.5" />
						<span className="hidden sm:inline">
							{aiVideoKeys.getApiKey() ? "API key set" : "Add API key"}
						</span>
					</Button>
					<Button variant="ghost" size="icon" onClick={close} aria-label="Close AI Video">
						<X className="size-4" />
					</Button>
				</div>
			</header>

			<Stepper step={step} onSelect={(next) => setStep(next)} maxReached={script ? 4 : 0} />

			<div className="min-h-0 flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="mx-auto w-full max-w-3xl px-4 py-6">
						{step === 0 && (
							<BriefStep
								briefText={briefText}
								setBriefText={setBriefText}
								language={language}
								setLanguage={setLanguage}
								format={format}
								setFormat={setFormat}
								duration={duration}
								setDuration={setDuration}
								style={style}
								setStyle={setStyle}
								isScripting={isScripting}
							/>
						)}

						{step === 1 && (
							<ScriptStep
								script={script}
								isScripting={isScripting}
								source={scriptSource}
								onRegenerate={handleGenerateScript}
							/>
						)}

						{step === 2 && (
							<ScenesStep
								script={script}
								isImaging={isImaging}
								progress={imageProgress}
								onGenerateAll={() => script && runImageGeneration(script.scenes)}
								onRegenerateScene={async (scene) => {
									await runImageGeneration([{ ...scene, imageBlob: undefined }]);
								}}
							/>
						)}

						{step === 3 && (
							<AudioStep script={script} language={language} />
						)}

						{step === 4 && <TimelineStep script={script} builtCount={builtCount} />}
					</div>
				</ScrollArea>
			</div>

			<footer className="flex items-center justify-between gap-2 border-t px-4 py-3">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							resetAll();
							setBriefText("");
						}}
					>
						<Trash2 className="size-3.5" />
						Clear
					</Button>
				</div>

				<div className="flex items-center gap-2">
					{step > 0 && (
						<Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
							<ChevronLeft className="size-4" />
							Back
						</Button>
					)}

					{step === 0 && (
						<Button size="sm" onClick={handleGenerateScript} disabled={isScripting}>
							{isScripting ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Sparkles className="size-4" />
							)}
							Generate Script
						</Button>
					)}

					{step === 1 && (
						<Button size="sm" onClick={handleGoToScenes} disabled={!script || isImaging}>
							{isImaging ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<ChevronRight className="size-4" />
							)}
							Generate Scenes
						</Button>
					)}

					{step === 2 && (
						<Button size="sm" onClick={() => setStep(3)} disabled={isImaging}>
							<ChevronRight className="size-4" />
							Continue
						</Button>
					)}

					{step === 3 && (
						<Button size="sm" onClick={handleBuildTimeline} disabled={isBuilding}>
							{isBuilding ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Film className="size-4" />
							)}
							Build Timeline
						</Button>
					)}

					{step === 4 && (
						<Button size="sm" onClick={close}>
							<Check className="size-4" />
							Open timeline
						</Button>
					)}
				</div>
			</footer>

			<KeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
		</div>
	);
}

function Stepper({
	step,
	onSelect,
	maxReached,
}: {
	step: number;
	onSelect: (step: number) => void;
	maxReached: number;
}) {
	return (
		<div className="border-b px-4 py-3">
			<ol className="flex items-center gap-1 overflow-x-auto">
				{STEP_LABELS.map((label, index) => {
					const isActive = index === step;
					const isDone = index < step;
					const reachable = index <= maxReached;
					return (
						<li key={label} className="flex items-center gap-1">
							<button
								type="button"
								disabled={!reachable}
								onClick={() => reachable && onSelect(index)}
								className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors ${
									isActive
										? "text-white"
										: isDone
											? "bg-accent text-foreground"
											: "text-muted-foreground"
								} ${reachable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
								style={isActive ? { background: BRAND_GRADIENT } : undefined}
							>
								<span
									className={`flex size-4 items-center justify-center rounded-full text-[10px] font-semibold ${
										isActive ? "bg-white/25" : "bg-foreground/10"
									}`}
								>
									{isDone ? <Check className="size-3" /> : index + 1}
								</span>
								{label}
							</button>
							{index < STEP_LABELS.length - 1 && (
								<ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-widest uppercase">
			{children}
		</p>
	);
}

function Chip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
				active
					? "border-transparent text-white"
					: "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
			}`}
			style={active ? { background: BRAND_GRADIENT } : undefined}
		>
			{children}
		</button>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
				{label}
			</span>
			{children}
		</label>
	);
}

const selectClass =
	"border-border bg-background h-9 w-full rounded-md border px-2 text-sm outline-none focus:ring-1 focus:ring-ring";

function BriefStep(props: {
	briefText: string;
	setBriefText: (value: string) => void;
	language: string;
	setLanguage: (value: string) => void;
	format: AiVideoFormat;
	setFormat: (value: AiVideoFormat) => void;
	duration: number;
	setDuration: (value: number) => void;
	style: string;
	setStyle: (value: string) => void;
	isScripting: boolean;
}) {
	const {
		briefText,
		setBriefText,
		language,
		setLanguage,
		format,
		setFormat,
		duration,
		setDuration,
		style,
		setStyle,
		isScripting,
	} = props;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-lg font-semibold">
					Tell Cinetik what to make.{" "}
					<span className={BRAND_TEXT}>It writes, plans and shoots it.</span>
				</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Write in plain language, in any language. Cinetik writes the script, plans the
					shots, generates each scene, then builds a timeline you can still edit by hand.
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<SectionLabel>Your brief</SectionLabel>
				<Textarea
					value={briefText}
					onChange={(event) => setBriefText(event.target.value)}
					placeholder="I want a UGC ad for my skincare brand — a real person showing the product, talking about how it cleared their skin in two weeks. Upbeat, phone-shot feel."
					className="min-h-32"
					disabled={isScripting}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<SectionLabel>Quick start</SectionLabel>
				<div className="flex flex-wrap gap-2">
					{QUICK_START_PRESETS.map((preset) => (
						<button
							key={preset.label}
							type="button"
							disabled={isScripting}
							onClick={() => setBriefText(preset.brief)}
							className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-xs transition-colors"
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Field label="Language">
					<select
						className={selectClass}
						value={language}
						onChange={(event) => setLanguage(event.target.value)}
						disabled={isScripting}
					>
						{LANGUAGES.map((item) => (
							<option key={item} value={item}>
								{item}
							</option>
						))}
					</select>
				</Field>

				<Field label="Format">
					<select
						className={selectClass}
						value={format}
						onChange={(event) => setFormat(event.target.value as AiVideoFormat)}
						disabled={isScripting}
					>
						{FORMATS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label} · {item.hint}
							</option>
						))}
					</select>
				</Field>

				<Field label="Duration target">
					<select
						className={selectClass}
						value={duration}
						onChange={(event) => setDuration(Number(event.target.value))}
						disabled={isScripting}
					>
						{DURATION_TARGETS.map((item) => (
							<option key={item} value={item}>
								~{item} seconds
							</option>
						))}
					</select>
				</Field>
			</div>

			<div className="flex flex-col gap-2">
				<SectionLabel>Theme &amp; style</SectionLabel>
				<div className="flex flex-wrap gap-2">
					{VIDEO_STYLES.map((item) => (
						<Chip key={item} active={item === style} onClick={() => setStyle(item)}>
							{item}
						</Chip>
					))}
				</div>
			</div>

			<div className="bg-accent/40 text-muted-foreground rounded-lg border p-3 text-xs">
				Speak naturally. Cinetik understands the brief in any supported language and writes
				the script in the language you pick. You can also describe a reference — “make it feel
				like that phone-shot reel”.
			</div>
		</div>
	);
}

function ScriptStep({
	script,
	isScripting,
	source,
	onRegenerate,
}: {
	script: AiScript | null;
	isScripting: boolean;
	source: AiGenerationSource | null;
	onRegenerate: () => void;
}) {
	if (isScripting || !script) {
		return (
			<div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-24 text-sm">
				<Loader2 className="size-6 animate-spin" />
				Writing your script…
			</div>
		);
	}

	const total = script.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold">{script.title}</h2>
					<p className="text-muted-foreground mt-1 text-sm">{script.logline}</p>
					<div className="mt-2 flex flex-wrap items-center gap-2">
						<Badge variant="secondary">
							<Clock className="size-3" /> ~{total}s
						</Badge>
						<Badge variant="secondary">{script.scenes.length} scenes</Badge>
						{source === "demo" && <Badge variant="secondary">Sample script</Badge>}
					</div>
				</div>
				<Button variant="outline" size="sm" onClick={onRegenerate}>
					<RefreshCw className="size-3.5" />
					Regenerate
				</Button>
			</div>

			<div className="flex flex-col gap-3">
				{script.scenes.map((scene) => (
					<div key={scene.id} className="border-border rounded-lg border p-4">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<span
									className="flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
									style={{ background: BRAND_GRADIENT }}
								>
									{scene.index + 1}
								</span>
								<span className="text-sm font-medium">{scene.title}</span>
							</div>
							<Badge variant="secondary">{scene.durationSeconds}s</Badge>
						</div>

						{scene.narration && (
							<p className="mt-3 text-sm">
								<span className="text-muted-foreground">VO: </span>
								{scene.narration}
							</p>
						)}
						{scene.visual && (
							<p className="text-muted-foreground mt-1.5 text-xs">{scene.visual}</p>
						)}

						<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
							{scene.cameraAngle && (
								<span className="text-muted-foreground">
									<span className="text-foreground/70">Camera:</span> {scene.cameraAngle}
								</span>
							)}
							{scene.shootTip && (
								<span className="text-muted-foreground">
									<span className="text-foreground/70">Tip:</span> {scene.shootTip}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function ScenesStep({
	script,
	isImaging,
	progress,
	onGenerateAll,
	onRegenerateScene,
}: {
	script: AiScript | null;
	isImaging: boolean;
	progress: { done: number; total: number };
	onGenerateAll: () => void;
	onRegenerateScene: (scene: AiScene) => Promise<void>;
}) {
	if (!script) return null;
	const ready = script.scenes.filter((scene) => scene.imageUrl).length;
	const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold">Scene visuals</h2>
					<p className="text-muted-foreground mt-1 text-sm">
						Cinetik generates a frame for each scene. Regenerate any one you don&apos;t like.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={onGenerateAll} disabled={isImaging}>
					{isImaging ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Wand2 className="size-3.5" />
					)}
					Generate all
				</Button>
			</div>

			{isImaging && (
				<div className="flex flex-col gap-2">
					<Progress value={percent} />
					<p className="text-muted-foreground text-xs">
						Generating frames… {progress.done}/{progress.total}
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{script.scenes.map((scene) => (
					<div key={scene.id} className="border-border overflow-hidden rounded-lg border">
						<div className="bg-muted relative aspect-video">
							{scene.imageUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={scene.imageUrl}
									alt={scene.title}
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="text-muted-foreground flex h-full items-center justify-center text-xs">
									{isImaging ? (
										<Loader2 className="size-5 animate-spin" />
									) : (
										"No frame yet"
									)}
								</div>
							)}
							<span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
								Scene {scene.index + 1}
							</span>
							{scene.imageSource === "demo" && scene.imageUrl && (
								<span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
									placeholder
								</span>
							)}
						</div>
						<div className="flex items-center justify-between gap-2 p-3">
							<span className="truncate text-xs font-medium">{scene.title}</span>
							<Button
								variant="ghost"
								size="sm"
								disabled={isImaging}
								onClick={() => onRegenerateScene(scene)}
							>
								<RefreshCw className="size-3.5" />
								Redo
							</Button>
						</div>
					</div>
				))}
			</div>

			{!isImaging && ready < script.scenes.length && (
				<p className="text-muted-foreground text-xs">
					{script.scenes.length - ready} scene(s) still have no frame. You can continue and
					generate them later.
				</p>
			)}
		</div>
	);
}

function AudioStep({ script, language }: { script: AiScript | null; language: string }) {
	const [speakingId, setSpeakingId] = useState<string | null>(null);

	useEffect(() => {
		return () => {
			if (typeof window !== "undefined" && "speechSynthesis" in window) {
				window.speechSynthesis.cancel();
			}
		};
	}, []);

	if (!script) return null;

	const speak = (scene: AiScene) => {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) {
			toast.error("Your browser can't speak this text");
			return;
		}
		window.speechSynthesis.cancel();
		if (speakingId === scene.id) {
			setSpeakingId(null);
			return;
		}
		const utterance = new SpeechSynthesisUtterance(scene.narration || scene.title);
		utterance.lang = TTS_CODES[language] ?? "en-IN";
		utterance.onend = () => setSpeakingId(null);
		setSpeakingId(scene.id);
		window.speechSynthesis.speak(utterance);
	};

	const speakAll = () => {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
		window.speechSynthesis.cancel();
		const joined = script.scenes
			.map((scene) => scene.narration)
			.filter(Boolean)
			.join(". ");
		if (!joined) return;
		const utterance = new SpeechSynthesisUtterance(joined);
		utterance.lang = TTS_CODES[language] ?? "en-IN";
		setSpeakingId("all");
		utterance.onend = () => setSpeakingId(null);
		window.speechSynthesis.speak(utterance);
	};

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h2 className="text-lg font-semibold">Audio &amp; voiceover</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Preview the voiceover with your browser&apos;s built-in voice, and pick a music bed
					from the Sounds library.
				</p>
			</div>

			<div className="border-border rounded-lg border p-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Volume2 className="size-4" />
						<span className="text-sm font-medium">Voiceover preview</span>
					</div>
					<Button variant="outline" size="sm" onClick={speakAll}>
						<Play className="size-3.5" />
						Play all
					</Button>
				</div>
				<div className="mt-3 flex flex-col gap-2">
					{script.scenes.map((scene) => (
						<div
							key={scene.id}
							className="flex items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0"
						>
							<p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
								{scene.narration || scene.title}
							</p>
							<Button variant="ghost" size="sm" onClick={() => speak(scene)}>
								{speakingId === scene.id ? (
									<Square className="size-3.5" />
								) : (
									<Play className="size-3.5" />
								)}
							</Button>
						</div>
					))}
				</div>
				<p className="text-muted-foreground mt-3 text-[11px]">
					This preview uses your device&apos;s voice. To bake a voiceover into the export, add
					it from the Sounds panel or import an audio file.
				</p>
			</div>

			<div className="border-border flex items-start gap-3 rounded-lg border p-4">
				<Music className="mt-0.5 size-4" />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Background music</p>
					<p className="text-muted-foreground mt-1 text-xs">
						Open the Sounds tab in the editor to search and drop a music track onto the
						timeline.
					</p>
				</div>
			</div>

			<div className="border-border flex items-start gap-3 rounded-lg border p-4">
				<Languages className="mt-0.5 size-4" />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Narration language: {language}</p>
					<p className="text-muted-foreground mt-1 text-xs">
						The script was written in {language}. Change the language on the Brief step to
						regenerate it in another.
					</p>
				</div>
			</div>
		</div>
	);
}

function TimelineStep({
	script,
	builtCount,
}: {
	script: AiScript | null;
	builtCount: number | null;
}) {
	return (
		<div className="flex flex-col items-center gap-4 py-16 text-center">
			<div
				className="flex size-14 items-center justify-center rounded-full text-white"
				style={{ background: BRAND_GRADIENT }}
			>
				<Check className="size-7" />
			</div>
			<h2 className="text-lg font-semibold">
				{builtCount && builtCount > 0
					? `${builtCount} scene${builtCount === 1 ? "" : "s"} added to your timeline`
					: "Nothing was added"}
			</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				Your generated scenes are now normal clips on the timeline — trim them, add text,
				effects or music, and export when you&apos;re happy. Everything stays editable by hand.
			</p>
			{script && (
				<p className="text-muted-foreground text-xs">
					{script.scenes.length} scene{script.scenes.length === 1 ? "" : "s"} planned ·{" "}
					{script.title}
				</p>
			)}
		</div>
	);
}

function KeyDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [key, setKey] = useState("");
	const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODEL);
	const [imageModel, setImageModel] = useState(DEFAULT_IMAGE_MODEL);

	useEffect(() => {
		if (!open) return;
		setKey(aiVideoKeys.getApiKey());
		setTextModel(aiVideoKeys.getTextModel());
		setImageModel(aiVideoKeys.getImageModel());
	}, [open]);

	const save = () => {
		aiVideoKeys.setApiKey(key);
		aiVideoKeys.setTextModel(textModel);
		aiVideoKeys.setImageModel(imageModel);
		toast.success(key ? "API key saved" : "Cleared — using demo mode");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Gemini API key</DialogTitle>
					<DialogDescription>
						Paste a Google AI Studio key to write real scripts and generate real scene
						frames. Without a key, Cinetik runs in demo mode with a sample script and
						placeholder frames.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-2">
					<Field label="API key">
						<Input
							type="password"
							value={key}
							onChange={(event) => setKey(event.target.value)}
							placeholder="AIza…"
							autoComplete="off"
						/>
					</Field>
					<Field label="Text model">
						<Input
							value={textModel}
							onChange={(event) => setTextModel(event.target.value)}
							placeholder={DEFAULT_TEXT_MODEL}
						/>
					</Field>
					<Field label="Image model">
						<Input
							value={imageModel}
							onChange={(event) => setImageModel(event.target.value)}
							placeholder={DEFAULT_IMAGE_MODEL}
						/>
					</Field>
					<p className="text-muted-foreground text-[11px]">
						Your key is stored only in this browser and sent straight to Google&apos;s API.
						It is never sent to Cinetik&apos;s servers.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={save}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
