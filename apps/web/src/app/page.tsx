"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Cinetik: no landing page - the root goes straight to all projects.
// (Client-side because a static export has no server to issue a redirect.)
export default function Home() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/projects");
	}, [router]);

	return null;
}
