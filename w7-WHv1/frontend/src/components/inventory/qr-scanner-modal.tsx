import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CheckCircle2, XCircle } from "lucide-react";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (data: string) => void | Promise<void>;
}

/**
 * QR code scanner modal using device camera.
 *
 * Features:
 * - Camera access with permission handling
 * - Real-time QR code detection
 * - Mobile-friendly
 * - Automatic cleanup on close
 */
export function QRScannerModal({ open, onOpenChange, onScan }: QRScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    if (open && !isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    try {
      setError(null);
      setSuccess(false);

      // Create scanner instance
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(qrCodeRegionId);
      }

      const scanner = scannerRef.current;

      // Start scanning
      await scanner.start(
        { facingMode: "environment" }, // Use back camera on mobile
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
        },
        async (decodedText) => {
          // Success callback
          setSuccess(true);
          setIsScanning(false);

          // Stop scanner
          await stopScanner();

          // Call onScan callback
          await onScan(decodedText);

          // Close modal after brief delay
          setTimeout(() => {
            onOpenChange(false);
            setSuccess(false);
          }, 500);
        },
        (errorMessage) => {
          // Error callback (mostly "No QR code found" - ignore these)
          // Only show persistent errors
          if (errorMessage.includes("permission") || errorMessage.includes("NotAllowed")) {
            setError("Kamera hozzáférés megtagadva. Engedélyezze a kamerát a böngészőben.");
          }
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("QR Scanner error:", err);

      if (err.name === "NotAllowedError" || err.message.includes("permission")) {
        setError(
          "Kamera hozzáférés megtagadva. Kérjük, engedélyezze a kamerát a böngésző beállításaiban."
        );
      } else if (err.name === "NotFoundError") {
        setError("Nem található kamera. Ellenőrizze, hogy eszköze rendelkezik-e kamerával.");
      } else if (err.name === "NotReadableError") {
        setError(
          "A kamera foglalt vagy nem elérhető. Zárjon be minden más alkalmazást, amely használja a kamerát."
        );
      } else {
        setError(`Hiba a szkennelés indításakor: ${err.message}`);
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanner();
    onOpenChange(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR kód beolvasása
          </DialogTitle>
          <DialogDescription>
            Irányítsa a kamerát a QR kódra az automatikus beolvasáshoz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container */}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div id={qrCodeRegionId} className="w-full" />

            {/* Overlay for success */}
            {success && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-900 rounded-full p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
              </div>
            )}
          </div>

          {/* Status message */}
          {isScanning && !error && !success && (
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Kamera aktív. Tartsa a QR kódot a négyzetben.
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                QR kód sikeresen beolvasva!
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-semibold">Tippek a sikeres beolvasáshoz:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Tartsa a kamerát stabilan</li>
              <li>Biztosítson megfelelő világítást</li>
              <li>A QR kód legyen teljesen látható</li>
              <li>Próbálja meg közelebb vagy távolabb vinni</li>
            </ul>
          </div>

          {/* Close button */}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Mégse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
