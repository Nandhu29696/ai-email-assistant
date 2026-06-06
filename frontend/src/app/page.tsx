import { redirect } from "next/navigation";

export default function RootPage() {
  // Server-side: always send to login first; client guard handles the rest
  redirect("/login");
}
