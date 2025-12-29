import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { BinStructureField } from "@/types";
import { TemplateFieldItem } from "./template-field-item";

interface TemplateFieldListProps {
  fields: BinStructureField[];
  onChange: (fields: BinStructureField[]) => void;
  onEditField: (index: number) => void;
  onDeleteField: (index: number) => void;
}

/**
 * Drag-and-drop field list for template editor.
 *
 * Features:
 * - Vertical drag-and-drop reordering
 * - Keyboard navigation support
 * - Automatic order property updates
 * - Restricted to vertical axis
 */
export function TemplateFieldList({
  fields,
  onChange,
  onEditField,
  onDeleteField,
}: TemplateFieldListProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Disable pointer events on page elements during drag (prevents back button click)
  useEffect(() => {
    if (isDragging) {
      document.body.style.pointerEvents = "none";
      // Re-enable pointer events on the drag container
      const dragContainer = document.querySelector('[data-dnd-dragging="true"]');
      if (dragContainer) {
        (dragContainer as HTMLElement).style.pointerEvents = "auto";
      }
    } else {
      document.body.style.pointerEvents = "";
    }
    return () => {
      document.body.style.pointerEvents = "";
    };
  }, [isDragging]);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.name === active.id);
      const newIndex = fields.findIndex((f) => f.name === over.id);

      // Reorder fields using arrayMove
      const reorderedFields = arrayMove(fields, oldIndex, newIndex);

      // Update order property for each field (1-indexed)
      const updatedFields = reorderedFields.map((field, idx) => ({
        ...field,
        order: idx + 1,
      }));

      onChange(updatedFields);
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={fields.map((f) => f.name)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {fields.map((field, index) => (
            <TemplateFieldItem
              key={field.name}
              field={field}
              index={index}
              onEdit={() => onEditField(index)}
              onDelete={() => onDeleteField(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
