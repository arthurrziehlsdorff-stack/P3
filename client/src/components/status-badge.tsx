import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Wrench } from "lucide-react";

type ScooterStatus = "livre" | "ocupado" | "manutencao";

interface StatusBadgeProps {
  status: ScooterStatus;
}

const statusConfig: Record<ScooterStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  livre: {
    label: "Livre",
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  ocupado: {
    label: "Ocupado",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  manutencao: {
    label: "Manutenção",
    icon: Wrench,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={`${config.className} gap-1.5 font-medium no-default-hover-elevate no-default-active-elevate`}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
