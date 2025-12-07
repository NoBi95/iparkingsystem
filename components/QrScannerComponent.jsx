'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamically import the scanner to disable SSR (camera only works in browser)
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.default),
  { ssr: false }
);

export default function QrScannerComponent({ onScanResult }) {
  const [error, setError] = useState('');

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <Scanner
        constraints={{ video: { facingMode: 'environment' } }}
        onDecode={(result) => {
          if (result?.text) onScanResult(result.text);
        }}
        onError={(err) => {
          console.error(err);
          setError('Camera not accessible. Allow permission.');
        }}
        style={{ width: '100%', height: '400px', border: '1px solid black' }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
