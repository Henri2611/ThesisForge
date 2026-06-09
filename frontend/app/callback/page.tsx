"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Completing authentication...");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    if (token) {
      setToken(token);
      setStatus("success");
      setMessage("Authentication successful! Redirecting...");
      setTimeout(() => router.push("/"), 1000);
    } else {
      const code = searchParams.get("code");
      if (code) {
        setStatus("loading");
        setMessage("Processing authorization...");
      } else {
        setStatus("error");
        setMessage("No authorization data received");
      }
    }
  }, [searchParams, router]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col items-center justify-center px-4">
      <div className="w-full rounded-lg border border-border bg-card p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-text-muted">{message}</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-text-primary">{message}</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-bg">
                <AlertCircle className="h-6 w-6 text-error" />
              </div>
              <p className="text-sm text-error">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
