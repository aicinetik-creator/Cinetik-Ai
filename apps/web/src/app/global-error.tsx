"use client";

import { useEffect, useState } from "react";

/**
 * Replaces Next's bare "Application error: a client-side exception has occurred"
 * screen. Kept dependency-free and inline-styled so it cannot itself fail, and it
 * prints everything needed to diagnose the failure straight onto the screen.
 */

type Probe = { label: string; result: string };

function describe(value: unknown): string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (typeof value === "string") return value;
	const asErr = value as { name?: string; message?: string };
	if (asErr?.name || asErr?.message) {
		return `${asErr.name ?? "Error"}: ${asErr.message ?? "(no message)"}`;
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const [probes, setProbes] = useState<Probe[]>([]);
	const [captured, setCaptured] = useState<string[]>([]);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const out: Probe[] = [];
		const tryIt = (label: string, fn: () => void) => {
			try {
				fn();
				out.push({ label, result: "OK" });
			} catch (err) {
				out.push({ label, result: describe(err) });
			}
		};

		tryIt("localStorage write", () => {
			window.localStorage.setItem("__cinetik_probe", "1");
			window.localStorage.removeItem("__cinetik_probe");
		});
		tryIt("sessionStorage write", () => {
			window.sessionStorage.setItem("__cinetik_probe", "1");
			window.sessionStorage.removeItem("__cinetik_probe");
		});
		tryIt("indexedDB present", () => {
			if (!window.indexedDB) throw new Error("window.indexedDB is missing");
		});
		tryIt("crypto.randomUUID", () => {
			if (!window.crypto?.randomUUID) throw new Error("crypto.randomUUID is missing");
		});
		tryIt("secure context", () => {
			if (!window.isSecureContext) throw new Error("page is not a secure context");
		});
		tryIt("webgl2", () => {
			const c = document.createElement("canvas");
			if (!c.getContext("webgl2")) throw new Error("no webgl2 context");
		});

		setProbes(out);

		const onError = (event: ErrorEvent) =>
			setCaptured((prev) =>
				[...prev, `error: ${event.message} @ ${event.filename}:${event.lineno}`].slice(0, 8),
			);
		const onRejection = (event: PromiseRejectionEvent) =>
			setCaptured((prev) =>
				[...prev, `unhandledrejection: ${describe(event.reason)}`].slice(0, 8),
			);

		window.addEventListener("error", onError);
		window.addEventListener("unhandledrejection", onRejection);
		return () => {
			window.removeEventListener("error", onError);
			window.removeEventListener("unhandledrejection", onRejection);
		};
	}, []);

	const report = [
		`error.name:    ${error?.name ?? "(none)"}`,
		`error.message: ${error?.message ?? "(none)"}`,
		`error.digest:  ${error?.digest ?? "(none)"}`,
		`url:           ${typeof window === "undefined" ? "" : window.location.href}`,
		`in iframe:     ${typeof window === "undefined" ? "" : String(window.top !== window.self)}`,
		`userAgent:     ${typeof navigator === "undefined" ? "" : navigator.userAgent}`,
		"",
		"probes:",
		...probes.map((p) => `  ${p.label}: ${p.result}`),
		...(captured.length ? ["", "captured:", ...captured.map((c) => `  ${c}`)] : []),
		...(error?.stack ? ["", "stack:", error.stack.split("\n").slice(0, 14).join("\n")] : []),
	].join("\n");

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(report);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#0b0b12",
					color: "#f5f5f7",
					fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
					padding: "24px",
				}}
			>
				<div style={{ maxWidth: 640, width: "100%" }}>
					<div
						style={{
							height: 4,
							borderRadius: 4,
							background: "linear-gradient(90deg,#00D2FF 0%,#B026FF 100%)",
							marginBottom: 24,
						}}
					/>
					<h1 style={{ fontSize: 22, margin: "0 0 10px" }}>Cinetik Editor hit a snag</h1>
					<p style={{ fontSize: 14, lineHeight: 1.6, color: "#b9b9c6", margin: "0 0 20px" }}>
						Your projects live inside this browser, so nothing has been lost.
						Please screenshot or copy the report below and send it on.
					</p>

					<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
						<button
							type="button"
							onClick={reset}
							style={{
								cursor: "pointer",
								border: 0,
								borderRadius: 8,
								padding: "10px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: "#fff",
								background: "linear-gradient(90deg,#00D2FF 0%,#B026FF 100%)",
							}}
						>
							Try again
						</button>
						<button
							type="button"
							onClick={() => window.location.reload()}
							style={{
								cursor: "pointer",
								border: "1px solid rgba(255,255,255,.2)",
								borderRadius: 8,
								padding: "10px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: "#fff",
								background: "transparent",
							}}
						>
							Reload
						</button>
						<button
							type="button"
							onClick={copy}
							style={{
								cursor: "pointer",
								border: "1px solid rgba(255,255,255,.2)",
								borderRadius: 8,
								padding: "10px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: "#fff",
								background: "transparent",
							}}
						>
							{copied ? "Copied" : "Copy report"}
						</button>
					</div>

					<div
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: "#8a8a99",
							marginBottom: 8,
							letterSpacing: ".04em",
							textTransform: "uppercase",
						}}
					>
						Error report
					</div>
					<pre
						style={{
							margin: 0,
							padding: 14,
							borderRadius: 10,
							border: "1px solid rgba(255,255,255,.12)",
							background: "rgba(255,255,255,.05)",
							fontSize: 12,
							lineHeight: 1.55,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							color: "#d7d7e0",
							maxHeight: "52vh",
							overflow: "auto",
						}}
					>
						{report}
					</pre>
				</div>
			</body>
		</html>
	);
}
