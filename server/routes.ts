import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScooterSchema, updateBateriaSchema, alugarSchema } from "@shared/schema";
import { z } from "zod";

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
      await storage.updateScooter(scooterId, { status: "ocupado" });

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
      await storage.updateScooter(viagem.scooterId, { status: "livre" });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao finalizar viagem" });
    }
  });

  return httpServer;
}
