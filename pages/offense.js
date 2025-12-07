"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function OffensePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [penalties, setPenalties] = useState([]);
  const [scannedVehicle, setScannedVehicle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Load penalties on mount
  useEffect(() => {
    async function fetchPenalties() {
      try {
        const res = await fetch("/api/offense/penalties");
        const data = await res.json();
        setPenalties(data);
      } catch (err) {
        console.error(err);
        setMessage("❌ Failed to load penalties");
      }
    }
    fetchPenalties();
  }, []);

  // Start camera scanning
  useEffect(() => {
    if (scannedVehicle) return; // Stop scanning if already scanned
    let animationFrameId;
    let stream;

    const startCamera = async () => {
      try {
        const video = videoRef.current;
        if (!video) return;

        // Try back camera first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        await video.play();

        setCameraAvailable(true);
        setMessage("");

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const scanLoop = () => {
          if (!video || !canvas || scannedVehicle) return;

          if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);

            if (code && !scanning) {
              setScanning(true);
              setScannedVehicle(code.data);
              submitOffense(code.data);
            } else {
              animationFrameId = requestAnimationFrame(scanLoop);
            }
          } else {
            animationFrameId = requestAnimationFrame(scanLoop);
          }
        };

        animationFrameId = requestAnimationFrame(scanLoop);
      } catch (err) {
        console.error(err);
        setCameraAvailable(false);
        setMessage(
          "❌ Cannot access camera. Check permissions or another app using it."
        );
      }
    };

    const stopCamera = () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stopCamera();
    };
  }, [scannedVehicle, scanning]);

  const submitOffense = async (vehicleID, penaltyID = null) => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/offense/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleID, penaltyID }),
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
      setScanning(false);
    }
  };

  const rescanVehicle = () => {
    setScannedVehicle("");
    setMessage("");
  };

  return (
    <div style={{ padding: "20px", textAlign: "center", maxWidth: "500px", margin: "20px auto" }}>
      <h1>Log Vehicle Offense</h1>
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

      {scannedVehicle && penalties.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Vehicle Scanned: {scannedVehicle}</h2>
          <p>Select a penalty:</p>
          {penalties.map((p) => (
            <button
              key={p.PenaltyID}
              onClick={() => submitOffense(scannedVehicle, p.PenaltyID)}
              style={{
                display: "block",
                margin: "5px 0",
                padding: "10px",
                width: "100%",
              }}
            >
              {p.PenaltyType} - ${p.Amount}
            </button>
          ))}
          <button
            onClick={rescanVehicle}
            style={{
              display: "block",
              marginTop: "15px",
              padding: "10px",
              width: "100%",
              backgroundColor: "#ccc",
            }}
          >
            🔄 Rescan Vehicle
          </button>
        </div>
      )}

      {loading && <p>Processing...</p>}
      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
