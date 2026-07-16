import Link from "next/link";
import { BrandMark, Card } from "@kcl/ui";
export default function NotFound() {
  return <main className="access-page"><Card className="access-card"><BrandMark /><h1>That station page isn’t here</h1><p>Return to the active Kids Church workflow.</p><Link className="button button-primary" href="/">Go to station</Link></Card></main>;
}
