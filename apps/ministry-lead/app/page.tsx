"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { BrandMark, Button } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";
import type { MinistryRole } from "@kcl/types";

const products: Array<{
  role: MinistryRole;
  label: string;
  eyebrow: string;
  description: string;
  href: string;
  icon: typeof BarChart3;
  tone: string;
  features: string[];
}> = [
  {
    role: "MINISTRY_LEAD",
    label: "Ministry Lead",
    eyebrow: "Oversight",
    description: "Configure ministry operations, approve team access, and understand attendance without slowing down Sunday service.",
    href: "/overview/",
    icon: BarChart3,
    tone: "yellow",
    features: ["Service planning", "Team governance", "Reports & audit"]
  },
  {
    role: "ADMIN_VOLUNTEER",
    label: "Admin Volunteer",
    eyebrow: "Family welcome",
    description: "Register a family once, keep care information current, and issue a reusable QR Family Pass.",
    href: "https://kidschurchlog-register.web.app",
    icon: Users,
    tone: "red",
    features: ["Assisted registration", "Duplicate prevention", "Family Pass"]
  },
  {
    role: "KIDS_CHURCH_VOLUNTEER",
    label: "Kids Church Volunteer",
    eyebrow: "Sunday operations",
    description: "Run fast check-in, see live rooms, and complete guardian-verified checkout from a mobile station.",
    href: "https://kidschurchlog-volunteer.web.app",
    icon: QrCode,
    tone: "blue",
    features: ["QR check-in", "Live room planning", "Verified checkout"]
  }
];

export default function Home() {
  const { state, member, user, signOutUser } = useAuthAccess();
  const approvedProducts = products.filter((product) =>
    member?.roles.includes(product.role)
  );
  const accessReady = state === "ACTIVE" || state === "WRONG_ROLE";

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" aria-label="KidsChurchLog home"><BrandMark /></Link>
        <nav aria-label="Landing navigation">
          <a href="#products">Products</a>
          <a href="#safety">Safety</a>
          {accessReady ? (
            <a className="landing-nav-cta" href="#workspaces">My workspaces</a>
          ) : (
            <Link className="landing-nav-cta" href="/sign-in/">Team sign in</Link>
          )}
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><Sparkles size={15} /> Built for the whole Kids Church team</span>
          <h1>Every child known.<br /><em>Every release careful.</em></h1>
          <p>
            KidsChurchLog connects family registration, Sunday attendance, safe checkout,
            and ministry oversight—without requiring families to install another app.
          </p>
          <div className="landing-actions">
            <a className="button button-primary" href="#products">Explore the platform <ArrowRight size={18} /></a>
            <Link className="button landing-secondary" href="/sign-in/">Find my workspace</Link>
          </div>
          <div className="landing-proof">
            <span><CheckCircle2 /> No family account required</span>
            <span><CheckCircle2 /> Role-based access</span>
            <span><CheckCircle2 /> Safety-first checkout</span>
          </div>
        </div>
        <div className="landing-visual" aria-label="KidsChurchLog workflow overview">
          <div className="visual-card visual-family"><span><Users /></span><div><small>Family registered</small><strong>Santos Family</strong></div><BadgeCheck /></div>
          <div className="visual-line" />
          <div className="visual-card visual-checkin"><span><QrCode /></span><div><small>Sunday check-in</small><strong>2 children · Room 3</strong></div><CheckCircle2 /></div>
          <div className="visual-line" />
          <div className="visual-card visual-release"><span><ShieldCheck /></span><div><small>Verified release</small><strong>Authorized guardian</strong></div><CheckCircle2 /></div>
        </div>
      </section>

      {accessReady && approvedProducts.length > 0 && (
        <section className="workspace-strip" id="workspaces">
          <div>
            <span className="workspace-avatar">{member?.displayName.charAt(0) || "T"}</span>
            <div><small>Signed in as {user?.email}</small><h2>Welcome, {member?.displayName}</h2></div>
          </div>
          <div className="workspace-links">
            {approvedProducts.map((product) => (
              <a key={product.role} className="button button-secondary" href={product.href}>
                Open {product.label} <ArrowRight size={17} />
              </a>
            ))}
            <Button variant="ghost" onClick={() => void signOutUser()}>Sign out</Button>
          </div>
        </section>
      )}

      <section className="landing-section" id="products">
        <div className="landing-section-head">
          <span>Three focused applications</span>
          <h2>One ministry, without one cluttered dashboard.</h2>
          <p>Each team sees the information and actions needed for its responsibility.</p>
        </div>
        <div className="product-grid">
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <article className={`product-card product-${product.tone}`} key={product.role}>
                <div className="product-icon"><Icon /></div>
                <small>{product.eyebrow}</small>
                <h3>{product.label}</h3>
                <p>{product.description}</p>
                <ul>{product.features.map((feature) => <li key={feature}><CheckCircle2 /> {feature}</li>)}</ul>
                <a href={product.href}>Open application <ArrowRight size={16} /></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="safety-section" id="safety">
        <div className="safety-mark"><ShieldCheck /></div>
        <div>
          <span>Designed around child safety</span>
          <h2>A QR code finds the family. It never replaces human verification.</h2>
          <p>
            Checkout shows only guardians authorized for the selected children and requires
            the volunteer to confirm identity before release. Unexpected delegates are escalated,
            not silently accepted.
          </p>
        </div>
        <div className="safety-points">
          <div><ClipboardCheck /><span><strong>Auditable</strong><small>Important changes retain actor and reason.</small></span></div>
          <div><BadgeCheck /><span><strong>Privacy-minded</strong><small>The Family Pass contains no personal details.</small></span></div>
          <div><QrCode /><span><strong>Family-friendly</strong><small>Printed QR and fallback key; no phone required.</small></span></div>
        </div>
      </section>

      <footer className="landing-footer">
        <BrandMark />
        <p>A portfolio project for thoughtful, accessible Kids Church operations.</p>
        <Link href="/sign-in/">Team sign in <ArrowRight size={15} /></Link>
      </footer>
    </main>
  );
}
