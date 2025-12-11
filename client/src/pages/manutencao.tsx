import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wrench, Play, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Scooter, Manutencao } from "@shared/schema";

export default function ManutencaoPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Manutencao | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const [formData, setFormData] = useState({
    scooterId: "",
    tecnicoNome: "",
    descricao: "",
    prioridade: "media",
    dataAgendada: new Date().toISOString().slice(0, 16),
  });

  const { data: manutencoes = [], isLoading } = useQuery<Manutencao[]>({
    queryKey: ["/api/manutencoes"],
  });

  const { data: scooters = [] } = useQuery<Scooter[]>({
    queryKey: ["/api/scooters"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/manutencoes", {
        ...data,
        dataAgendada: new Date(data.dataAgendada).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manutencoes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: "Manutencao agendada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao agendar manutencao", variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/manutencoes/${id}/iniciar`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manutencoes"] });
      toast({ title: "Manutencao iniciada!" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes: string }) => {
      return apiRequest("PATCH", `/api/manutencoes/${id}/concluir`, { observacoes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manutencoes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      setCompleteDialogOpen(false);
      setSelectedMaintenance(null);
      setObservacoes("");
      toast({ title: "Manutencao concluida!" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/manutencoes/${id}/cancelar`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manutencoes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
      toast({ title: "Manutencao cancelada" });
    },
  });

  const resetForm = () => {
    setFormData({
      scooterId: "",
      tecnicoNome: "",
      descricao: "",
      prioridade: "media",
      dataAgendada: new Date().toISOString().slice(0, 16),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendente: "secondary",
      em_andamento: "default",
      concluida: "outline",
      cancelada: "destructive",
    };
    const labels: Record<string, string> = {
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      concluida: "Concluida",
      cancelada: "Cancelada",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      baixa: "bg-slate-100 text-slate-700",
      media: "bg-blue-100 text-blue-700",
      alta: "bg-amber-100 text-amber-700",
      urgente: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      baixa: "Baixa",
      media: "Media",
      alta: "Alta",
      urgente: "Urgente",
    };
    return <Badge className={colors[priority] || ""}>{labels[priority] || priority}</Badge>;
  };

  const getScooterName = (scooterId: string) => {
    const scooter = scooters.find((s) => s.id === scooterId);
    return scooter ? scooter.modelo : scooterId.slice(0, 8);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Manutencao</h1>
            <p className="text-muted-foreground">Agendamento e gerenciamento de manutencoes</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-maintenance">
            <Plus className="w-4 h-4 mr-2" />
            Nova Manutencao
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Lista de Manutencoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : manutencoes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma manutencao agendada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scooter</TableHead>
                    <TableHead>Tecnico</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manutencoes.map((m) => (
                    <TableRow key={m.id} data-testid={`row-manutencao-${m.id}`}>
                      <TableCell>{getScooterName(m.scooterId)}</TableCell>
                      <TableCell>{m.tecnicoNome}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{m.descricao}</TableCell>
                      <TableCell>{getPriorityBadge(m.prioridade)}</TableCell>
                      <TableCell>{getStatusBadge(m.status)}</TableCell>
                      <TableCell>
                        {format(new Date(m.dataAgendada), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {m.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startMutation.mutate(m.id)}
                              data-testid={`button-start-${m.id}`}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          {(m.status === "pendente" || m.status === "em_andamento") && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedMaintenance(m);
                                setCompleteDialogOpen(true);
                              }}
                              data-testid={`button-complete-${m.id}`}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}
                          {m.status !== "concluida" && m.status !== "cancelada" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelMutation.mutate(m.id)}
                              data-testid={`button-cancel-${m.id}`}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Manutencao</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scooter</Label>
                <Select
                  value={formData.scooterId}
                  onValueChange={(v) => setFormData({ ...formData, scooterId: v })}
                >
                  <SelectTrigger data-testid="select-maintenance-scooter">
                    <SelectValue placeholder="Selecione uma scooter" />
                  </SelectTrigger>
                  <SelectContent>
                    {scooters.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.modelo} - {s.localizacao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tecnico</Label>
                <Input
                  value={formData.tecnicoNome}
                  onChange={(e) => setFormData({ ...formData, tecnicoNome: e.target.value })}
                  placeholder="Nome do tecnico"
                  data-testid="input-maintenance-tecnico"
                />
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descricao do servico"
                  data-testid="input-maintenance-descricao"
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(v) => setFormData({ ...formData, prioridade: v })}
                >
                  <SelectTrigger data-testid="select-maintenance-prioridade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Agendada</Label>
                <Input
                  type="datetime-local"
                  value={formData.dataAgendada}
                  onChange={(e) => setFormData({ ...formData, dataAgendada: e.target.value })}
                  data-testid="input-maintenance-data"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.scooterId || !formData.tecnicoNome || !formData.descricao}
                data-testid="button-submit-maintenance"
              >
                Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Concluir Manutencao</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Observacoes (opcional)</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observacoes sobre a manutencao"
                  data-testid="input-maintenance-observacoes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  selectedMaintenance &&
                  completeMutation.mutate({ id: selectedMaintenance.id, observacoes })
                }
                data-testid="button-submit-complete-maintenance"
              >
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
