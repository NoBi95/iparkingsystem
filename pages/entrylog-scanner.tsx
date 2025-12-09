// pages/entrylog-scanner.tsx
"use client";

import { useEffect } from "react";

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
        }
      }

      function onScanSuccess(decodedText: string) {
        const input = document.getElementById("vehicleId") as HTMLInputElement | null;
        if (input) input.value = decodedText;
        setMessage("Scanned ID: " + decodedText + " – processing...", false);
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
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="container">
      <h2 className="title">EntryLog Scanner</h2>
      <div id="reader" />

      <div className="field">
        <label className="label">Last Vehicle ID</label>
        <input id="vehicleId" type="text" readOnly />
      </div>

      <p id="message" className="message" />

      <style jsx>{`
        .container {
          max-width: 480px;
          margin: 40px auto;
          padding: 20px;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }
        .title {
          text-align: center;
          color: #1e3a8a;
          margin-bottom: 20px;
        }
        #reader {
          width: 100%;
          margin-bottom: 15px;
        }
        .field {
          margin: 10px 0;
        }
        .label {
          font-size: 0.9rem;
          color: #475569;
          margin-bottom: 4px;
          display: block;
        }
        input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 1rem;
        }
        .message {
          margin-top: 12px;
          text-align: center;
          font-weight: 500;
        }
        .message.success {
          color: #16a34a;
        }
        .message.error {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}
