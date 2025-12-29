import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/api-client";
import { Check, ChevronsUpDown, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { QRScannerModal } from "./qr-scanner-modal";

interface Bin {
  id: string;
  code: string;
  status: string;
  warehouse_id: string;
}

interface BinSearchProps {
  value?: string;
  onValueChange: (binId: string) => void;
  warehouseId?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  statusFilter?: string;
}

/**
 * Bin search with autocomplete and QR scanner integration.
 *
 * Features:
 * - Live search with filtering
 * - QR code scanning for quick selection
 * - Warehouse filtering
 * - Status badge display
 */
export function BinSearch({
  value,
  onValueChange,
  warehouseId,
  label = "Tárolóhely keresése",
  required = false,
  placeholder = "Írja be a tárolóhely kódját...",
  statusFilter,
}: BinSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Fetch bins
  const { data: binsData } = useQuery({
    queryKey: ["bins", warehouseId, statusFilter, searchValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.append("warehouse_id", warehouseId);
      if (statusFilter) params.append("status", statusFilter);
      if (searchValue) params.append("search", searchValue);
      params.append("page_size", "50");

      const response = await apiClient.get(`/bins?${params.toString()}`);
      return response.data;
    },
    enabled: open || !!searchValue,
  });

  const bins: Bin[] = binsData?.items || [];
  const selectedBin = bins.find((bin) => bin.id === value);

  const handleQRScan = async (scannedData: string) => {
    // Try to find bin by ID or code
    try {
      // First try as bin_content_id (from QR code on label)
      const contentResponse = await apiClient.get(`/inventory/bin-contents/${scannedData}`);
      if (contentResponse.data?.bin_id) {
        onValueChange(contentResponse.data.bin_id);
        setShowScanner(false);
        return;
      }
    } catch {
      // Not a bin_content_id, try as bin_id
      try {
        const binResponse = await apiClient.get(`/bins/${scannedData}`);
        if (binResponse.data?.id) {
          onValueChange(binResponse.data.id);
          setShowScanner(false);
          return;
        }
      } catch {
        // Try searching by code
        const matchedBin = bins.find((b) => b.code === scannedData);
        if (matchedBin) {
          onValueChange(matchedBin.id);
          setShowScanner(false);
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-error"> *</span>}
      </Label>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
            >
              {selectedBin ? selectedBin.code : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Keresés tárolóhely kódra..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>Nincs találat.</CommandEmpty>
                <CommandGroup>
                  {bins.map((bin) => (
                    <CommandItem
                      key={bin.id}
                      value={bin.id}
                      onSelect={() => {
                        onValueChange(bin.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === bin.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{bin.code}</span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            bin.status === "empty"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : bin.status === "occupied"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                          )}
                        >
                          {bin.status === "empty"
                            ? "Üres"
                            : bin.status === "occupied"
                            ? "Foglalt"
                            : "Lefoglalt"}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowScanner(true)}
          title="QR kód beolvasása"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleQRScan}
      />
    </div>
  );
}
