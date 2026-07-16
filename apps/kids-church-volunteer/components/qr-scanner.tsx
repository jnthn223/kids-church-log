"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@kcl/ui";

type DetectorResult = { rawValue: string };
type Detector = { detect(source: HTMLVideoElement): Promise<DetectorResult[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function QrScanner({
  onRead,
  onClose
}: {
  onRead(value: string): void;
  onClose(): void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>();
  const handledRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const DetectorClass = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!DetectorClass) {
        setError("This browser does not support camera QR scanning. Enter the Family Key instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new DetectorClass({ formats: ["qr_code"] });
        const scan = async () => {
          if (handledRef.current || cancelled) return;
          try {
            const results = await detector.detect(video);
            const value = results[0]?.rawValue;
            if (value) {
              handledRef.current = true;
              onRead(value);
              return;
            }
          } catch {
            // A frame can fail while the camera is focusing; continue scanning.
          }
          frameRef.current = requestAnimationFrame(() => void scan());
        };
        void scan();
      } catch (value) {
        const name = value instanceof DOMException ? value.name : "";
        setError(name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access or enter the Family Key."
          : "The camera could not be started. Enter the Family Key instead.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [onRead]);

  return <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="Scan Family Pass"><div className="scanner"><div className="scanner-head"><div><Camera size={20} /><strong>Scan Family Pass</strong></div><Button variant="ghost" aria-label="Close scanner" onClick={onClose}><X /></Button></div>{error ? <div className="scanner-error"><Camera size={36} /><p>{error}</p><Button onClick={onClose}>Enter key instead</Button></div> : <div className="camera-frame"><video ref={videoRef} muted playsInline aria-label="Camera preview" /><div className="scan-target" /><p>Hold the QR code inside the frame</p></div>}</div></div>;
}
