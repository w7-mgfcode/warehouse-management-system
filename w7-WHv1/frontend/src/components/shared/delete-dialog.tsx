import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HU } from "@/lib/i18n";

interface DeleteDialogProps {
  entityName?: string;
  onConfirm: () => void;
  isDeleting?: boolean;
  trigger?: React.ReactNode;
}

export function DeleteDialog({
  entityName,
  onConfirm,
  isDeleting = false,
  trigger,
}: DeleteDialogProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-error hover:text-error">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Megerősítés szükséges</DialogTitle>
          <DialogDescription>
            {entityName
              ? `Biztosan törli ezt: ${entityName}?`
              : "Biztosan törli ezt az elemet?"}{" "}
            Ez a művelet nem vonható vissza.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            {HU.actions.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Törlés..." : HU.actions.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
