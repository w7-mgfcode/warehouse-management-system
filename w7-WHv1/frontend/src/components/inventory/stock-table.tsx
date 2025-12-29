import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryBadge } from "./expiry-badge";
import { BinStatusBadge } from "@/components/bins/bin-status-badge";
import { StockRowActions } from "./stock-row-actions";
import { StockDetailsDialog } from "./stock-details-dialog";
import { FEFOWarningIndicator } from "./fefo-warning-indicator";
import type { StockLevel } from "@/queries/inventory";
import type { BinStatus } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDate, getExpiryUrgency } from "@/lib/date";
import { formatNumber, formatWeight } from "@/lib/number";
import { ArrowUpDown, ArrowUp, ArrowDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StockTableProps {
  data?: StockLevel[];
  isLoading?: boolean;
}

type SortField = keyof StockLevel | "none";
type SortDirection = "asc" | "desc";

interface ColumnVisibility {
  product: boolean;
  warehouse: boolean;
  bin: boolean;
  batch: boolean;
  quantity: boolean;
  weight: boolean;
  expiry: boolean;
  status: boolean;
}

const DEFAULT_COLUMNS: ColumnVisibility = {
  product: true,
  warehouse: true,
  bin: true,
  batch: true,
  quantity: true,
  weight: true,
  expiry: true,
  status: true,
};

export function StockTable({ data, isLoading = false }: StockTableProps) {
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(DEFAULT_COLUMNS);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!data || sortField === "none") return data || [];

    const sorted = [...data].sort((a, b) => {
      let aValue: any = a[sortField as keyof StockLevel];
      let bValue: any = b[sortField as keyof StockLevel];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different types
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction or reset
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField("none");
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </Button>
    </TableHead>
  );

  // Get row background color based on expiry urgency
  const getRowClassName = (stock: StockLevel) => {
    const urgency = getExpiryUrgency(stock.use_by_date);

    const urgencyClasses = {
      expired: "bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30",
      critical: "bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30",
      high: "bg-orange-500/10 hover:bg-orange-500/20 dark:bg-orange-500/20 dark:hover:bg-orange-500/30",
      medium: "bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30",
      low: "hover:bg-muted/50",
    };

    return urgencyClasses[urgency];
  };

  // Action handlers
  const handleViewDetails = (stock: StockLevel) => {
    setSelectedStock(stock);
    setDetailsDialogOpen(true);
  };

  const handleTransfer = (stock: StockLevel) => {
    toast.info(`Áthelyezés funkció hamarosan elérhető: ${stock.product_name}`);
    // TODO: Open transfer dialog
  };

  const handleIssue = (stock: StockLevel) => {
    toast.info(`Kiadás funkció hamarosan elérhető: ${stock.product_name}`);
    // TODO: Open issue dialog
  };

  const handleScrap = (stock: StockLevel) => {
    toast.info(`Selejtezés funkció hamarosan elérhető: ${stock.product_name}`);
    // TODO: Open scrap confirmation dialog
  };

  const handleReserve = (stock: StockLevel) => {
    toast.info(`Foglalás funkció hamarosan elérhető: ${stock.product_name}`);
    // TODO: Open reserve dialog
  };

  const handleViewHistory = (stock: StockLevel) => {
    toast.info(`Mozgástörténet funkció hamarosan elérhető: ${stock.product_name}`);
    // TODO: Open movement history dialog
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

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.stock}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column visibility controls */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Oszlopok
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuCheckboxItem
              checked={columnVisibility.product}
              onCheckedChange={() => toggleColumn("product")}
            >
              {HU.table.product}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.warehouse}
              onCheckedChange={() => toggleColumn("warehouse")}
            >
              {HU.table.warehouse}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.bin}
              onCheckedChange={() => toggleColumn("bin")}
            >
              {HU.table.bin}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.batch}
              onCheckedChange={() => toggleColumn("batch")}
            >
              {HU.table.batch}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.quantity}
              onCheckedChange={() => toggleColumn("quantity")}
            >
              {HU.table.quantity}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.weight}
              onCheckedChange={() => toggleColumn("weight")}
            >
              {HU.table.weight}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.expiry}
              onCheckedChange={() => toggleColumn("expiry")}
            >
              {HU.table.useByDate}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={() => toggleColumn("status")}
            >
              {HU.table.status}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.product && (
                <SortableHeader field="product_name">{HU.table.product}</SortableHeader>
              )}
              {columnVisibility.warehouse && (
                <SortableHeader field="warehouse_name">{HU.table.warehouse}</SortableHeader>
              )}
              {columnVisibility.bin && (
                <SortableHeader field="bin_code">{HU.table.bin}</SortableHeader>
              )}
              {columnVisibility.batch && (
                <SortableHeader field="batch_number">{HU.table.batch}</SortableHeader>
              )}
              {columnVisibility.quantity && (
                <SortableHeader field="quantity">{HU.table.quantity}</SortableHeader>
              )}
              {columnVisibility.weight && (
                <SortableHeader field="weight_kg">{HU.table.weight}</SortableHeader>
              )}
              {columnVisibility.expiry && (
                <SortableHeader field="days_until_expiry">{HU.table.useByDate}</SortableHeader>
              )}
              {columnVisibility.status && (
                <SortableHeader field="status">{HU.table.status}</SortableHeader>
              )}
              <TableHead className="w-[50px]">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((stock) => (
              <TableRow key={stock.bin_content_id} className={cn(getRowClassName(stock))}>
                {columnVisibility.product && (
                  <TableCell className="font-medium">
                    {stock.product_name}
                    {stock.sku && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({stock.sku})
                      </span>
                    )}
                  </TableCell>
                )}
                {columnVisibility.warehouse && (
                  <TableCell>{stock.warehouse_name}</TableCell>
                )}
                {columnVisibility.bin && (
                  <TableCell className="font-mono text-sm">
                    {stock.bin_code}
                    <FEFOWarningIndicator
                      isCompliant={stock.is_fefo_compliant}
                      oldestBinCode={stock.oldest_bin_code}
                      oldestUseByDate={stock.oldest_use_by_date}
                      oldestDaysUntilExpiry={stock.oldest_days_until_expiry}
                    />
                  </TableCell>
                )}
                {columnVisibility.batch && (
                  <TableCell className="text-sm">{stock.batch_number}</TableCell>
                )}
                {columnVisibility.quantity && (
                  <TableCell>
                    {formatNumber(stock.quantity, 0)} {stock.unit}
                  </TableCell>
                )}
                {columnVisibility.weight && (
                  <TableCell className="text-muted-foreground">
                    {formatWeight(stock.weight_kg)}
                  </TableCell>
                )}
                {columnVisibility.expiry && (
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{formatDate(stock.use_by_date)}</span>
                      <ExpiryBadge useByDate={stock.use_by_date} showDays />
                    </div>
                  </TableCell>
                )}
                {columnVisibility.status && (
                  <TableCell>
                    <BinStatusBadge status={stock.status as BinStatus} />
                  </TableCell>
                )}
                <TableCell>
                  <StockRowActions
                    stock={stock}
                    onViewDetails={handleViewDetails}
                    onTransfer={handleTransfer}
                    onIssue={handleIssue}
                    onScrap={handleScrap}
                    onReserve={handleReserve}
                    onViewHistory={handleViewHistory}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stock Details Dialog */}
      <StockDetailsDialog
        stock={selectedStock}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
}
