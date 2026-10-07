import { SITE_URL } from "@/site/brand";
import type { MetadataRoute } from "next";


// Required for `output: "export"`: metadata routes must be static.
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
		{ url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
		{ url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
	];
}
