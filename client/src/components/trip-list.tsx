import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, Clock, User, Bike, MapPin } from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Viagem, Scooter } from "@shared/schema";

interface TripListProps {
  trips: Viagem[];
  scooters: Scooter[];
  isLoading?: boolean;
  onEndTrip: (tripId: string) => void;
  isPendingEnd?: string | null;
}

export function TripList({
  trips,
  scooters,
  isLoading,
  onEndTrip,
  isPendingEnd,
}: TripListProps) {
  const getScooter = (scooterId: string) =>
    scooters.find((s) => s.id === scooterId);

  const getDuration = (start: Date | string, end?: Date | string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    return formatDistanceStrict(startDate, endDate, { locale: ptBR });
  };

  const sortedTrips = [...trips].sort(
    (a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Histórico de Viagens</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Scooter</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Distância</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <MapPin className="h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhuma viagem registrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTrips.map((trip) => {
                  const scooter = getScooter(trip.scooterId);
                  const isActive = !trip.dataFim;

                  return (
                    <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                      <TableCell>
                        {isActive ? (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 gap-1 no-default-hover-elevate no-default-active-elevate"
                          >
                            <Play className="h-3 w-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 gap-1 no-default-hover-elevate no-default-active-elevate"
                          >
                            <Square className="h-3 w-3" />
                            Finalizada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{trip.usuarioNome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-muted-foreground" />
                          <span>{scooter?.modelo ?? "Scooter removida"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(trip.dataInicio), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {getDuration(trip.dataInicio, trip.dataFim)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {trip.distanciaKm
                          ? `${parseFloat(trip.distanciaKm).toFixed(2)} km`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEndTrip(trip.id)}
                              disabled={isPendingEnd === trip.id}
                              data-testid={`button-end-trip-${trip.id}`}
                            >
                              {isPendingEnd === trip.id ? (
                                "Finalizando..."
                              ) : (
                                <>
                                  <Square className="h-3 w-3 mr-1" />
                                  Finalizar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
