// Types only: import with `import type { ... } from '@crewlink/shared'`.
// Keeping this package type-only means there is no build step to run before the apps start.

export type CrewRole = 'CAPTAIN' | 'FIRST_OFFICER' | 'PURSER' | 'CABIN_CREW' | 'OCC';

export type MessagePriority = 'normal' | 'urgent';

/** Lifecycle of a message on the device. Only `sent` and `read` are known to the server. */
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'read' | 'failed';

export interface CrewMember {
  id: string;
  displayName: string;
  role: CrewRole;
}

export interface FlightChannel {
  id: string;
  flightNumber: string; // e.g. "SN 2903"
  origin: string; // IATA, e.g. "BRU"
  destination: string; // IATA, e.g. "ZAG"
  scheduledDeparture: string; // ISO 8601
  memberIds: string[];
}

export interface ChatMessage {
  /** Generated on the device (UUID) so a retried send is idempotent. */
  clientId: string;
  channelId: string;
  senderId: string;
  body: string;
  priority: MessagePriority;
  /** When the user pressed send, device clock. */
  createdAt: string;
  /** Assigned by the server; the source of truth for ordering. Missing while queued. */
  serverSeq?: number;
  serverReceivedAt?: string;
}

/** Client → server: send (or re-send) a message. */
export interface SendMessagePayload {
  clientId: string;
  channelId: string;
  body: string;
  priority: MessagePriority;
  createdAt: string;
}

/** Client → server on reconnect: "give me everything after what I already have". */
export interface SyncRequest {
  channelId: string;
  afterSeq: number;
}

export interface SyncResponse {
  channelId: string;
  messages: ChatMessage[];
  latestSeq: number;
}

/** WebSocket event names, shared so both sides never drift apart. */
export type ClientEvent = 'message:send' | 'channel:sync' | 'typing:start' | 'typing:stop' | 'message:read';
export type ServerEvent = 'message:ack' | 'message:new' | 'typing' | 'presence';
