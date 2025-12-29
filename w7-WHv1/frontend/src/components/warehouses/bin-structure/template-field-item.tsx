import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BinStructureField } from "@/types";

interface TemplateFieldItemProps {
  field: BinStructureField;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Draggable field item for template editor.
 *
 * Features:
 * - Drag handle with @dnd-kit/sortable
 * - Visual order badge
 * - Field name and label display
 * - Required indicator
 * - Edit and delete actions
 */
export function TemplateFieldItem({
  field,
  index,
  onEdit,
  onDelete,
}: TemplateFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 select-none ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Field Order Badge */}
        <Badge variant="secondary" className="font-mono">
          {index + 1}
        </Badge>

        {/* Field Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{field.label}</span>
            {field.required && (
              <Badge variant="destructive" className="text-xs">
                Kötelező
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {`{${field.name}}`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
