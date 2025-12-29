import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TemplateSettingsProps {
  separator: string;
  autoUppercase: boolean;
  zeroPadding: boolean;
  onChange: (settings: {
    separator?: string;
    auto_uppercase?: boolean;
    zero_padding?: boolean;
  }) => void;
}

/**
 * Template formatting settings component.
 *
 * Features:
 * - Separator character input (max 5 chars)
 * - Auto uppercase toggle
 * - Zero padding toggle
 * - Responsive grid layout
 */
export function TemplateSettings({
  separator,
  autoUppercase,
  zeroPadding,
  onChange,
}: TemplateSettingsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="separator">Elválasztó karakter</Label>
        <Input
          id="separator"
          value={separator}
          onChange={(e) => onChange({ separator: e.target.value })}
          maxLength={5}
          placeholder="-"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">Max 5 karakter</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="auto-uppercase">Automatikus nagybetűs</Label>
        <div className="flex items-center space-x-2 h-10">
          <Switch
            id="auto-uppercase"
            checked={autoUppercase}
            onCheckedChange={(checked) =>
              onChange({ auto_uppercase: checked })
            }
          />
          <Label htmlFor="auto-uppercase" className="font-normal">
            {autoUppercase ? "Bekapcsolva" : "Kikapcsolva"}
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">A → A (betűk nagybetűvé)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zero-padding">Nulla kitöltés</Label>
        <div className="flex items-center space-x-2 h-10">
          <Switch
            id="zero-padding"
            checked={zeroPadding}
            onCheckedChange={(checked) =>
              onChange({ zero_padding: checked })
            }
          />
          <Label htmlFor="zero-padding" className="font-normal">
            {zeroPadding ? "Bekapcsolva" : "Kikapcsolva"}
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">1 → 01 (számok kitöltése)</p>
      </div>
    </div>
  );
}
