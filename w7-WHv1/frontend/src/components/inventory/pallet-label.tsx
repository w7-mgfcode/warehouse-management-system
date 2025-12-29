import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/date";
import { Printer } from "lucide-react";

export interface PalletLabelData {
  bin_content_id: string;
  bin_code: string;
  product_name: string;
  sku?: string;
  batch_number: string;
  quantity: number;
  unit: string;
  use_by_date: string;
  best_before_date?: string;
  supplier_name?: string;
  received_date: string;
  weight_kg?: number;
  pallet_count?: number;
  cmr_number?: string;
}

interface PalletLabelProps {
  data: PalletLabelData;
  trigger?: React.ReactNode;
}

/**
 * Pallet label component with QR code and print functionality.
 *
 * Features:
 * - QR code with bin_content_id for quick scanning
 * - Product and batch information
 * - Expiry dates with warnings
 * - Print-optimized layout (fits 10x15cm label)
 */
export function PalletLabel({ data, trigger }: PalletLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(data.use_by_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Címke nyomtatása
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Raklap címke</DialogTitle>
          <DialogDescription>
            Nyomtatható címke QR kóddal a gyors azonosításhoz
          </DialogDescription>
        </DialogHeader>

        {/* Print-only styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #pallet-label, #pallet-label * {
              visibility: visible;
            }
            #pallet-label {
              position: absolute;
              left: 0;
              top: 0;
              width: 10cm;
              height: 15cm;
              padding: 0.5cm;
              page-break-after: always;
            }
            /* Hide dialog chrome when printing */
            [role="dialog"] {
              position: static !important;
              max-width: none !important;
            }
          }
        `}</style>

        <div
          id="pallet-label"
          ref={labelRef}
          className="border-2 border-dashed border-gray-300 p-6 bg-white text-black rounded-lg"
          style={{
            width: "10cm",
            minHeight: "15cm",
            margin: "0 auto",
          }}
        >
          {/* Header with QR code */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-black">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{data.product_name}</h1>
              {data.sku && <p className="text-sm text-gray-600">SKU: {data.sku}</p>}
            </div>
            <div className="ml-4">
              <QRCodeSVG
                value={data.bin_content_id}
                size={80}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Bin location */}
          <div className="mb-4">
            <div className="bg-black text-white px-3 py-2 text-center rounded">
              <p className="text-xs uppercase tracking-wide">Tárolóhely</p>
              <p className="text-3xl font-bold">{data.bin_code}</p>
            </div>
          </div>

          {/* Batch and quantity */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-gray-300 p-2 rounded">
              <p className="text-xs text-gray-600 uppercase">Sarzsszám</p>
              <p className="font-bold text-sm break-all">{data.batch_number}</p>
            </div>
            <div className="border border-gray-300 p-2 rounded">
              <p className="text-xs text-gray-600 uppercase">Mennyiség</p>
              <p className="font-bold text-sm">
                {data.quantity} {data.unit}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="mb-4 space-y-2">
            <div
              className={`border-2 p-2 rounded ${
                daysUntilExpiry <= 7
                  ? "border-red-500 bg-red-50"
                  : daysUntilExpiry <= 14
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-300"
              }`}
            >
              <p className="text-xs text-gray-600 uppercase">Lejárati dátum</p>
              <p className="font-bold text-lg">
                {formatDate(new Date(data.use_by_date))}
              </p>
              <p className="text-xs text-gray-600">
                ({daysUntilExpiry} nap múlva jár le)
              </p>
            </div>

            {data.best_before_date && (
              <div className="border border-gray-300 p-2 rounded">
                <p className="text-xs text-gray-600 uppercase">Minőség megőrzés</p>
                <p className="font-semibold text-sm">
                  {formatDate(new Date(data.best_before_date))}
                </p>
              </div>
            )}
          </div>

          {/* Additional info */}
          <div className="space-y-1 text-xs border-t border-gray-300 pt-3">
            {data.supplier_name && (
              <p>
                <span className="text-gray-600">Beszállító:</span>{" "}
                <span className="font-semibold">{data.supplier_name}</span>
              </p>
            )}
            <p>
              <span className="text-gray-600">Beérkezés:</span>{" "}
              {formatDate(new Date(data.received_date))}
            </p>
            {data.weight_kg && (
              <p>
                <span className="text-gray-600">Súly:</span> {data.weight_kg} kg
              </p>
            )}
            {data.pallet_count && (
              <p>
                <span className="text-gray-600">Raklapok:</span> {data.pallet_count} db
              </p>
            )}
            {data.cmr_number && (
              <p>
                <span className="text-gray-600">CMR:</span> {data.cmr_number}
              </p>
            )}
          </div>

          {/* Footer with ID */}
          <div className="mt-4 pt-3 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-500 font-mono break-all">
              ID: {data.bin_content_id}
            </p>
          </div>
        </div>

        {/* Print button */}
        <div className="flex justify-end gap-2 print:hidden">
          <Button type="button" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Nyomtatás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
