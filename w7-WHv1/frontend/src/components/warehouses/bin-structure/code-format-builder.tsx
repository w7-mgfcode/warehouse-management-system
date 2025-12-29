import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { validateCodeFormat } from "@/lib/bin-template-utils";
import type { BinStructureField } from "@/types";

interface CodeFormatBuilderProps {
  format: string;
  fields: BinStructureField[];
  onChange: (format: string) => void;
}

/**
 * Code format builder with real-time validation.
 *
 * Features:
 * - Text input for format string
 * - Clickable field tokens for quick insertion
 * - Real-time validation feedback
 * - Error messages in Hungarian
 */
export function CodeFormatBuilder({
  format,
  fields,
  onChange,
}: CodeFormatBuilderProps) {
  const validation = validateCodeFormat(format, fields);

  const handleInsertToken = (fieldName: string) => {
    onChange(format + `{${fieldName}}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={format}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{aisle}-{rack}-{level}-{position}"
          className="font-mono"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">Mezők beszúrása:</span>
        {fields.map((field) => (
          <Badge
            key={field.name}
            variant="outline"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => handleInsertToken(field.name)}
          >
            {`{${field.name}}`}
          </Badge>
        ))}
      </div>

      {!validation.valid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
