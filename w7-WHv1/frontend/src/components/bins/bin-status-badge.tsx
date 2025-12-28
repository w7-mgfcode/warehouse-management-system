import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HU } from "@/lib/i18n";
import type { BinStatus } from "@/types";

interface BinStatusBadgeProps {
  status: BinStatus;
  className?: string;
}

const statusStyles: Record<BinStatus, string> = {
  empty: "bg-bin-empty text-white border-bin-empty",
  occupied: "bg-bin-occupied text-white border-bin-occupied",
  reserved: "bg-bin-reserved text-white border-bin-reserved",
  inactive: "bg-bin-inactive text-white border-bin-inactive",
};

export function BinStatusBadge({ status, className }: BinStatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)}>
      {HU.status[status]}
    </Badge>
  );
}
