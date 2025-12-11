import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MetricsCards } from "@/components/metrics-cards";
import { ScooterList } from "@/components/scooter-list";
import { ScooterForm } from "@/components/scooter-form";
import { BatteryUpdateDialog } from "@/components/battery-update-dialog";
import { RentScooterDialog } from "@/components/rent-scooter-dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { Scooter, Viagem } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [scooterFormOpen, setScooterFormOpen] = useState(false);
  const [editingScooter, setEditingScooter] = useState<Scooter | null>(null);
  const [batteryDialogOpen, setBatteryDialogOpen] = useState(false);
  const [batteryScooter, setBatteryScooter] = useState<Scooter | null>(null);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);

  const { data: scooters = [], isLoading: isLoadingScooters } = useQuery<Scooter[]>({
    queryKey: ["/api/scooters"],
  });

  const { data: trips = [], isLoading: isLoadingTrips } = useQuery<Viagem[]>({
    queryKey: ["/api/viagens"],
  });

  const availableScooters = scooters.filter(
    (s) => s.status === "livre" && s.bateria > 20
  );

  const createScooterMutation = useMutation({
    mutationFn: async (data: {
      modelo: string;
      bateria: number;
      status: string;
      localizacao: string;
    }) => {
      return apiRequest("POST", "/api/scooters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      setScooterFormOpen(false);
      toast({ title: "Scooter registrada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar scooter", variant: "destructive" });
    },
  });

  const updateScooterMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        modelo: string;
        bateria: number;
        status: string;
        localizacao: string;
      };
    }) => {
      return apiRequest("PATCH", `/api/scooters/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      setScooterFormOpen(false);
      setEditingScooter(null);
      toast({ title: "Scooter atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar scooter", variant: "destructive" });
    },
  });

  const updateBatteryMutation = useMutation({
    mutationFn: async ({ id, bateria }: { id: string; bateria: number }) => {
      return apiRequest("PATCH", `/api/scooters/${id}/bateria`, { bateria });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      setBatteryDialogOpen(false);
      setBatteryScooter(null);
      toast({ title: "Bateria atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar bateria", variant: "destructive" });
    },
  });

  const rentScooterMutation = useMutation({
    mutationFn: async (data: { scooterId: string; usuarioNome: string }) => {
      const response = await apiRequest("POST", "/api/alugar", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/viagens"] });
      setRentDialogOpen(false);
      setRentError(null);
      toast({ title: "Viagem iniciada com sucesso!" });
    },
    onError: (error: Error) => {
      setRentError(error.message || "Erro ao iniciar aluguel");
    },
  });

  const handleAddNew = () => {
    setEditingScooter(null);
    setScooterFormOpen(true);
  };

  const handleEdit = (scooter: Scooter) => {
    setEditingScooter(scooter);
    setScooterFormOpen(true);
  };

  const handleUpdateBattery = (scooter: Scooter) => {
    setBatteryScooter(scooter);
    setBatteryDialogOpen(true);
  };

  const handleScooterFormSubmit = (data: {
    modelo: string;
    bateria: number;
    status: "livre" | "ocupado" | "manutencao";
    localizacao: string;
  }) => {
    if (editingScooter) {
      updateScooterMutation.mutate({ id: editingScooter.id, data });
    } else {
      createScooterMutation.mutate(data);
    }
  };

  const handleBatteryUpdate = (batteryLevel: number) => {
    if (batteryScooter) {
      updateBatteryMutation.mutate({ id: batteryScooter.id, bateria: batteryLevel });
    }
  };

  const handleRentSubmit = (data: { scooterId: string; usuarioNome: string }) => {
    setRentError(null);
    rentScooterMutation.mutate(data);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral da sua frota de scooters
            </p>
          </div>
          <Button onClick={() => setRentDialogOpen(true)} data-testid="button-rent-scooter">
            <Play className="h-4 w-4 mr-2" />
            Alugar Scooter
          </Button>
        </div>

        <MetricsCards
          scooters={scooters}
          activeTrips={trips}
          isLoading={isLoadingScooters || isLoadingTrips}
        />

        <ScooterList
          scooters={scooters}
          isLoading={isLoadingScooters}
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onUpdateBattery={handleUpdateBattery}
        />

        <ScooterForm
          open={scooterFormOpen}
          onOpenChange={(open) => {
            setScooterFormOpen(open);
            if (!open) setEditingScooter(null);
          }}
          scooter={editingScooter}
          onSubmit={handleScooterFormSubmit}
          isPending={createScooterMutation.isPending || updateScooterMutation.isPending}
        />

        <BatteryUpdateDialog
          open={batteryDialogOpen}
          onOpenChange={(open) => {
            setBatteryDialogOpen(open);
            if (!open) setBatteryScooter(null);
          }}
          scooter={batteryScooter}
          onSubmit={handleBatteryUpdate}
          isPending={updateBatteryMutation.isPending}
        />

        <RentScooterDialog
          open={rentDialogOpen}
          onOpenChange={(open) => {
            setRentDialogOpen(open);
            if (!open) setRentError(null);
          }}
          availableScooters={availableScooters}
          onSubmit={handleRentSubmit}
          isPending={rentScooterMutation.isPending}
          error={rentError}
        />
      </div>
    </div>
  );
}
