import { EventEmitter } from "events";

export interface ChatMessageEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  createdAt: string;
  status: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

class ChatEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  broadcastMessage(event: ChatMessageEvent) {
    this.emit(`conversation:${event.conversationId}:message`, event);
  }

  broadcastTyping(event: TypingEvent) {
    this.emit(`conversation:${event.conversationId}:typing`, event);
  }

  broadcastReadReceipt(conversationId: string, readerId: string, readAt: string) {
    this.emit(`conversation:${conversationId}:read`, { conversationId, readerId, readAt });
  }
}

export const chatEventBus = new ChatEventBus();
