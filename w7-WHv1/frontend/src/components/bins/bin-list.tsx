import { useNavigate } from "react-router-dom";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { BinStatusBadge } from "./bin-status-badge";
import type { Bin } from "@/types";
import { HU } from "@/lib/i18n";
import { formatNumber } from "@/lib/number";

interface BinListProps {
  bins: Bin[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  isDeleting?: boolean;
}

export function BinList({
  bins,
  isLoading,
  onDelete,
  onBulkDelete,
  isDeleting,
}: BinListProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === bins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bins.map((bin) => bin.id)));
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (bins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.bins}
      </div>
    );
  }

  const allSelected = bins.length > 0 && selectedIds.size === bins.length;

  return (
    <>
      {/* Bulk delete button */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} tárolóhely kiválasztva
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Kiválasztottak törlése
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Összes kiválasztása"
                />
              </TableHead>
              <TableHead>{HU.table.code}</TableHead>
              <TableHead>Raktár</TableHead>
              <TableHead>Sor</TableHead>
              <TableHead>Állvány</TableHead>
              <TableHead>Szint</TableHead>
              <TableHead>Pozíció</TableHead>
              <TableHead>Kapacitás</TableHead>
              <TableHead>{HU.table.status}</TableHead>
              <TableHead className="text-right">{HU.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bins.map((bin) => (
              <TableRow
                key={bin.id}
                className="cursor-pointer hover:bg-secondary/50"
                onClick={() => navigate(`/bins/${bin.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(bin.id)}
                    onCheckedChange={() => toggleSelect(bin.id)}
                    aria-label={`Kiválasztás: ${bin.code}`}
                  />
                </TableCell>
                <TableCell className="font-mono font-medium">
                  {bin.code}
                </TableCell>
                <TableCell
                  className="text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/warehouses/${bin.warehouse_id}`);
                  }}
                >
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary hover:underline"
                  >
                    {bin.warehouse_name || "Ismeretlen"}
                  </Button>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {(bin as any).aisle}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {(bin as any).rack}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {(bin as any).level}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {(bin as any).position}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {(bin as any).capacity_kg
                    ? `${formatNumber((bin as any).capacity_kg, 0)} kg`
                    : "—"}
                </TableCell>
                <TableCell>
                  <BinStatusBadge status={bin.status} />
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bins/${bin.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DeleteDialog
                      entityName={bin.code}
                      onConfirm={() => onDelete(bin.id)}
                      isDeleting={isDeleting}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bulk delete confirmation dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Biztosan törli a kiválasztott tárolóhelyeket?
            </DialogTitle>
            <DialogDescription>
              {selectedIds.size} tárolóhely véglegesen törölve lesz. Ez a
              művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isDeleting}
            >
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Törlés..." : "Törlés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
