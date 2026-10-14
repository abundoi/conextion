"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, Heart, Search, Compass, Shield, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConversationItem {
  id: string;
  matchId: string;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    status: string;
  } | null;
  partner: {
    id: string;
    displayName: string;
    computedAge: number;
    locationCity: string | null;
    relationshipIntent: string;
    photoUrl: string | null;
  };
}

export default function MessagesInboxPage() {
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchConversations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Handle gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter((c) =>
    c.partner.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>Conversations</span>
            <span className="rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs font-bold text-brand-300">
              {conversations.length}
            </span>
          </h1>
          <p className="text-xs text-surface-400 mt-1">
            Private, secure conversations with your mutual connections.
          </p>
        </div>
        <Link href="/discovery">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Compass className="h-4 w-4" /> Discover
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      {conversations.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <input
            type="text"
            placeholder="Search conversations by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-surface-800 bg-surface-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-surface-500 focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-20 animate-pulse border-surface-800 bg-surface-900/60" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && conversations.length === 0 && (
        <Card className="border-surface-800 bg-surface-900/60 p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Conversations Yet</h3>
          <p className="text-xs text-surface-400 max-w-sm mx-auto">
            When you match with someone, you can start a conversation here. Visit Discovery to connect with people who share your intent.
          </p>
          <div className="pt-2">
            <Link href="/discovery">
              <Button className="gap-2">
                <Heart className="h-4 w-4 fill-current" /> Start Connecting
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Conversations List */}
      {!isLoading && filteredConversations.length > 0 && (
        <div className="space-y-2">
          {filteredConversations.map((item) => (
            <Link key={item.id} href={`/messages/${item.id}`} className="block">
              <Card className="border-surface-800 bg-surface-900/80 hover:bg-surface-800/60 hover:border-surface-700 transition-all p-4">
                <div className="flex items-center gap-4">
                  {/* Partner Avatar */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-950 border border-surface-700">
                    {item.partner.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.partner.photoUrl}
                        alt={item.partner.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-surface-600">
                        {item.partner.displayName[0]}
                      </div>
                    )}
                  </div>

                  {/* Conversation Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-base font-bold text-white truncate">
                        {item.partner.displayName}, {item.partner.computedAge}
                      </h4>
                      {item.lastMessageAt && (
                        <span className="text-[11px] text-surface-500 shrink-0 ml-2">
                          {new Date(item.lastMessageAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-surface-400 truncate">
                      {item.lastMessage ? item.lastMessage.content : "No messages yet. Say hello!"}
                    </p>
                  </div>

                  {/* Unread Counter Badge */}
                  {item.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white shadow-md shadow-brand-500/30">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
