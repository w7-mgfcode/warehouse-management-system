import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface TemplatePresetCardProps {
  name: string;
  description: string;
  icon: string;
  sampleCode: string;
  isActive: boolean;
  onSelect: () => void;
}

/**
 * Preset template card for quick template selection.
 *
 * Features:
 * - Icon and name display
 * - Description and sample code
 * - Active state indicator
 * - Click-to-select action
 */
export function TemplatePresetCard({
  name,
  description,
  icon,
  sampleCode,
  isActive,
  onSelect,
}: TemplatePresetCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isActive ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <CardTitle className="text-sm leading-tight break-words">{name}</CardTitle>
          </div>
          {isActive && (
            <Badge variant="default" className="gap-1 flex-shrink-0">
              <Check className="h-3 w-3" />
              Aktív
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-snug">{description}</p>
        <div>
          <span className="text-xs text-muted-foreground">Példa kód:</span>
          <div className="mt-1 font-mono text-sm bg-muted p-2 rounded break-all">
            {sampleCode}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isActive ? "secondary" : "default"}
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isActive ? "Kiválasztva" : "Sablon használata"}
        </Button>
      </CardContent>
    </Card>
  );
}
