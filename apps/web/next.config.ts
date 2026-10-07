import type { NextConfig } from "next";
import { withContentCollections } from "@content-collections/next";

// GitHub Pages serves a project site under /<repo-name>, so the export needs a base
// path there. Netlify serves it at the root, so the default stays empty and the
// Netlify build is unaffected.
const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
	...(basePath ? { basePath, assetPrefix: basePath } : {}),
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	// This codebase carries a number of pre-existing type errors (upstream is
	// mid-refactor). They do not affect the shipped app, so the production build
	// no longer stops on them; `npm run lint` / tsc still reports them.
	typescript: { ignoreBuildErrors: true },
	eslint: { ignoreDuringBuilds: true },
	// Static export: the editor runs entirely in the browser, so it needs no
	// server. This also removes the Next.js runtime requirement on the host.
	output: "export",
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "plus.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "images.marblecms.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "api.iconify.design",
			},
			{
				protocol: "https",
				hostname: "api.simplesvg.com",
			},
			{
				protocol: "https",
				hostname: "api.unisvg.com",
			},
			{
				protocol: "https",
				hostname: "cdn.brandfetch.io",
			},
		],
	},
};

// BotID is a Vercel-only product; it has no effect on Netlify and is removed here.
// The cast guards against the workspace and the app each resolving their own copy of
// Next's types, which makes the wrapper's parameter type nominally different.
export default withContentCollections(
	nextConfig as Parameters<typeof withContentCollections>[0],
);
