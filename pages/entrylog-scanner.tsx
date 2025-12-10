// pages/entrylog-scanner.tsx
"use client";

import { useEffect } from "react";
import styles from "../styles/Scanner.module.css";

export default function EntrylogScannerPage() {
  useEffect(() => {
    const win = window as any;

    // 🧹 cleanup when leaving page / hot reload
    return () => {
      if (win._entryQrInstance) {
        try {
          win._entryQrInstance
            .stop()
            .then(() => win._entryQrInstance.clear())
            .catch(() => {});
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    // load html5-qrcode script from CDN (only if not already loaded)
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="html5-qrcode"]'
    );
    if (existing) {
      setupScanner();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;

    script.onload = () => {
      setupScanner();
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  function setupScanner() {
    const win = window as any;
    if (!win.Html5Qrcode) {
      console.error("Html5Qrcode not found on window");
      return;
    }

    // 🧽 CLEAR any leftover UI (old camera dropdown, etc.)
    const reader = document.getElementById("reader");
    if (reader) reader.innerHTML = "";

    // 🔒 lock to prevent rapid multiple scans
    let scanLocked = false;
    const COOLDOWN_MS = 3000; // 3 seconds

    function setMessage(msg: string, isError: boolean) {
      const el = document.getElementById("message");
      if (!el) return;
      el.textContent = msg;
      el.className =
        styles.message + " " + (isError ? styles.error : styles.success);
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
          setMessage("Server returned non-JSON: " + text.slice(0, 100), true);
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
        setTimeout(() => {
          scanLocked = false; // 🔓 allow next scan
        }, COOLDOWN_MS);
      }
    }

    function onScanSuccess(decodedText: string) {
      if (scanLocked) return;
      scanLocked = true;

      const input = document.getElementById(
        "vehicleId"
      ) as HTMLInputElement | null;
      if (input) input.value = decodedText;

      setMessage("Scanned ID: " + decodedText + " – processing...", false);
      processScan(decodedText);
    }

    function onScanFailure(_error: any) {
      // ignore noisy scan failures
    }

    // 🆕 use Html5Qrcode directly – NO default UI, NO camera dropdown
    // and lock to back camera only
    const qr = new win.Html5Qrcode("reader");
    win._entryQrInstance = qr;

    qr
      .start(
        { facingMode: "environment" }, // 🔒 BACK CAMERA ONLY
        {
          fps: 10,
          qrbox: 250,
        },
        onScanSuccess,
        onScanFailure
      )
      .catch((err: any) => {
        console.error("Error starting Html5Qrcode:", err);
        setMessage("Could not start camera scanner.", true);
      });
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>EntryLog Scanner</h2>
      <div id="reader" className={styles.scannerWrapper} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="vehicleId">
          Last Vehicle ID
        </label>
        <input id="vehicleId" type="text" readOnly className={styles.input} />
      </div>

      <p id="message" className={styles.message} />
    </div>
  );
}
