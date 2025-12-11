import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scooterStatusEnum = pgEnum("scooter_status", ["livre", "ocupado", "manutencao"]);

export const scooters = pgTable("scooters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelo: text("modelo").notNull(),
  bateria: integer("bateria").notNull().default(100),
  status: scooterStatusEnum("status").notNull().default("livre"),
  localizacao: text("localizacao").notNull(),
  ultimaAtualizacao: timestamp("ultima_atualizacao").notNull().defaultNow(),
});

export const viagens = pgTable("viagens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scooterId: varchar("scooter_id").notNull().references(() => scooters.id),
  usuarioNome: text("usuario_nome").notNull(),
  dataInicio: timestamp("data_inicio").notNull().defaultNow(),
  dataFim: timestamp("data_fim"),
  distanciaKm: decimal("distancia_km", { precision: 10, scale: 2 }),
});

export const scootersRelations = relations(scooters, ({ many }) => ({
  viagens: many(viagens),
}));

export const viagensRelations = relations(viagens, ({ one }) => ({
  scooter: one(scooters, {
    fields: [viagens.scooterId],
    references: [scooters.id],
  }),
}));

export const insertScooterSchema = createInsertSchema(scooters).omit({
  id: true,
  ultimaAtualizacao: true,
});

export const insertViagemSchema = createInsertSchema(viagens).omit({
  id: true,
  dataInicio: true,
});

export const updateBateriaSchema = z.object({
  bateria: z.number().min(0).max(100),
});

export const alugarSchema = z.object({
  scooterId: z.string().uuid(),
  usuarioNome: z.string().min(1),
});

export type InsertScooter = z.infer<typeof insertScooterSchema>;
export type Scooter = typeof scooters.$inferSelect;
export type InsertViagem = z.infer<typeof insertViagemSchema>;
export type Viagem = typeof viagens.$inferSelect;

export const maintenancePriorityEnum = pgEnum("maintenance_priority", ["baixa", "media", "alta", "urgente"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["pendente", "em_andamento", "concluida", "cancelada"]);

export const manutencoes = pgTable("manutencoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scooterId: varchar("scooter_id").notNull().references(() => scooters.id),
  tecnicoNome: text("tecnico_nome").notNull(),
  descricao: text("descricao").notNull(),
  prioridade: maintenancePriorityEnum("prioridade").notNull().default("media"),
  status: maintenanceStatusEnum("status").notNull().default("pendente"),
  dataAgendada: timestamp("data_agendada").notNull(),
  dataConclusao: timestamp("data_conclusao"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const manutencoesRelations = relations(manutencoes, ({ one }) => ({
  scooter: one(scooters, {
    fields: [manutencoes.scooterId],
    references: [scooters.id],
  }),
}));

export const insertManutencaoSchema = createInsertSchema(manutencoes).omit({
  id: true,
  dataConclusao: true,
  createdAt: true,
});

export type InsertManutencao = z.infer<typeof insertManutencaoSchema>;
export type Manutencao = typeof manutencoes.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
