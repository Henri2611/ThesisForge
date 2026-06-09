"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { GitBranch, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await api.signup({ email: email.trim(), password, name: name.trim() || undefined });
      setToken(res.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubOAuth = async () => {
    setOauthLoading(true);
    setError("");
    window.location.href = `${API_BASE}/api/v1/auth/github/login?state=signup`;
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center px-4">
      <div className="w-full rounded-lg border border-border bg-card p-8 shadow-card">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(90deg, #5B3DF5, #6D5EF7)' }}
          >
            <GitBranch className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-text-primary">Create an account</h1>
          <p className="mt-1 text-sm text-text-muted">Get started with ThesisForge</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-error/30 bg-error-bg px-3 py-2.5 text-sm text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGithubOAuth}
          disabled={oauthLoading}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium text-text-primary transition-all hover:bg-secondary-surface disabled:opacity-50"
        >
          {oauthLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitBranch className="h-4 w-4" />
          )}
          Sign up with GitHub
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-text-muted">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Name</label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 transition-colors focus-within:border-primary/40">
              <User className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="h-10 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Email</label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 transition-colors focus-within:border-primary/40">
              <Mail className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Password</label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 transition-colors focus-within:border-primary/40">
              <Lock className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-10 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="shrink-0 text-text-muted hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} className="mt-2 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
