import Link from "next/link";
import { BrandMark, Card } from "@kcl/ui";
export default function NotFound() { return <main className="access-page"><Card className="access-card"><BrandMark /><h1>That page isn’t here</h1><p>The address may be old or incomplete. Return to the safe registration home.</p><Link className="button button-primary" href="/">Go home</Link></Card></main>; }
