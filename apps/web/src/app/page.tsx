import { redirect } from "next/navigation";

// Cinetik: no landing page - the root goes straight to all projects.
export default function Home() {
	redirect("/projects");
}
