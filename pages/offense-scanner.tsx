// pages/offense-scanner.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "../styles/Scanner.module.css";

interface Vehicle {
  id: number;
  plateNumber: string;
  vehicleType: string;
  color?: string;
  status?: string;
}

interface Penalty {
  _id: number;
  type: string;
  amount: number;
}

interface Offense {
  _id: number;
  vehicleId: number;
  penaltyId: number;
  status: string;
  date?: string | Date;
}

const OffenseScannerPage = () => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [message, setMessage] = useState<string>("");
  const [vehicleIdInput, setVehicleIdInput] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="html5-qrcode"]'
    );
    if (existing) {
      initScanner();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => {
      initScanner();
    };
    document.body.appendChild(script);
  }, []);

  function setUIMessage(msg: string, isError: boolean) {
    setMessage((isError ? "⚠️ " : "✅ ") + msg);
  }

  async function loadPenaltiesForVehicle(vehicleId: string | number) {
    try {
      const res = await fetch("/api/offense-penalties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON from /api/offense-penalties:", text);
        setUIMessage("Server returned non-JSON for offense-penalties", true);
        return;
      }

      if (!data.success) {
        setVehicle(null);
        setPenalties([]);
        setOffenses([]);
        setUIMessage(data.message || "Failed to load penalties", true);
        return;
      }

      setVehicle(data.vehicle);
      setPenalties(data.penalties || []);
      setOffenses(data.recentOffenses || []);
      setUIMessage("Vehicle loaded. Choose a penalty.", false);
    } catch (err) {
      console.error(err);
      setUIMessage("Network error calling /api/offense-penalties", true);
    }
  }

  async function handleCreateOffense(penaltyId: number) {
    if (!vehicle) {
      setUIMessage("No vehicle loaded.", true);
      return;
    }

    try {
      const res = await fetch("/api/offense-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          penaltyId,
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON from /api/offense-create:", text);
        setUIMessage("Server returned non-JSON for offense-create", true);
        return;
      }

      if (data.success) {
        setUIMessage(data.message || "Offense created.", false);
        await loadPenaltiesForVehicle(vehicle.id);
      } else {
        setUIMessage(data.message || "Could not create offense.", true);
      }
    } catch (err) {
      console.error(err);
      setUIMessage("Network error calling /api/offense-create", true);
    }
  }

  function initScanner() {
    const win = window as any;
    const Html5QrcodeScanner = win.Html5QrcodeScanner;
    if (!Html5QrcodeScanner) {
      console.error("Html5QrcodeScanner not found on window");
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    );

    const onScanSuccess = (decodedText: string) => {
      setVehicleIdInput(decodedText);
      setUIMessage(
        "Scanned vehicle ID: " + decodedText + ". Loading penalties...",
        false
      );
      loadPenaltiesForVehicle(decodedText);
    };

    const onScanFailure = (_error: any) => {
      // ignore noisy failures
    };

    scanner.render(onScanSuccess, onScanFailure);
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Offense Scanner</h2>

      <div id="reader" className={styles.scannerWrapper} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="vehicleIdInput">
          Last Vehicle ID
        </label>
        <input
          id="vehicleIdInput"
          type="text"
          value={vehicleIdInput}
          readOnly
          className={styles.input}
        />
      </div>

      {vehicle && (
        <div className={styles.vehicleInfo}>
          <strong>Vehicle Information</strong>
          <div>
            <span className={styles.vehicleInfoLabel}>Plate Number:</span>
            <span>{vehicle.plateNumber || vehicle.id}</span>
          </div>
          <div>
            <span className={styles.vehicleInfoLabel}>Type:</span>
            <span>{vehicle.vehicleType || "N/A"}</span>
          </div>
          <div>
            <span className={styles.vehicleInfoLabel}>Color:</span>
            <span>{vehicle.color || "N/A"}</span>
          </div>
          <div>
            <span className={styles.vehicleInfoLabel}>Status:</span>
            <span>{vehicle.status || "N/A"}</span>
          </div>
        </div>
      )}

      <div className={styles.penalties}>
        <h4>Apply Penalty</h4>
        {penalties.length === 0 ? (
          <p className={styles.noPenalties}>
            <em>No penalties defined (except Expired Registration).</em>
          </p>
        ) : (
          penalties.map((p) => (
            <div key={p._id} className={styles.penaltyItem}>
              <div className={styles.penaltyDetails}>
                <div className={styles.penaltyName}>{p.type}</div>
                <div className={styles.penaltyAmount}>Amount: ₱{p.amount.toLocaleString()}</div>
              </div>
              <button
                className={`${styles.btn} ${styles.btnPenalty}`}
                onClick={() => handleCreateOffense(p._id)}
              >
                Select
              </button>
            </div>
          ))
        )}
      </div>

      {offenses.length > 0 && (
        <div className={styles.offenseList}>
          <h4>Recent Offenses</h4>
          {offenses.map((o) => {
            const d = o.date ? new Date(o.date) : null;
            return (
              <div key={o._id} className={styles.offenseItem}>
                <strong>#{o._id}</strong> – Penalty ID: {o.penaltyId}, Status: <span style={{ fontWeight: 600 }}>{o.status}</span>
                {d ? <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#64748b' }}>{d.toLocaleString()}</div> : null}
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <p
          className={`${styles.message} ${
            message.startsWith("✅") ? styles.success : styles.error
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default OffenseScannerPage;
