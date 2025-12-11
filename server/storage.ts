import {
  type User,
  type InsertUser,
  type Scooter,
  type InsertScooter,
  type Viagem,
  type InsertViagem,
  type Manutencao,
  type InsertManutencao,
  users,
  scooters,
  viagens,
  manutencoes,
} from "@shared/schema";
import { db } from "./db";
import { eq, isNull, and, or, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllScooters(): Promise<Scooter[]>;
  getScooterById(id: string): Promise<Scooter | undefined>;
  getAvailableScooters(): Promise<Scooter[]>;
  createScooter(scooter: InsertScooter): Promise<Scooter>;
  updateScooter(id: string, scooter: Partial<InsertScooter>): Promise<Scooter | undefined>;
  updateScooterBattery(id: string, bateria: number): Promise<Scooter | undefined>;
  
  getAllViagens(): Promise<Viagem[]>;
  getViagemById(id: string): Promise<Viagem | undefined>;
  getActiveViagens(): Promise<Viagem[]>;
  createViagem(viagem: InsertViagem): Promise<Viagem>;
  finalizarViagem(id: string, distanciaKm: string): Promise<Viagem | undefined>;
  
  getAllManutencoes(): Promise<Manutencao[]>;
  getManutencaoById(id: string): Promise<Manutencao | undefined>;
  getPendingManutencoes(): Promise<Manutencao[]>;
  getManutencoesByScooter(scooterId: string): Promise<Manutencao[]>;
  createManutencao(manutencao: InsertManutencao): Promise<Manutencao>;
  updateManutencao(id: string, manutencao: Partial<InsertManutencao>): Promise<Manutencao | undefined>;
  iniciarManutencao(id: string): Promise<Manutencao | undefined>;
  concluirManutencao(id: string, observacoes?: string): Promise<Manutencao | undefined>;
  cancelarManutencao(id: string): Promise<Manutencao | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllScooters(): Promise<Scooter[]> {
    return db.select().from(scooters);
  }

  async getScooterById(id: string): Promise<Scooter | undefined> {
    const [scooter] = await db.select().from(scooters).where(eq(scooters.id, id));
    return scooter || undefined;
  }

  async getAvailableScooters(): Promise<Scooter[]> {
    return db.select().from(scooters).where(eq(scooters.status, "livre"));
  }

  async createScooter(scooter: InsertScooter): Promise<Scooter> {
    const [newScooter] = await db.insert(scooters).values(scooter).returning();
    return newScooter;
  }

  async updateScooter(id: string, scooter: Partial<InsertScooter>): Promise<Scooter | undefined> {
    const [updated] = await db
      .update(scooters)
      .set({ ...scooter, ultimaAtualizacao: new Date() })
      .where(eq(scooters.id, id))
      .returning();
    return updated || undefined;
  }

  async updateScooterBattery(id: string, bateria: number): Promise<Scooter | undefined> {
    const [updated] = await db
      .update(scooters)
      .set({ bateria, ultimaAtualizacao: new Date() })
      .where(eq(scooters.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllViagens(): Promise<Viagem[]> {
    return db.select().from(viagens);
  }

  async getViagemById(id: string): Promise<Viagem | undefined> {
    const [viagem] = await db.select().from(viagens).where(eq(viagens.id, id));
    return viagem || undefined;
  }

  async getActiveViagens(): Promise<Viagem[]> {
    return db.select().from(viagens).where(isNull(viagens.dataFim));
  }

  async createViagem(viagem: InsertViagem): Promise<Viagem> {
    const [newViagem] = await db.insert(viagens).values(viagem).returning();
    return newViagem;
  }

  async finalizarViagem(id: string, distanciaKm: string): Promise<Viagem | undefined> {
    const [updated] = await db
      .update(viagens)
      .set({ dataFim: new Date(), distanciaKm })
      .where(eq(viagens.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllManutencoes(): Promise<Manutencao[]> {
    return db.select().from(manutencoes).orderBy(desc(manutencoes.dataAgendada));
  }

  async getManutencaoById(id: string): Promise<Manutencao | undefined> {
    const [manutencao] = await db.select().from(manutencoes).where(eq(manutencoes.id, id));
    return manutencao || undefined;
  }

  async getPendingManutencoes(): Promise<Manutencao[]> {
    return db.select().from(manutencoes).where(
      or(
        eq(manutencoes.status, "pendente"),
        eq(manutencoes.status, "em_andamento")
      )
    ).orderBy(desc(manutencoes.dataAgendada));
  }

  async getManutencoesByScooter(scooterId: string): Promise<Manutencao[]> {
    return db.select().from(manutencoes).where(eq(manutencoes.scooterId, scooterId)).orderBy(desc(manutencoes.dataAgendada));
  }

  async createManutencao(manutencao: InsertManutencao): Promise<Manutencao> {
    const [newManutencao] = await db.insert(manutencoes).values(manutencao).returning();
    return newManutencao;
  }

  async updateManutencao(id: string, manutencao: Partial<InsertManutencao>): Promise<Manutencao | undefined> {
    const [updated] = await db
      .update(manutencoes)
      .set(manutencao)
      .where(eq(manutencoes.id, id))
      .returning();
    return updated || undefined;
  }

  async iniciarManutencao(id: string): Promise<Manutencao | undefined> {
    const [updated] = await db
      .update(manutencoes)
      .set({ status: "em_andamento" })
      .where(eq(manutencoes.id, id))
      .returning();
    return updated || undefined;
  }

  async concluirManutencao(id: string, observacoes?: string): Promise<Manutencao | undefined> {
    const [updated] = await db
      .update(manutencoes)
      .set({ status: "concluida", dataConclusao: new Date(), observacoes })
      .where(eq(manutencoes.id, id))
      .returning();
    return updated || undefined;
  }

  async cancelarManutencao(id: string): Promise<Manutencao | undefined> {
    const [updated] = await db
      .update(manutencoes)
      .set({ status: "cancelada" })
      .where(eq(manutencoes.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
