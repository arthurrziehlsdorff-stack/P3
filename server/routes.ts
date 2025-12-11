import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScooterSchema, updateBateriaSchema, alugarSchema, insertManutencaoSchema } from "@shared/schema";
import { z } from "zod";
import { broadcast } from "./websocket";
import express from "express";
import path from "path";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // GET all scooters
  app.get("/api/scooters", async (req, res) => {
    try {
      const scooters = await storage.getAllScooters();
      res.json(scooters);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar scooters" });
    }
  });

  // GET available scooters (status = 'livre')
  app.get("/api/scooters/disponiveis", async (req, res) => {
    try {
      const scooters = await storage.getAvailableScooters();
      res.json(scooters);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar scooters disponíveis" });
    }
  });

  // GET single scooter
  app.get("/api/scooters/:id", async (req, res) => {
    try {
      const scooter = await storage.getScooterById(req.params.id);
      if (!scooter) {
        return res.status(404).json({ message: "Scooter não encontrada" });
      }
      res.json(scooter);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar scooter" });
    }
  });

  // POST create new scooter
  app.post("/api/scooters", async (req, res) => {
    try {
      const parsed = insertScooterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: parsed.error.errors 
        });
      }
      const scooter = await storage.createScooter(parsed.data);
      broadcast("scooter:created", scooter);
      res.status(201).json(scooter);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar scooter" });
    }
  });

  // PATCH update scooter
  app.patch("/api/scooters/:id", async (req, res) => {
    try {
      const scooter = await storage.getScooterById(req.params.id);
      if (!scooter) {
        return res.status(404).json({ message: "Scooter não encontrada" });
      }
      
      const parsed = insertScooterSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: parsed.error.errors 
        });
      }
      
      const updated = await storage.updateScooter(req.params.id, parsed.data);
      broadcast("scooter:updated", updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar scooter" });
    }
  });

  // PATCH update scooter battery level
  app.patch("/api/scooters/:id/bateria", async (req, res) => {
    try {
      const scooter = await storage.getScooterById(req.params.id);
      if (!scooter) {
        return res.status(404).json({ message: "Scooter não encontrada" });
      }
      
      const parsed = updateBateriaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Nível de bateria inválido (0-100)", 
          errors: parsed.error.errors 
        });
      }
      
      const updated = await storage.updateScooterBattery(req.params.id, parsed.data.bateria);
      broadcast("scooter:updated", updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar bateria" });
    }
  });

  // POST /alugar - Rent a scooter (business logic validation)
  app.post("/api/alugar", async (req, res) => {
    try {
      const parsed = alugarSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: parsed.error.errors 
        });
      }

      const { scooterId, usuarioNome } = parsed.data;

      // Rule 1: Scooter must exist
      const scooter = await storage.getScooterById(scooterId);
      if (!scooter) {
        return res.status(400).json({ message: "Scooter não encontrada no banco de dados" });
      }

      // Rule 2: Status must be 'livre'
      if (scooter.status !== "livre") {
        return res.status(400).json({ message: "Scooter não está disponível para aluguel" });
      }

      // Rule 3: Battery must be greater than 20%
      if (scooter.bateria <= 20) {
        return res.status(400).json({ message: "Scooter com bateria insuficiente (mínimo 20%)" });
      }

      // Create the trip
      const viagem = await storage.createViagem({
        scooterId,
        usuarioNome,
        dataFim: null,
        distanciaKm: null,
      });

      // Update scooter status to 'ocupado'
      const updatedScooter = await storage.updateScooter(scooterId, { status: "ocupado" });
      
      broadcast("trip:created", viagem);
      broadcast("scooter:updated", updatedScooter);

      res.status(201).json(viagem);
    } catch (error) {
      res.status(500).json({ message: "Erro ao processar aluguel" });
    }
  });

  // GET all trips
  app.get("/api/viagens", async (req, res) => {
    try {
      const viagens = await storage.getAllViagens();
      res.json(viagens);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar viagens" });
    }
  });

  // GET active trips
  app.get("/api/viagens/ativas", async (req, res) => {
    try {
      const viagens = await storage.getActiveViagens();
      res.json(viagens);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar viagens ativas" });
    }
  });

  // PATCH finalize trip
  app.patch("/api/viagens/:id/finalizar", async (req, res) => {
    try {
      const viagem = await storage.getViagemById(req.params.id);
      if (!viagem) {
        return res.status(404).json({ message: "Viagem não encontrada" });
      }

      if (viagem.dataFim) {
        return res.status(400).json({ message: "Viagem já foi finalizada" });
      }

      const distanciaKm = req.body.distanciaKm || "0.00";
      const updated = await storage.finalizarViagem(req.params.id, distanciaKm);

      // Update scooter status back to 'livre'
      const updatedScooter = await storage.updateScooter(viagem.scooterId, { status: "livre" });
      
      broadcast("trip:finalized", updated);
      broadcast("scooter:updated", updatedScooter);

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao finalizar viagem" });
    }
  });

  // === MAINTENANCE ROUTES ===

  // GET all maintenance tasks
  app.get("/api/manutencoes", async (req, res) => {
    try {
      const manutencoes = await storage.getAllManutencoes();
      res.json(manutencoes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar manutenções" });
    }
  });

  // GET pending maintenance tasks
  app.get("/api/manutencoes/pendentes", async (req, res) => {
    try {
      const manutencoes = await storage.getPendingManutencoes();
      res.json(manutencoes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar manutenções pendentes" });
    }
  });

  // GET maintenance tasks for a specific scooter
  app.get("/api/scooters/:id/manutencoes", async (req, res) => {
    try {
      const manutencoes = await storage.getManutencoesByScooter(req.params.id);
      res.json(manutencoes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar manutenções da scooter" });
    }
  });

  // GET single maintenance task
  app.get("/api/manutencoes/:id", async (req, res) => {
    try {
      const manutencao = await storage.getManutencaoById(req.params.id);
      if (!manutencao) {
        return res.status(404).json({ message: "Manutenção não encontrada" });
      }
      res.json(manutencao);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar manutenção" });
    }
  });

  // POST create new maintenance task
  app.post("/api/manutencoes", async (req, res) => {
    try {
      const parsed = insertManutencaoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: parsed.error.errors 
        });
      }

      // Verify scooter exists
      const scooter = await storage.getScooterById(parsed.data.scooterId);
      if (!scooter) {
        return res.status(400).json({ message: "Scooter não encontrada" });
      }

      // Update scooter status to maintenance
      await storage.updateScooter(parsed.data.scooterId, { status: "manutencao" });

      const manutencao = await storage.createManutencao(parsed.data);
      broadcast("maintenance:created", manutencao);
      broadcast("scooter:updated", { ...scooter, status: "manutencao" });
      res.status(201).json(manutencao);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar manutenção" });
    }
  });

  // PATCH update maintenance task
  app.patch("/api/manutencoes/:id", async (req, res) => {
    try {
      const manutencao = await storage.getManutencaoById(req.params.id);
      if (!manutencao) {
        return res.status(404).json({ message: "Manutenção não encontrada" });
      }

      const parsed = insertManutencaoSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: parsed.error.errors 
        });
      }

      const updated = await storage.updateManutencao(req.params.id, parsed.data);
      broadcast("maintenance:updated", updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar manutenção" });
    }
  });

  // PATCH start maintenance task
  app.patch("/api/manutencoes/:id/iniciar", async (req, res) => {
    try {
      const manutencao = await storage.getManutencaoById(req.params.id);
      if (!manutencao) {
        return res.status(404).json({ message: "Manutenção não encontrada" });
      }

      if (manutencao.status !== "pendente") {
        return res.status(400).json({ message: "Manutenção não está pendente" });
      }

      const updated = await storage.iniciarManutencao(req.params.id);
      broadcast("maintenance:updated", updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao iniciar manutenção" });
    }
  });

  // PATCH complete maintenance task
  app.patch("/api/manutencoes/:id/concluir", async (req, res) => {
    try {
      const manutencao = await storage.getManutencaoById(req.params.id);
      if (!manutencao) {
        return res.status(404).json({ message: "Manutenção não encontrada" });
      }

      if (manutencao.status !== "em_andamento" && manutencao.status !== "pendente") {
        return res.status(400).json({ message: "Manutenção não pode ser concluída" });
      }

      const observacoes = req.body.observacoes || null;
      const updated = await storage.concluirManutencao(req.params.id, observacoes);

      // Update scooter status back to livre
      const scooter = await storage.updateScooter(manutencao.scooterId, { status: "livre" });
      
      broadcast("maintenance:completed", updated);
      broadcast("scooter:updated", scooter);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao concluir manutenção" });
    }
  });

  // PATCH cancel maintenance task
  app.patch("/api/manutencoes/:id/cancelar", async (req, res) => {
    try {
      const manutencao = await storage.getManutencaoById(req.params.id);
      if (!manutencao) {
        return res.status(404).json({ message: "Manutenção não encontrada" });
      }

      if (manutencao.status === "concluida") {
        return res.status(400).json({ message: "Manutenção já foi concluída" });
      }

      const updated = await storage.cancelarManutencao(req.params.id);

      // Update scooter status back to livre if it was in maintenance
      const scooter = await storage.getScooterById(manutencao.scooterId);
      if (scooter && scooter.status === "manutencao") {
        const updatedScooter = await storage.updateScooter(manutencao.scooterId, { status: "livre" });
        broadcast("scooter:updated", updatedScooter);
      }
      
      broadcast("maintenance:cancelled", updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao cancelar manutenção" });
    }
  });

  // Serve plain HTML version at /html
  const publicPath = path.resolve(process.cwd(), "public");
  app.use("/static", express.static(publicPath));
  app.get("/html", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  return httpServer;
}
