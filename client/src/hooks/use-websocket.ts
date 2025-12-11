import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

type WSEventType =
  | "scooter:created"
  | "scooter:updated"
  | "scooter:deleted"
  | "trip:created"
  | "trip:updated"
  | "trip:finalized";

interface WSMessage {
  type: WSEventType;
  payload: unknown;
  timestamp: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  const handleMessage = (message: WSMessage) => {
    switch (message.type) {
      case "scooter:created":
      case "scooter:updated":
      case "scooter:deleted":
        queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
        queryClient.invalidateQueries({ queryKey: ["/api/scooters/disponiveis"] });
        break;
      case "trip:created":
      case "trip:updated":
      case "trip:finalized":
        queryClient.invalidateQueries({ queryKey: ["/api/viagens"] });
        queryClient.invalidateQueries({ queryKey: ["/api/viagens/ativas"] });
        queryClient.invalidateQueries({ queryKey: ["/api/scooters"] });
        break;
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}
