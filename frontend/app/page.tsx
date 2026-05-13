"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToken, setToken, clearToken } from "@/lib/api";

export default function Home() {
  const [apiStatus, setApiStatus] = useState("checking...");
  const [tokenInput, setTokenInput] = useState("");
  const [savedToken, setSavedToken] = useState("");

  useEffect(() => {
    setSavedToken(getToken());
    fetch("http://localhost:8000/api/v1/health")
      .then((r) => r.json())
      .then((d) => setApiStatus(d.status))
      .catch(() => setApiStatus("offline"));
  }, []);

  const handleSaveToken = () => {
    setToken(tokenInput);
    setSavedToken(tokenInput);
    setTokenInput("");
  };

  const handleClearToken = () => {
    clearToken();
    setSavedToken("");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold tracking-tight">ThesisForge</h1>
      <p className="mt-3 text-lg text-gray-500">AI-powered documentation platform</p>

      <div className="mt-8 w-full max-w-sm rounded-lg border border-neutral-200 p-4">
        <label className="text-sm font-medium">GitHub Personal Access Token</label>
        {savedToken ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-green-600">Token saved</span>
            <button onClick={handleClearToken} className="text-xs text-red-500 hover:underline">
              Clear
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_..."
              className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <button
              onClick={handleSaveToken}
              disabled={!tokenInput}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          href="/repos"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          My Repositories
        </Link>
        <Link
          href="/repos/import"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50"
        >
          Import Repository
        </Link>
      </div>
      <p className="mt-8 text-xs text-gray-400">API: {apiStatus}</p>
    </main>
  );
}
