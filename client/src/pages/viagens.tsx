import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TripList } from "@/components/trip-list";
import type { Scooter, Viagem } from "@shared/schema";

export default function ViagensPage() {
  const { toast } = useToast();
  const [pendingEndTripId, setPendingEndTripId] = useState<string | null>(null);

  const { data: scooters = [] } = useQuery<Scooter[]>({
    queryKey: ["/api/scooters"],
  });

  const { data: trips = [], isLoading } = useQuery<Viagem[]>({
    queryKey: ["/api/viagens"],
  });

  const endTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      setPendingEndTripId(tripId);
      return apiRequest("PATCH", `/api/viagens/${tripId}/finalizar`, {
        distanciaKm: (Math.random() * 10 + 1).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viagens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      setPendingEndTripId(null);
      toast({ title: "Viagem finalizada com sucesso!" });
    },
    onError: () => {
      setPendingEndTripId(null);
      toast({ title: "Erro ao finalizar viagem", variant: "destructive" });
    },
  });

  const handleEndTrip = (tripId: string) => {
    endTripMutation.mutate(tripId);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Viagens</h1>
          <p className="text-muted-foreground mt-1">
            Histórico e gestão de viagens da frota
          </p>
        </div>

        <TripList
          trips={trips}
          scooters={scooters}
          isLoading={isLoading}
          onEndTrip={handleEndTrip}
          isPendingEnd={pendingEndTripId}
        />
      </div>
    </div>
  );
}
