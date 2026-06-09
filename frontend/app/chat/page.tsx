"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import { MessageSquare, Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [repoId, setRepoId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: repos } = useQuery({
    queryKey: ["repos"],
    queryFn: api.listRepos,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !repoId) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/repos/${encodeURIComponent(repoId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">AI Chat</h1>
          <p className="text-sm text-text-secondary mt-1">Ask about your repository</p>
        </div>
        {repos && (
          <Select
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            options={[
              { value: "", label: "Select repo..." },
              ...repos.map((r) => ({ value: r.id, label: r.full_name })),
            ]}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-1">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <MessageSquare className="h-8 w-8 text-text-muted/40" />
            <p className="text-sm text-text-muted max-w-sm">
              Ask questions about your codebase — architecture, specific functions, or generate explanations.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-bg">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <Card className={`max-w-[75%] p-3 ${m.role === "user" ? "bg-primary/10" : ""}`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </Card>
            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-surface">
                <User className="h-4 w-4 text-text-secondary" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-bg">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <Card className="p-3">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            </Card>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={repoId ? "Ask a question..." : "Select a repository first"}
          disabled={!repoId || loading}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage} disabled={!repoId || loading || !input.trim()} icon={Send}>
          Send
        </Button>
      </div>
    </div>
  );
}
