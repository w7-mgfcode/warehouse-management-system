import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Eye,
  ArrowRightLeft,
  PackageMinus,
  Trash2,
  BookmarkPlus,
  History,
} from "lucide-react";
import type { StockLevel } from "@/queries/inventory";

interface StockRowActionsProps {
  stock: StockLevel;
  onViewDetails?: (stock: StockLevel) => void;
  onTransfer?: (stock: StockLevel) => void;
  onIssue?: (stock: StockLevel) => void;
  onScrap?: (stock: StockLevel) => void;
  onReserve?: (stock: StockLevel) => void;
  onViewHistory?: (stock: StockLevel) => void;
}

export function StockRowActions({
  stock,
  onViewDetails,
  onTransfer,
  onIssue,
  onScrap,
  onReserve,
  onViewHistory,
}: StockRowActionsProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 data-[state=open]:bg-muted"
          aria-label="Műveletek"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onViewDetails && (
          <DropdownMenuItem onClick={() => handleAction(() => onViewDetails(stock))}>
            <Eye className="mr-2 h-4 w-4" />
            <span>Részletek</span>
          </DropdownMenuItem>
        )}

        {onViewHistory && (
          <DropdownMenuItem onClick={() => handleAction(() => onViewHistory(stock))}>
            <History className="mr-2 h-4 w-4" />
            <span>Mozgástörténet</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onIssue && (
          <DropdownMenuItem onClick={() => handleAction(() => onIssue(stock))}>
            <PackageMinus className="mr-2 h-4 w-4" />
            <span>Kiadás</span>
          </DropdownMenuItem>
        )}

        {onTransfer && (
          <DropdownMenuItem onClick={() => handleAction(() => onTransfer(stock))}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            <span>Áthelyezés</span>
          </DropdownMenuItem>
        )}

        {onReserve && (
          <DropdownMenuItem onClick={() => handleAction(() => onReserve(stock))}>
            <BookmarkPlus className="mr-2 h-4 w-4" />
            <span>Foglalás</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onScrap && (
          <DropdownMenuItem
            onClick={() => handleAction(() => onScrap(stock))}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Selejtezés</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
