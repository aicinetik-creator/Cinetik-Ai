"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	MagicWand05Icon,
	SlidersVerticalIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { PropertiesPanel } from "@/components/editor/panels/properties";

type MobileSheet = "assets" | "properties" | null;

/**
 * Phone layout for the editor: the desktop side panels become full-screen
 * sheets opened from a bottom bar, so the preview and timeline keep the screen.
 */
export function MobileEditorPanels() {
	const [sheet, setSheet] = useState<MobileSheet>(null);

	return (
		<>
			<nav className="bg-background flex h-14 shrink-0 items-stretch border-t">
				<Button
					variant="text"
					className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-none text-[0.7rem]"
					onClick={() => setSheet("assets")}
				>
					<HugeiconsIcon icon={MagicWand05Icon} className="size-5" />
					Assets
				</Button>
				<Button
					variant="text"
					className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-none text-[0.7rem]"
					onClick={() => setSheet("properties")}
				>
					<HugeiconsIcon icon={SlidersVerticalIcon} className="size-5" />
					Properties
				</Button>
			</nav>

			{sheet !== null && (
				<div className="bg-background fixed inset-0 z-50 flex flex-col">
					<div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
						<span className="text-sm font-medium">
							{sheet === "assets" ? "Assets" : "Properties"}
						</span>
						<Button
							variant="text"
							size="icon"
							aria-label="Close panel"
							onClick={() => setSheet(null)}
						>
							<HugeiconsIcon icon={Cancel01Icon} className="size-5" />
						</Button>
					</div>
					<div className="min-h-0 flex-1">
						{sheet === "assets" ? <AssetsPanel /> : <PropertiesPanel />}
					</div>
				</div>
			)}
		</>
	);
}
