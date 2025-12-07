import { useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';

// Access the default export of the module
const QrReader = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.default),
  { ssr: false }
);

export default function VehicleScanner() {
  const [vehicleId, setVehicleId] = useState('');
  const [message, setMessage] = useState('');

  const handleScan = async (data) => {
    if (data) {
      const scannedId = data.text; // QR code contains VehicleID
      setVehicleId(scannedId);

      try {
        const res = await axios.post('/api/scan-entry', { vehicleId: scannedId });
        setMessage(res.data.message);
      } catch (err) {
        setMessage(err.response?.data?.message || 'Error scanning vehicle');
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    setMessage('Camera error');
  };

  return (
    <div>
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        constraints={{ facingMode: 'environment' }}
        style={{ width: '100%' }}
      />
      <p>Scanned VehicleID: {vehicleId}</p>
      <p>{message}</p>
    </div>
  );
}
