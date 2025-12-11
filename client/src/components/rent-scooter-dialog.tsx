import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BatteryIndicator } from "./battery-indicator";
import { StatusBadge } from "./status-badge";
import type { Scooter } from "@shared/schema";

const rentFormSchema = z.object({
  scooterId: z.string().min(1, "Selecione uma scooter"),
  usuarioNome: z.string().min(1, "Nome do usuário é obrigatório"),
});

type RentFormValues = z.infer<typeof rentFormSchema>;

interface RentScooterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableScooters: Scooter[];
  onSubmit: (data: RentFormValues) => void;
  isPending?: boolean;
  error?: string | null;
}

export function RentScooterDialog({
  open,
  onOpenChange,
  availableScooters,
  onSubmit,
  isPending,
  error,
}: RentScooterDialogProps) {
  const form = useForm<RentFormValues>({
    resolver: zodResolver(rentFormSchema),
    defaultValues: {
      scooterId: "",
      usuarioNome: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        scooterId: "",
        usuarioNome: "",
      });
    }
  }, [open, form]);

  const selectedScooterId = form.watch("scooterId");
  const selectedScooter = availableScooters.find((s) => s.id === selectedScooterId);

  const handleSubmit = (data: RentFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Alugar Scooter</DialogTitle>
          <DialogDescription>
            Selecione uma scooter disponível e informe o nome do usuário para iniciar a viagem.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="scooterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scooter</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-rent-scooter">
                        <SelectValue placeholder="Selecione uma scooter disponível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableScooters.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Nenhuma scooter disponível
                        </div>
                      ) : (
                        availableScooters.map((scooter) => (
                          <SelectItem key={scooter.id} value={scooter.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{scooter.modelo}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground text-xs">
                                {scooter.localizacao}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedScooter && (
              <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-sm font-medium">Detalhes da Scooter</span>
                  <StatusBadge status={selectedScooter.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>
                    <span className="ml-2 font-medium">{selectedScooter.modelo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Localização:</span>
                    <span className="ml-2">{selectedScooter.localizacao}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Bateria:</span>
                  <BatteryIndicator level={selectedScooter.bateria} />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="usuarioNome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Usuário</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome do usuário"
                      {...field}
                      data-testid="input-rent-usuario"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-rent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || availableScooters.length === 0}
                data-testid="button-submit-rent"
              >
                {isPending ? "Processando..." : "Iniciar Aluguel"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
