import type { NextConfig } from "next";
import { withContentCollections } from "@content-collections/next";

const nextConfig: NextConfig = {
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	// Static export: the editor runs entirely in the browser, so it needs no
	// server. This also removes the Next.js runtime requirement on the host.
	output: "export",
	// Netlify's Next.js runtime is an OpenNext adapter and packages the app itself.
	// Combining an adapter with `output: "standalone"` crashes the Next 16 build
	// (missing .next/next-server.js.nft.json), so it stays off unless explicitly asked for.
	output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
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
export default withContentCollections(nextConfig);
