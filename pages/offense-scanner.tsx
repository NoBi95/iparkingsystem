// pages/offense-scanner.tsx
import { useEffect, useState } from "react";

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
    <div className="container">
      <h2 className="title">Offense Scanner</h2>

      <div id="reader" />

      <div className="field">
        <label className="label">Last Vehicle ID</label>
        <input type="text" value={vehicleIdInput} readOnly />
      </div>

      {vehicle && (
        <div className="vehicle-info">
          <strong>Vehicle:</strong> {vehicle.plateNumber || vehicle.id}
          <br />
          Type: {vehicle.vehicleType || "N/A"}
          <br />
          Color: {vehicle.color || "N/A"}
          <br />
          Status: {vehicle.status || "N/A"}
        </div>
      )}

      <div className="penalties">
        <h4>Apply Penalty</h4>
        {penalties.length === 0 ? (
          <p className="no-penalties">
            <em>No penalties defined (except Expired Registration).</em>
          </p>
        ) : (
          penalties.map((p) => (
            <div key={p._id} className="penalty-item">
              <div>
                <div className="penalty-name">{p.type}</div>
                <div className="penalty-amount">Amount: {p.amount}</div>
              </div>
              <button
                className="btn btn-penalty"
                onClick={() => handleCreateOffense(p._id)}
              >
                Select
              </button>
            </div>
          ))
        )}
      </div>

      {offenses.length > 0 && (
        <div className="offense-list">
          <h4>Recent Offenses</h4>
          {offenses.map((o) => {
            const d = o.date ? new Date(o.date) : null;
            return (
              <div key={o._id} className="offense-item">
                #{o._id} – PenaltyId: {o.penaltyId}, Status: {o.status}
                {d ? <> ({d.toLocaleString()})</> : null}
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <p
          className={
            "message " +
            (message.startsWith("✅") ? "success" : "error")
          }
        >
          {message}
        </p>
      )}

      <style jsx>{`
        .container {
          max-width: 520px;
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
        .vehicle-info {
          margin-top: 10px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #eff6ff;
          padding: 8px;
          border-radius: 8px;
        }
        .penalties {
          margin-top: 16px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
        }
        .penalty-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .penalty-name {
          font-size: 0.95rem;
          color: #0f172a;
        }
        .penalty-amount {
          font-size: 0.85rem;
          color: #64748b;
          margin-right: 8px;
        }
        .btn {
          padding: 6px 10px;
          border-radius: 6px;
          border: none;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .btn-penalty {
          background-color: #3b82f6;
          color: white;
        }
        .btn-penalty:hover {
          background-color: #2563eb;
        }
        .offense-list {
          margin-top: 12px;
          font-size: 0.85rem;
          color: #475569;
        }
        .offense-item {
          padding: 4px 0;
          border-bottom: 1px dotted #e5e7eb;
        }
        .message {
          margin-top: 12px;
          text-align: center;
          font-weight: 500;
        }
        .success {
          color: #16a34a;
        }
        .error {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
};

export default OffenseScannerPage;
