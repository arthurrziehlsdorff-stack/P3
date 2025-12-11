import {
  type User,
  type InsertUser,
  type Scooter,
  type InsertScooter,
  type Viagem,
  type InsertViagem,
  users,
  scooters,
  viagens,
} from "@shared/schema";
import { db } from "./db";
import { eq, isNull, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
