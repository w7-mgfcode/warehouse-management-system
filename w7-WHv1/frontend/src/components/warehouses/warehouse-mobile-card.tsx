import { useNavigate } from "react-router-dom";
import { Edit, Check, X, MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import type { Warehouse } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";

interface WarehouseMobileCardProps {
  warehouse: Warehouse;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function WarehouseMobileCard({ warehouse, onDelete, isDeleting }: WarehouseMobileCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:bg-secondary/30 transition-colors"
      onClick={() => navigate(`/warehouses/${warehouse.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with name and actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight break-words">
              {warehouse.name}
            </h3>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/warehouses/${warehouse.id}`);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DeleteDialog
              entityName={warehouse.name}
              onConfirm={() => onDelete(warehouse.id)}
              isDeleting={isDeleting}
            />
          </div>
        </div>

        {/* Location */}
        {warehouse.location && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="break-words">{warehouse.location}</span>
          </div>
        )}

        {/* Status and Created Date */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div>
            {warehouse.is_active ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <Check className="h-3 w-3 mr-1" />
                {HU.status.active}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-secondary text-muted-foreground">
                <X className="h-3 w-3 mr-1" />
                {HU.status.inactive}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDateTime(warehouse.created_at)}</span>
          </div>
        </div>

        {/* Description if available */}
        {warehouse.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
            {warehouse.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
