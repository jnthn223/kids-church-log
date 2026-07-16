"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Copy, Download, Printer, RefreshCw } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import { replaceFamilyPass, useAuthAccess } from "@kcl/firebase";
import type { FamilyPassSecret, Household } from "@kcl/types";

export function FamilyPassCard({ family, pass }: { family: Household; pass: FamilyPassSecret }) {
  const { member } = useAuthAccess();
  const [qr, setQr] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void QRCode.toDataURL(pass.currentOpaqueToken, {
      width: 560,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#14213D", light: "#FFFFFF" }
    }).then(setQr).catch(() => setError("The QR image could not be generated."));
  }, [pass.currentOpaqueToken]);

  async function replace() {
    if (!member) return;
    const verified = window.confirm("Have you verified this person’s relationship to the household using the ministry’s approved process? The old pass will stop working immediately.");
    if (!verified) return;
    const reason = window.prompt("Why is this pass being replaced? (For example: Lost by guardian)");
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await replaceFamilyPass(member, family.id, reason);
      setNotice("The old pass was invalidated and a new pass was issued.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "The pass could not be replaced.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!qr) return;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) return setError("The pass image could not be created.");

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#14213D";
    context.textAlign = "center";
    context.font = "800 30px Arial, sans-serif";
    context.fillText("Kids Church Log", 360, 55);
    context.font = "700 27px Arial, sans-serif";
    context.fillText(family.householdName, 360, 105);

    const qrImage = new window.Image();
    await new Promise<void>((resolve, reject) => {
      qrImage.onload = () => resolve();
      qrImage.onerror = () => reject(new Error("QR_IMAGE_UNAVAILABLE"));
      qrImage.src = qr;
    }).catch(() => setError("The QR image could not be added to the pass."));
    if (!qrImage.complete || !qrImage.naturalWidth) return;
    context.drawImage(qrImage, 90, 140, 540, 540);

    context.fillStyle = "#14213D";
    context.font = "700 23px Arial, sans-serif";
    context.fillText("Scan for check-in and verified check-out", 360, 730);
    context.fillStyle = "#59647A";
    context.font = "18px Arial, sans-serif";
    context.fillText("Can’t scan? Enter this Family Key", 360, 780);
    context.fillStyle = "#14213D";
    context.font = "700 25px monospace";
    context.fillText(pass.formattedDisplayKey, 360, 825);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${family.householdName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-family-pass.png`;
    link.click();
  }

  return <Card className="pass-card">
    {notice && <div className="form-success" role="status">{notice}</div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="section-head"><span className="brand-name">Kids Church <b>Log</b></span><StatusChip tone={pass.status === "ACTIVE" ? "success" : "danger"}>{pass.status}</StatusChip></div>
    <h2>{family.householdName}</h2>
    <p className="muted">One pass for this household · {family.childIds?.length || 0} registered {(family.childIds?.length || 0) === 1 ? "child" : "children"}</p>
    <div className="pass-qr">{qr ? <Image unoptimized priority src={qr} width={320} height={320} alt={`Family Pass QR for ${family.householdName}`} /> : <div className="spinner" aria-label="Generating QR code" />}</div>
    <p className="pass-instruction">Scan for check-in and verified check-out.</p>
    <div className="pass-key-fallback"><span>Can’t scan? Enter this Family Key</span><code>{pass.formattedDisplayKey}</code></div>
    <div className="pass-actions"><Button variant="secondary" onClick={() => window.print()}><Printer size={18} /> Print pass</Button><Button onClick={() => void download()} disabled={!qr}><Download size={18} /> Download pass</Button><Button variant="ghost" onClick={() => { void navigator.clipboard.writeText(pass.formattedDisplayKey); setNotice("Family Key copied."); }}><Copy size={18} /> Copy key</Button><Button variant="danger" disabled={busy || pass.status !== "ACTIVE"} onClick={() => void replace()}><RefreshCw size={18} /> {busy ? "Replacing…" : "Replace lost/damaged pass"}</Button></div>
  </Card>;
}
