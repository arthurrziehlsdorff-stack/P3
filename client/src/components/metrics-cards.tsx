import { Card, CardContent } from "@/components/ui/card";
import { Bike, Battery, Navigation, Wrench } from "lucide-react";
import type { Scooter, Viagem } from "@shared/schema";

interface MetricsCardsProps {
  scooters: Scooter[];
  activeTrips: Viagem[];
  isLoading?: boolean;
}

export function MetricsCards({ scooters, activeTrips, isLoading }: MetricsCardsProps) {
  const availableCount = scooters.filter((s) => s.status === "livre").length;
  const lowBatteryCount = scooters.filter((s) => s.bateria <= 20).length;
  const maintenanceCount = scooters.filter((s) => s.status === "manutencao").length;
  const activeTripsCount = activeTrips.filter((t) => !t.dataFim).length;

  const metrics = [
    {
      label: "Scooters Disponíveis",
      value: availableCount,
      icon: Bike,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Bateria Baixa (<20%)",
      value: lowBatteryCount,
      icon: Battery,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
    },
    {
      label: "Viagens Ativas",
      value: activeTripsCount,
      icon: Navigation,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Em Manutenção",
      value: maintenanceCount,
      icon: Wrench,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-muted" />
                <div className="space-y-2">
                  <div className="h-8 w-12 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label} data-testid={`card-metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-lg flex items-center justify-center ${metric.iconBg}`}
                >
                  <Icon className={`h-6 w-6 ${metric.iconColor}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold" data-testid={`text-metric-value-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {metric.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
