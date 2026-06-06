import { SSEEvent } from "../../shared/types";
import { Response } from "express";

/**
 * initSSEResponse
 * writeSEEEvent
 * writeSSEHearbeat
 */

export function initSSEResponse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accl-Buffering", "no");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();
}

export function writeSEEEvent(
  res: Response,
  event: SSEEvent,
  id?: string,
): void {
  let raw = "";
  raw += `event: ${event.type}\n`;
  if (id) {
    raw += `id:${id}\n`;
  }
  raw += `data: ${JSON.stringify(event.data)}\n`;
  raw += `\n`;
  res.write(raw);
}

export function writeSSEHeartbeat(res: Response): void {
  res.write(": heartbeat\n\n");
}
