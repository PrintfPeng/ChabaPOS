import React from 'react';

interface PrintableQRCodeProps {
  qrCodeUrl: string;
  tableName: string;
  branchName: string;
}

export default function PrintableQRCode({ qrCodeUrl, tableName, branchName }: PrintableQRCodeProps) {
  return (
    <div className="print-only flex flex-col items-center justify-center p-4 bg-white text-black font-sans" style={{ width: '80mm', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 0; size: auto; }
        }
      `}} />
      
      <div className="text-center space-y-2 border-b-2 border-dashed border-black pb-4 mb-4 w-full">
        <h1 className="text-xl font-bold uppercase tracking-widest">{branchName}</h1>
        <div className="text-3xl font-black bg-black text-white px-4 py-1 inline-block">
          TABLE: {tableName}
        </div>
      </div>

      <div className="p-2 bg-white border-4 border-black mb-4">
        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-bold">SCAN TO ORDER</p>
        <p className="text-[10px] opacity-70 italic">Powered by ChabaPOS</p>
      </div>
      
      <div className="mt-6 border-t border-dashed border-black pt-2 w-full text-center">
        <p className="text-[8px] uppercase">Thank you for visiting us</p>
      </div>
    </div>
  );
}
