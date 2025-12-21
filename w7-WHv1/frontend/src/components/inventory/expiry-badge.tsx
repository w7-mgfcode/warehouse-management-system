import { Badge } from "@/components/ui/badge";
import { getDaysUntilExpiry, getExpiryUrgency, formatExpiryWarning, getExpiryBadgeClass } from "@/lib/date";
import { HU } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ExpiryBadgeProps {
  useByDate: Date | string;
  showDays?: boolean;
  className?: string;
}

export function ExpiryBadge({
  useByDate,
  showDays = true,
  className,
}: ExpiryBadgeProps) {
  const days = getDaysUntilExpiry(useByDate);
  const urgency = getExpiryUrgency(useByDate);
  const badgeClass = getExpiryBadgeClass(urgency);

  return (
    <Badge className={cn(badgeClass, className)}>
      {showDays ? formatExpiryWarning(days) : HU.expiry[urgency]}
    </Badge>
  );
}
