import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

export type WSEventType = 
  | "scooter:created"
  | "scooter:updated" 
  | "scooter:deleted"
  | "trip:created"
  | "trip:updated"
  | "trip:finalized";

export interface WSMessage {
  type: WSEventType;
  payload: unknown;
  timestamp: string;
}

let wss: WebSocketServer | null = null;

export function setupWebSocket(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    log("WebSocket client connected", "ws");
    
    ws.on("close", () => {
      log("WebSocket client disconnected", "ws");
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error.message}`, "ws");
    });
  });

  log("WebSocket server initialized on /ws", "ws");
  return wss;
}

export function broadcast(type: WSEventType, payload: unknown): void {
  if (!wss) return;

  const message: WSMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  const data = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });

  log(`Broadcast: ${type}`, "ws");
}
