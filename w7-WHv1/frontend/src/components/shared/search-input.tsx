import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HU } from "@/lib/i18n";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  debounce = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const onChangeRef = useRef(onChange);

  // Keep ref updated with latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce effect - use ref to avoid onChange dependency
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeRef.current(localValue);
      }
    }, debounce);

    return () => clearTimeout(timer);
  }, [localValue, value, debounce]);

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder || HU.actions.search}
        className="pl-10 pr-10"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
