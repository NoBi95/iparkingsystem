import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ManualVisitor() {
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [exitPlate, setExitPlate] = useState('');
  const [exitMessage, setExitMessage] = useState('');

  const admin = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('admin') : '{}');

  useEffect(() => {
    if (!admin) router.push('/login');
  }, [router, admin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!plateNumber || !vehicleType) {
      setMessage('Plate Number and Vehicle Type are required');
      return;
    }

    try {
      const res = await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber,
          vehicleType,
          companyName,
          driverName,
          purpose,
          recordedBy: admin.AdminID,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Visitor vehicle successfully recorded!');
        setPlateNumber('');
        setVehicleType('');
        setCompanyName('');
        setDriverName('');
        setPurpose('');
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setMessage('Error recording visitor vehicle.');
    }
  };

  const handleExit = async () => {
    setExitMessage('');
    if (!exitPlate) {
      setExitMessage('Enter plate number to record exit');
      return;
    }

    try {
      const res = await fetch('/api/visitor/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plateNumber: exitPlate }),
      });

      const data = await res.json();
      if (data.success) {
        setExitMessage(`Exit recorded for ${exitPlate}`);
        setExitPlate('');
      } else {
        setExitMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setExitMessage('Error recording exit.');
    }
  };

  return (
    <div className="container">
      <h2 className="title">Manual Visitor Input</h2>

      {message && (
        <p className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>{message}</p>
      )}

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Plate Number"
          value={plateNumber}
          onChange={e => setPlateNumber(e.target.value)}
          required
        />
        <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} required>
          <option value="">Select Vehicle Type</option>
          <option value="Car">Car</option>
          <option value="Motorcycle">Motorcycle</option>
        </select>
        <input
          type="text"
          placeholder="Company Name"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Driver Name"
          value={driverName}
          onChange={e => setDriverName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Purpose"
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
        />
        <button type="submit" className="btn save">Save Visitor</button>
      </form>

      <hr className="divider" />

      <h3 className="subtitle">Record Vehicle Exit</h3>
      {exitMessage && (
        <p className={`message ${exitMessage.includes('Exit recorded') ? 'success' : 'error'}`}>{exitMessage}</p>
      )}

      <div className="exit-form">
        <input
          type="text"
          placeholder="Enter Plate Number"
          value={exitPlate}
          onChange={e => setExitPlate(e.target.value)}
        />
        <button onClick={handleExit} className="btn exit">Exit Vehicle</button>
      </div>

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 40px auto;
          padding: 30px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f8fafd, #e0ebf8);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 25px;
        }
        .title {
          text-align: center;
          font-size: 1.8rem;
          color: #1E3A8A;
        }
        .subtitle {
          text-align: center;
          font-size: 1.4rem;
          color: #1E40AF;
        }
        .form, .exit-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .exit-form {
          flex-direction: row;
          gap: 10px;
        }
        input, select {
          padding: 12px 15px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 1rem;
          transition: all 0.2s ease-in-out;
        }
        input:focus, select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
          outline: none;
        }
        .btn {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn.save {
          background-color: #3b82f6;
          color: white;
        }
        .btn.save:hover {
          background-color: #2563eb;
        }
        .btn.exit {
          background-color: #ef4444;
          color: white;
          flex: 1;
        }
        .btn.exit:hover {
          background-color: #dc2626;
        }
        .divider {
          border: none;
          border-top: 1px solid #cbd5e1;
          margin: 20px 0;
        }
        .message {
          text-align: center;
          font-weight: 500;
        }
        .success {
          color: #16a34a;
        }
        .error {
          color: #dc2626;
        }

        @media (max-width: 480px) {
          .exit-form {
            flex-direction: column;
          }
          .btn.exit {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
