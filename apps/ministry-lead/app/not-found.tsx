import Link from "next/link";
import { BrandMark } from "@kcl/ui";

export default function NotFound() {
  return (
    <main className="access-page">
      <div className="access-card">
        <BrandMark />
        <h1>Page not found</h1>
        <p>The page may have moved or is no longer available.</p>
        <Link className="button button-primary" href="/">Return safely</Link>
      </div>
    </main>
  );
}
