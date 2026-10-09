"use client";

/**
 * Replaces Next's bare "Application error: a client-side exception has occurred"
 * screen. Kept dependency-free and inline-styled so it cannot itself fail, and it
 * surfaces the real message so a failure is diagnosable instead of opaque.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const message = error?.message || "Unknown error";

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
					fontFamily:
						"Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
					padding: "24px",
				}}
			>
				<div style={{ maxWidth: 520, width: "100%" }}>
					<div
						style={{
							height: 4,
							borderRadius: 4,
							background: "linear-gradient(90deg,#00D2FF 0%,#B026FF 100%)",
							marginBottom: 24,
						}}
					/>
					<h1 style={{ fontSize: 22, margin: "0 0 10px" }}>
						Cinetik Editor hit a snag
					</h1>
					<p style={{ fontSize: 14, lineHeight: 1.6, color: "#b9b9c6", margin: "0 0 8px" }}>
						Something went wrong while loading the editor. Your projects are
						stored inside this browser, so nothing has been lost.
					</p>
					<p style={{ fontSize: 14, lineHeight: 1.6, color: "#b9b9c6", margin: "0 0 20px" }}>
						If this keeps happening, open the editor in its own browser tab
						rather than inside an embedded frame — browsers block storage for
						embedded pages, which the editor needs.
					</p>

					<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
						<a
							href="https://cinetik.in"
							style={{
								border: "1px solid rgba(255,255,255,.2)",
								borderRadius: 8,
								padding: "10px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: "#fff",
								textDecoration: "none",
							}}
						>
							Go to cinetik.in
						</a>
					</div>

					<details style={{ marginTop: 22 }}>
						<summary
							style={{ cursor: "pointer", fontSize: 12, color: "#8a8a99" }}
						>
							Technical details (share these if you report this)
						</summary>
						<pre
							style={{
								marginTop: 10,
								padding: 12,
								borderRadius: 8,
								background: "rgba(255,255,255,.06)",
								fontSize: 12,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								color: "#d7d7e0",
							}}
						>
							{message}
							{error?.digest ? `\n\ndigest: ${error.digest}` : ""}
						</pre>
					</details>
				</div>
			</body>
		</html>
	);
}
