// pages/entrylog-scanner.tsx
"use client";

import { useEffect } from "react";
import styles from "../styles/Scanner.module.css";

export default function EntrylogScannerPage() {
  useEffect(() => {
    // load html5-qrcode script from CDN
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;

    script.onload = () => {
      const win = window as any;
      if (!win.Html5QrcodeScanner) {
        console.error("Html5QrcodeScanner not found on window");
        return;
      }

      // 🔒 lock to prevent rapid multiple scans
      let scanLocked = false;
      const COOLDOWN_MS = 3000; // 3 seconds; change if you want longer/shorter

      function setMessage(msg: string, isError: boolean) {
        const el = document.getElementById("message");
        if (!el) return;
        el.textContent = msg;
        el.className = "message " + (isError ? "error" : "success");
      }

      async function processScan(vehicleId: string) {
        try {
          const res = await fetch("/api/entrylog-scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicleId }),
          });

          const text = await res.text();
          console.log("RAW RESPONSE:", res.status, text);

          let data: any;
          try {
            data = JSON.parse(text);
          } catch (e) {
            setMessage(
              "Server returned non-JSON: " + text.slice(0, 100),
              true
            );
            return;
          }

          if (data.success) {
            const mode = data.mode === "exit" ? "Exit" : "Entry";
            setMessage(`✅ ${mode}: ${data.message}`, false);
          } else {
            setMessage(`⚠️ ${data.message || "Unknown error"}`, true);
          }
        } catch (err) {
          console.error(err);
          setMessage("❌ Network error calling /api/entrylog-scan", true);
        } finally {
          // ⏳ after processing finished, start cooldown
          setTimeout(() => {
            scanLocked = false; // 🔓 allow next scan
          }, COOLDOWN_MS);
        }
      }

      function onScanSuccess(decodedText: string) {
        // if we're in cooldown, ignore this scan
        if (scanLocked) return;
        scanLocked = true; // lock immediately

        const input = document.getElementById(
          "vehicleId"
        ) as HTMLInputElement | null;
        if (input) input.value = decodedText;

        setMessage(
          "Scanned ID: " + decodedText + " – processing...",
          false
        );

        // fire async processing (cooldown unlock happens in finally)
        processScan(decodedText);
      }

      function onScanFailure(_error: any) {
        // ignore noisy scan failures
      }

      const html5QrcodeScanner = new win.Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: 250 },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    };

    document.body.appendChild(script);

    return () => {
      // 🧹 avoid NotFoundError if script already removed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>EntryLog Scanner</h2>
      <div id="reader" className={styles.scannerWrapper} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="vehicleId">
          Last Vehicle ID
        </label>
        <input
          id="vehicleId"
          type="text"
          readOnly
          className={styles.input}
        />
      </div>

      <p id="message" className={styles.message} />
    </div>
  );
}
