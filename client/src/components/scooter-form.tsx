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
import { Slider } from "@/components/ui/slider";
import type { Scooter } from "@shared/schema";

const scooterFormSchema = z.object({
  modelo: z.string().min(1, "Modelo é obrigatório"),
  bateria: z.number().min(0).max(100),
  status: z.enum(["livre", "ocupado", "manutencao"]),
  localizacao: z.string().min(1, "Localização é obrigatória"),
});

type ScooterFormValues = z.infer<typeof scooterFormSchema>;

interface ScooterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scooter?: Scooter | null;
  onSubmit: (data: ScooterFormValues) => void;
  isPending?: boolean;
}

export function ScooterForm({
  open,
  onOpenChange,
  scooter,
  onSubmit,
  isPending,
}: ScooterFormProps) {
  const isEditing = !!scooter;

  const form = useForm<ScooterFormValues>({
    resolver: zodResolver(scooterFormSchema),
    defaultValues: {
      modelo: "",
      bateria: 100,
      status: "livre",
      localizacao: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (scooter) {
        form.reset({
          modelo: scooter.modelo,
          bateria: scooter.bateria,
          status: scooter.status,
          localizacao: scooter.localizacao,
        });
      } else {
        form.reset({
          modelo: "",
          bateria: 100,
          status: "livre",
          localizacao: "",
        });
      }
    }
  }, [open, scooter, form]);

  const handleSubmit = (data: ScooterFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Scooter" : "Nova Scooter"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: EcoRide Pro X"
                        {...field}
                        data-testid="input-scooter-modelo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-scooter-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="livre">Livre</SelectItem>
                        <SelectItem value="ocupado">Ocupado</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="localizacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Av. Paulista, 1000"
                      {...field}
                      data-testid="input-scooter-localizacao"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bateria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Bateria: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[field.value]}
                      onValueChange={(v) => field.onChange(v[0])}
                      className="py-4"
                      data-testid="slider-scooter-bateria"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-scooter-form"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-scooter-form"
              >
                {isPending ? "Salvando..." : isEditing ? "Salvar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
