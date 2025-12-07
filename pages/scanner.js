"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function Scanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanResult, setScanResult] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let animationFrameId;
    let stream;

    const startCamera = async () => {
      try {
        const video = videoRef.current;
        if (!video) return;

        // Try back camera first, fallback to any camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        // Camera successfully accessed
        setCameraAvailable(true);
        setMessage(""); // Clear any previous camera errors

        video.srcObject = stream;
        await video.play();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const scanLoop = () => {
          if (!video || !canvas) return;

          if (video.videoWidth === 0 || video.videoHeight === 0) {
            animationFrameId = requestAnimationFrame(scanLoop);
            return;
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);

          if (code && !scanning) {
            setScanning(true);
            setScanResult(code.data);
            submitQR(code.data);
          } else {
            animationFrameId = requestAnimationFrame(scanLoop);
          }
        };

        animationFrameId = requestAnimationFrame(scanLoop);
      } catch (err) {
        console.error(err);
        setCameraAvailable(false);
        setMessage("❌ Cannot access camera. Check permissions or if another app is using it.");
      }
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);

  const submitQR = async (vehicleID) => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/register/entry-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleID }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(`⚠️ ${err.message || "Server rejected request"}`);
      } else {
        const data = await res.json();
        setMessage(`✅ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Server error");
    } finally {
      setLoading(false);
      setScanning(false); // allow scanning again
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>QR Scanner</h1>
      <p>Scan a vehicle QR code</p>

      {cameraAvailable ? (
        <>
          <video
            ref={videoRef}
            style={{
              width: "100%",
              maxWidth: "400px",
              borderRadius: "8px",
              backgroundColor: "#000",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </>
      ) : (
        <p style={{ color: "red" }}>❌ Camera not available on this device.</p>
      )}

      {loading && <p>Processing...</p>}
      {scanResult && <p>Scanned QR: {scanResult}</p>}
      {message && <p>{message}</p>}
    </div>
  );
}
