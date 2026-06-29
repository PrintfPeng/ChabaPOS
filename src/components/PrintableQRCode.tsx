import React from 'react';

interface PrintableQRCodeProps {
  qrCodeUrl: string;
  tableName: string;
  branchName: string;
}

export default function PrintableQRCode({ qrCodeUrl, tableName, branchName }: PrintableQRCodeProps) {
  return (
    <div style={{ width: '80mm', margin: '0 auto', fontFamily: 'sans-serif', color: '#000', background: '#fff', textAlign: 'center', padding: '16px' }}>
      <div style={{ borderBottom: '2px dashed #000', paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>{branchName}</div>
        <div style={{ fontSize: 28, fontWeight: 900, background: '#000', color: '#fff', display: 'inline-block', padding: '4px 16px', marginTop: 8 }}>
          TABLE: {tableName}
        </div>
      </div>

      <div style={{ padding: 8, border: '4px solid #000', display: 'inline-block', marginBottom: 16 }}>
        <img src={qrCodeUrl} alt="QR Code" style={{ width: 192, height: 192, display: 'block' }} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>SCAN TO ORDER</div>
        <div style={{ fontSize: 10, opacity: 0.6, fontStyle: 'italic' }}>Powered by ChabaPOS</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', paddingTop: 8 }}>
        <div style={{ fontSize: 8, textTransform: 'uppercase' }}>Thank you for visiting us</div>
      </div>
    </div>
  );
}
