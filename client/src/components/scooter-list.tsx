import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { BatteryIndicator } from "./battery-indicator";
import { Search, Plus, Pencil, RotateCcw, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Scooter } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScooterListProps {
  scooters: Scooter[];
  isLoading?: boolean;
  onAddNew: () => void;
  onEdit: (scooter: Scooter) => void;
  onUpdateBattery: (scooter: Scooter) => void;
}

type StatusFilter = "all" | "livre" | "ocupado" | "manutencao";
type BatteryFilter = "all" | "low" | "medium" | "high";

export function ScooterList({
  scooters,
  isLoading,
  onAddNew,
  onEdit,
  onUpdateBattery,
}: ScooterListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [batteryFilter, setBatteryFilter] = useState<BatteryFilter>("all");

  const filteredScooters = scooters.filter((scooter) => {
    const matchesSearch =
      scooter.modelo.toLowerCase().includes(search.toLowerCase()) ||
      scooter.id.toLowerCase().includes(search.toLowerCase()) ||
      scooter.localizacao.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || scooter.status === statusFilter;

    const matchesBattery =
      batteryFilter === "all" ||
      (batteryFilter === "low" && scooter.bateria <= 20) ||
      (batteryFilter === "medium" && scooter.bateria > 20 && scooter.bateria <= 50) ||
      (batteryFilter === "high" && scooter.bateria > 50);

    return matchesSearch && matchesStatus && matchesBattery;
  });

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setBatteryFilter("all");
  };

  const hasActiveFilters = search || statusFilter !== "all" || batteryFilter !== "all";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-4">
        <CardTitle className="text-xl font-semibold">Lista de Scooters</CardTitle>
        <Button onClick={onAddNew} data-testid="button-add-scooter">
          <Plus className="h-4 w-4 mr-2" />
          Nova Scooter
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, modelo ou localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-scooters"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="livre">Livre</SelectItem>
              <SelectItem value="ocupado">Ocupado</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Select value={batteryFilter} onValueChange={(v) => setBatteryFilter(v as BatteryFilter)}>
            <SelectTrigger className="w-[160px]" data-testid="select-battery-filter">
              <SelectValue placeholder="Bateria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Baterias</SelectItem>
              <SelectItem value="low">Baixa (0-20%)</SelectItem>
              <SelectItem value="medium">Média (21-50%)</SelectItem>
              <SelectItem value="high">Alta (51-100%)</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground"
              data-testid="button-reset-filters"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">ID</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bateria</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredScooters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhuma scooter encontrada</p>
                      {hasActiveFilters && (
                        <Button
                          variant="link"
                          onClick={resetFilters}
                          className="mt-1"
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredScooters.map((scooter) => (
                  <TableRow key={scooter.id} data-testid={`row-scooter-${scooter.id}`}>
                    <TableCell className="font-mono text-xs">
                      {scooter.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{scooter.modelo}</TableCell>
                    <TableCell>
                      <StatusBadge status={scooter.status} />
                    </TableCell>
                    <TableCell>
                      <BatteryIndicator level={scooter.bateria} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">{scooter.localizacao}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(scooter.ultimaAtualizacao), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onUpdateBattery(scooter)}
                          data-testid={`button-update-battery-${scooter.id}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(scooter)}
                          data-testid={`button-edit-scooter-${scooter.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredScooters.length} de {scooters.length} scooters
          </p>
        )}
      </CardContent>
    </Card>
  );
}
