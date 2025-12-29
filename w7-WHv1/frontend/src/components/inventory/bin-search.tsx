import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
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

interface BinContent {
  id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  quantity: number;
  unit: string;
}

interface Bin {
  id: string;
  code: string;
  status: string;
  warehouse_id: string;
  contents?: BinContent[];
}

interface BinSearchProps {
  value?: string;
  onValueChange: (binContentId: string) => void;
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

  // Fetch bins with content for issue operations
  const { data: binsData } = useQuery({
    queryKey: ["bins", warehouseId, statusFilter, searchValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.append("warehouse_id", warehouseId);
      if (statusFilter) params.append("status", statusFilter);
      if (searchValue) params.append("search", searchValue);
      params.append("page_size", "50");
      params.append("include_content", "true"); // Include bin contents for issue

      const response = await apiClient.get(`/bins?${params.toString()}`);
      return response.data;
    },
    enabled: open || !!searchValue,
  });

  const bins: Bin[] = binsData?.items || [];

  // Find selected bin by bin_content_id
  const selectedBin = bins.find((bin) =>
    bin.contents?.some(content => content.id === value)
  );
  const selectedContent = selectedBin?.contents?.find(content => content.id === value);

  const handleQRScan = async (scannedData: string) => {
    // Try to find bin content by QR code
    try {
      // First try as bin_content_id (from QR code on pallet label)
      const contentResponse = await apiClient.get(`/inventory/bin-contents/${scannedData}`);
      if (contentResponse.data?.id) {
        onValueChange(contentResponse.data.id); // Return bin_content_id
        setShowScanner(false);
        return;
      }
    } catch {
      // Not a bin_content_id, try as bin_id
      try {
        const binResponse = await apiClient.get(`/bins/${scannedData}?include_content=true`);
        if (binResponse.data?.contents?.[0]?.id) {
          onValueChange(binResponse.data.contents[0].id); // Return first content's id
          setShowScanner(false);
          return;
        }
      } catch {
        // Try searching by bin code in loaded bins
        const matchedBin = bins.find((b) => b.code === scannedData);
        if (matchedBin?.contents?.[0]?.id) {
          onValueChange(matchedBin.contents[0].id);
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
              {selectedBin ? (
                <span>
                  {selectedBin.code}
                  {selectedContent && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({selectedContent.product_name} - {selectedContent.batch_number})
                    </span>
                  )}
                </span>
              ) : (
                placeholder
              )}
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
                  {bins
                    .filter((bin) => bin.status === "occupied" && bin.contents && bin.contents.length > 0)
                    .map((bin) => {
                      const content = bin.contents![0]; // Primary content
                      return (
                        <CommandItem
                          key={content.id}
                          value={content.id}
                          onSelect={() => {
                            onValueChange(content.id); // Return bin_content_id
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === content.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{bin.code}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                Foglalt
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {content.product_name} • Sarzs: {content.batch_number} • {content.quantity} {content.unit}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })
                  }
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
