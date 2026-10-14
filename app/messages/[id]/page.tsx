"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Send,
  Shield,
  UserX,
  MapPin,
  Check,
  CheckCheck,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  clientMessageId?: string | null;
  status: "sent" | "delivered" | "read";
  createdAt: string;
}

interface PartnerInfo {
  id: string;
  displayName: string;
  computedAge: number;
  locationCity: string | null;
  relationshipIntent: string;
  photoUrl: string | null;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const [partner, setPartner] = React.useState<PartnerInfo | null>(null);
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [matchStatus, setMatchStatus] = React.useState<string>("active");
  const [inputText, setInputText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string>("");

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch initial history
  const fetchHistory = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get current user
      const userRes = await fetch("/api/auth/verify");
      if (userRes.ok) {
        const uData = await userRes.json();
        setCurrentUserId(uData.user?.id || "");
      }

      // 2. Get conversation thread
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setPartner(data.partner);
        setMatchStatus(data.matchStatus);
        setMessages(data.messages || []);
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationId, scrollToBottom]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time EventSource connection
  React.useEffect(() => {
    if (!conversationId) return;

    const eventSource = new EventSource(`/api/messages/stream?conversationId=${conversationId}`);

    eventSource.addEventListener("message", (event) => {
      try {
        const newMsg: MessageItem = JSON.parse(event.data);
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMsg.id || (m.clientMessageId && m.clientMessageId === newMsg.clientMessageId))) {
            return prev;
          }
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      } catch {
        // Ignored
      }
    });

    eventSource.addEventListener("read", (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((m) => (m.senderId !== data.readerId ? { ...m, status: "read" } : m))
        );
      } catch {
        // Ignored
      }
    });

    return () => {
      eventSource.close();
    };
  }, [conversationId, scrollToBottom]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending || matchStatus !== "active") return;

    setIsSending(true);
    const clientMessageId = crypto.randomUUID();

    // Optimistic append
    const optimisticMessage: MessageItem = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      content: text,
      clientMessageId,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          clientMessageId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message.");
      }

      const data = await res.json();
      // Replace optimistic message with persistent message
      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMessageId ? data.message : m))
      );
    } catch (error: any) {
      alert(error.message || "Failed to deliver message.");
      // Rollback optimistic message
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
    } finally {
      setIsSending(false);
    }
  }

  async function handleUnmatch() {
    if (!partner) return;
    if (!confirm(`Are you sure you want to unmatch with ${partner.displayName}? This will end the chat permanently.`)) {
      return;
    }

    try {
      await fetch("/api/matches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: partner.id }),
      });
      router.push("/messages");
    } catch {
      alert("Failed to unmatch.");
    }
  }

  async function handleBlock() {
    if (!partner) return;
    if (!confirm(`Block ${partner.displayName}? This will immediately delete the connection and prevent future contact.`)) {
      return;
    }

    try {
      await fetch("/api/safety/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: partner.id, reason: "Member blocked from conversation" }),
      });
      router.push("/messages");
    } catch {
      alert("Failed to block member.");
    }
  }

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col bg-surface-950 px-2 sm:px-4 py-2">
      {/* Partner Header */}
      <div className="flex items-center justify-between border-b border-surface-800 bg-surface-900/90 px-4 py-3 rounded-2xl mb-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-surface-400 hover:text-white transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </Link>

          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-surface-950 border border-surface-700">
            {partner?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.photoUrl} alt={partner.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-surface-400">
                {partner?.displayName?.[0] || "?"}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{partner?.displayName}</span>
              {partner?.computedAge && (
                <span className="text-surface-400 font-normal">{partner.computedAge}</span>
              )}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-surface-400">
              {partner?.locationCity && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3 text-brand-400" />
                  {partner.locationCity}
                </span>
              )}
              {matchStatus === "active" ? (
                <span className="text-emerald-400">&bull; Match Active</span>
              ) : (
                <span className="text-red-400">&bull; Match Ended</span>
              )}
            </div>
          </div>
        </div>

        {/* Safety Actions */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBlock}
            className="text-surface-400 hover:text-red-400 h-8 px-2"
            title="Block Member"
          >
            <Shield className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUnmatch}
            className="text-surface-400 hover:text-amber-400 h-8 px-2"
            title="Unmatch"
          >
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto space-y-3 px-2 py-4">
        {isLoading && (
          <div className="flex h-full items-center justify-center text-xs text-surface-500">
            Loading conversation history...
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="rounded-full bg-brand-500/10 p-3 text-brand-400">
              <Heart className="h-6 w-6 fill-current" />
            </div>
            <h4 className="text-sm font-bold text-white">Mutual Match Formed</h4>
            <p className="text-xs text-surface-400 max-w-xs">
              Say hello to {partner?.displayName}! Ask about their passions or respond to a prompt to start an authentic conversation.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isSender = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                  isSender
                    ? "bg-brand-600 text-white rounded-br-xs"
                    : "bg-surface-800 text-surface-100 rounded-bl-xs"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-surface-500 mt-1 px-1">
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {isSender && (
                  <span>
                    {msg.status === "read" ? (
                      <CheckCheck className="h-3 w-3 text-brand-400 inline" />
                    ) : (
                      <Check className="h-3 w-3 text-surface-400 inline" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Ended Match Banner or Input Bar */}
      {matchStatus !== "active" ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-300">
          This match has ended. Messaging is disabled.
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-surface-800">
          <input
            type="text"
            placeholder={`Message ${partner?.displayName || "connection"}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 rounded-xl border border-surface-700 bg-surface-900 px-4 py-3 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
          />
          <Button type="submit" size="md" disabled={!inputText.trim() || isSending} className="gap-1.5 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
