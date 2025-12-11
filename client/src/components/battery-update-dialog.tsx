import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { BatteryIndicator } from "./battery-indicator";
import type { Scooter } from "@shared/schema";

interface BatteryUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scooter: Scooter | null;
  onSubmit: (batteryLevel: number) => void;
  isPending?: boolean;
}

export function BatteryUpdateDialog({
  open,
  onOpenChange,
  scooter,
  onSubmit,
  isPending,
}: BatteryUpdateDialogProps) {
  const [batteryLevel, setBatteryLevel] = useState(100);

  useEffect(() => {
    if (open && scooter) {
      setBatteryLevel(scooter.bateria);
    }
  }, [open, scooter]);

  const handleSubmit = () => {
    onSubmit(batteryLevel);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Atualizar Bateria</DialogTitle>
        </DialogHeader>
        {scooter && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Scooter</p>
              <p className="font-medium">{scooter.modelo}</p>
              <p className="text-xs font-mono text-muted-foreground">
                ID: {scooter.id.slice(0, 8)}...
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nível de Bateria</span>
                <span className="font-mono text-lg font-bold">{batteryLevel}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[batteryLevel]}
                onValueChange={(v) => setBatteryLevel(v[0])}
                data-testid="slider-update-battery"
              />
              <div className="flex justify-center">
                <BatteryIndicator level={batteryLevel} showLabel={false} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-battery-update"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            data-testid="button-submit-battery-update"
          >
            {isPending ? "Atualizando..." : "Atualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
