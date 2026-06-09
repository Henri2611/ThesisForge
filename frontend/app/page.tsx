"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "./components/ui/card";
import { SectionHeader } from "./components/ui/section-header";
import { StatusBadge } from "./components/ui/status-badge";
import { MetricCard } from "./components/ui/metric-card";
import { Toast } from "./components/ui/toast";
import {
  FolderGit2,
  FileText,
  Download,
  Plus,
  ArrowRight,
  GitBranch,
  Key,
  Check,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { api } from "@/lib/api";

function MetricSkeleton() {
  return (
    <div className="flex h-[104px] flex-col justify-between rounded-lg border border-border bg-card p-6 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-divider" />
        <div className="h-3 w-24 rounded bg-divider" />
      </div>
      <div className="h-8 w-16 rounded bg-divider" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("access_token"));
  }, []);
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [tokenValidating, setTokenValidating] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    retry: false,
    enabled: isAuthenticated === true,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: api.getDashboardMetrics,
    retry: false,
    enabled: isAuthenticated === true,
  });

  const { data: repos = [] } = useQuery({
    queryKey: ["repos"],
    queryFn: api.listRepos,
    retry: false,
    enabled: isAuthenticated === true,
  });

  const recentRepos = repos.slice(0, 5);
  const githubConnected = user?.has_github_token && user?.github_login;

  if (isAuthenticated === null) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {!isAuthenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(90deg, #5B3DF5, #6D5EF7)' }}
          >
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">You are signed out</h2>
          <p className="mt-2 text-sm text-text-muted">Sign in to access your repositories and documents.</p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-accent-violet px-6 text-sm font-medium text-white transition-all hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-6 text-sm font-medium text-text-secondary transition-all hover:bg-secondary-surface"
            >
              Sign up
            </Link>
          </div>
        </div>
      ) : (
      <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Overview of your workspace and generations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metricsLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Repositories Indexed"
              value={metrics?.repositories_indexed ?? 0}
              icon={FolderGit2}
            />
            <MetricCard
              label="Documents Generated"
              value={metrics?.documents_generated ?? 0}
              icon={FileText}
            />
            <MetricCard
              label="Export Count"
              value={metrics?.export_count ?? 0}
              icon={Download}
            />
          </>
        )}
      </div>

      <Card>
        <div className="p-6">
          <SectionHeader
            title="Recent Repositories"
            action={
              <Link
                href="/repos/import"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Import
              </Link>
            }
          />
          <div className="mt-3 flex flex-col">
            {recentRepos.length === 0 ? (
              <div className="py-8 text-center">
                <FolderGit2 className="mx-auto h-8 w-8 text-text-muted/40 mb-2" />
                <p className="text-sm text-text-muted">
                  No repositories imported yet.
                </p>
                <Link
                  href="/repos/import"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Import your first repository
                </Link>
              </div>
            ) : (
              recentRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() =>
                    router.push(`/repos/${encodeURIComponent(repo.id)}`)
                  }
                  className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-secondary-surface transition-colors"
                >
                  <FolderGit2 className="h-4 w-4 shrink-0 text-text-muted" />
                  <span className="flex-1 truncate text-sm font-medium text-text-primary">
                    {repo.full_name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {repo.files_count} files
                  </span>
                  <StatusBadge status={repo.status} />
                </button>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-text-muted" />
              GitHub Connection
            </h3>
            {githubConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                <Check className="h-3 w-3" />
                {user?.github_login}
              </span>
            ) : (
              <span className="text-xs text-text-muted">Not connected</span>
            )}
          </div>
          {githubConnected && !showTokenInput ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-text-muted">
                Connected as <span className="font-medium text-text-primary">{user?.github_login}</span>.
                Your GitHub token is stored securely and used to clone repositories.
              </p>
              <button
                type="button"
                onClick={() => setShowTokenInput(true)}
                className="shrink-0 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Update token
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-input px-3 transition-colors focus-within:border-primary/40">
                <Key className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setTokenError("");
                    setShowTokenInput(true);
                  }}
                  placeholder="ghp_..."
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                {githubConnected && (
                  <button
                    type="button"
                    onClick={() => { setShowTokenInput(false); setTokenInput(""); setTokenError(""); }}
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-text-secondary transition-all hover:bg-secondary-surface"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={tokenValidating || !tokenInput.trim()}
                  onClick={async () => {
                    if (!isAuthenticated) {
                      setTokenError("Please sign in first to save a GitHub token");
                      return;
                    }
                    setTokenValidating(true);
                    setTokenError("");
                    try {
                      const data = await api.storeGithubToken(tokenInput.trim());
                      if (data.valid) {
                        setTokenSaved(true);
                        setTokenInput("");
                        setShowTokenInput(false);
                        setToastMessage(`GitHub connected as ${data.login}`);
                        setShowToast(true);
                        queryClient.invalidateQueries({ queryKey: ["me"] });
                        setTimeout(() => setTokenSaved(false), 2000);
                      }
                    } catch (err) {
                      setTokenError(err instanceof Error ? err.message : "Failed to store token");
                    } finally {
                      setTokenValidating(false);
                    }
                  }}
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-accent-violet px-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {tokenValidating ? (
                    "Validating..."
                  ) : tokenSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Saved
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          )}
          {tokenError && (
            <p className="mt-2 flex items-center gap-1 text-xs text-error">
              <AlertCircle className="h-3 w-3" />
              {tokenError}
            </p>
          )}
          <p className="mt-2 text-xs text-text-muted">
            {githubConnected
              ? "Your GitHub token is stored securely on the server."
              : "Paste a GitHub personal access token to enable repository cloning. Create one at "}
            {!githubConnected && (
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary-hover"
              >
                GitHub Settings
              </a>
            )}
            {!githubConnected && "."}
          </p>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <SectionHeader title="Quick Actions" />
          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Link
              href="/repos/import"
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-accent-violet px-4 text-sm font-medium text-white transition-all hover:opacity-90 no-underline"
            >
              <Plus className="h-4 w-4" />
              Import Repository
            </Link>
            <Link
              href="/repos"
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-primary transition-all hover:bg-purple-bg no-underline"
            >
              <FolderGit2 className="h-4 w-4" />
              Browse Repositories
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      <Toast
        message={toastMessage}
        visible={showToast}
        onClose={() => setShowToast(false)}
      />
      </>
      )}
    </div>
  );
}
