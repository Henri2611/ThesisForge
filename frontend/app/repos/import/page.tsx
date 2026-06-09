"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { GitBranch, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("access_token"));
  }, []);

  const importMutation = useMutation({
    mutationFn: () => api.importRepo(url),
    onSuccess: (res) => router.push(`/repos/${encodeURIComponent(res.id)}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    importMutation.mutate();
  };

  if (isAuthenticated === null) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mt-6">
          <h1 className="text-lg font-semibold text-text-primary">
            Import Repository
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/repos"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to repositories
      </Link>

      <div className="mt-6">
        <h1 className="text-lg font-semibold text-text-primary">
          Import Repository
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Enter a GitHub repository URL to import and analyze.
        </p>
      </div>

      {!isAuthenticated && (
        <Card className="mt-6">
          <div className="p-6 text-center">
            <p className="text-sm text-text-muted">
              <Link href="/login" className="text-primary hover:text-primary-hover">
                Sign in
              </Link>{" "}
              first to import repositories.
            </p>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="p-6">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            icon={<GitBranch className="h-4 w-4" />}
          />
          {importMutation.isError && (
            <p className="mt-2 text-xs text-error">
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : "Import failed"}
            </p>
          )}
          <Button
            type="submit"
            loading={importMutation.isPending}
            disabled={!isAuthenticated}
            className="mt-4 w-full"
          >
            {importMutation.isPending ? "Importing and analyzing..." : "Import"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
