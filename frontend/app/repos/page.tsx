"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { FolderGit2, Plus, GitBranch, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function ReposPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(!!localStorage.getItem("access_token"));
  }, []);

  const { data: repos = [], isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: api.listRepos,
    enabled: hasToken === true,
    retry: false,
  });

  if (hasToken === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">Repositories</h1>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">Repositories</h1>
        </div>
        <Card className="mt-6">
          <div className="p-8 text-center">
            <GitBranch className="mx-auto h-8 w-8 text-text-muted/40 mb-3" />
            <p className="text-sm text-text-muted">
              <Link href="/login" className="text-primary hover:text-primary-hover">
                Sign in
              </Link>{" "}
              to view your repositories.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Repositories</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your imported repositories.
          </p>
        </div>
        <Link href="/repos/import">
          <Button icon={Plus}>Import</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <Card className="mt-6">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-error mb-2" />
            <p className="text-sm text-error">
              {error instanceof Error ? error.message : "Failed to load repositories"}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {!isLoading && !error && repos.length === 0 && (
        <Card className="mt-6">
          <div className="p-8 text-center">
            <GitBranch className="mx-auto h-8 w-8 text-text-muted/40 mb-3" />
            <p className="text-sm text-text-muted">
              No repositories yet.{" "}
              <Link
                href="/repos/import"
                className="text-primary hover:text-primary-hover"
              >
                Import one
              </Link>{" "}
              to get started.
            </p>
          </div>
        </Card>
      )}

      {!isLoading && repos.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() =>
                router.push(`/repos/${encodeURIComponent(repo.id)}`)
              }
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-all hover:bg-secondary-surface"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-bg">
                <FolderGit2 className="h-4 w-4" style={{ color: "#5B3DF5" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {repo.full_name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {repo.files_count} files
                </p>
              </div>
              <StatusBadge status={repo.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
