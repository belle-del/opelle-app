"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Camera, AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!mounted || !scannerRef.current) return;

        const scannerId = "barcode-scanner-region";
        scannerRef.current.id = scannerId;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          () => {
            // Scan failure - this fires constantly while scanning, ignore it
          }
        );

        if (mounted) {
          setScanning(true);
        }
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Unable to access camera";
          if (message.includes("NotAllowedError") || message.includes("Permission")) {
            setError("Camera permission denied. Please allow camera access to scan barcodes.");
          } else if (message.includes("NotFoundError")) {
            setError("No camera found on this device.");
          } else {
            setError(message);
          }
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={scannerRef}
              className="rounded-xl overflow-hidden bg-black/20"
            />
            {!scanning && (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Point your camera at the barcode on the product tube.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
