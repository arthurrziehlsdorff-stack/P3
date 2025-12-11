import { Progress } from "@/components/ui/progress";
import { Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryWarning } from "lucide-react";

interface BatteryIndicatorProps {
  level: number;
  showLabel?: boolean;
}

export function BatteryIndicator({ level, showLabel = true }: BatteryIndicatorProps) {
  const getColor = () => {
    if (level <= 20) return "bg-red-500";
    if (level <= 50) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getIcon = () => {
    if (level <= 20) return BatteryWarning;
    if (level <= 50) return BatteryMedium;
    return BatteryFull;
  };

  const Icon = getIcon();

  return (
    <div className="flex items-center gap-2" data-testid="battery-indicator">
      <Icon
        className={`h-4 w-4 ${
          level <= 20
            ? "text-red-500"
            : level <= 50
            ? "text-amber-500"
            : "text-emerald-500"
        }`}
      />
      <div className="flex items-center gap-2 min-w-[100px]">
        <Progress
          value={level}
          className="h-2 w-16"
          indicatorClassName={getColor()}
        />
        {showLabel && (
          <span className="font-mono text-xs text-muted-foreground w-8">
            {level}%
          </span>
        )}
      </div>
    </div>
  );
}
