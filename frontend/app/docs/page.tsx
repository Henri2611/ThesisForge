"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { FileText, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function DocsPage() {
  const router = useRouter();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["docs"],
    queryFn: api.listDocs,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-lg font-semibold text-text-primary mb-6">Documents</h1>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasDocs = docs.length > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">Documents</h1>
      <p className="mt-1 text-sm text-text-secondary">
        All your generated documentation.
      </p>

      {hasDocs ? (
        <div className="mt-6 flex flex-col gap-3">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() =>
                router.push(`/docs/${encodeURIComponent(doc.id)}`)
              }
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-all hover:bg-secondary-surface"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-bg">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {doc.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  <StatusBadge status={doc.status} />
                  {doc.created_at && (
                    <>
                      {" — "}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-text-muted/40 mb-3" />
            <p className="text-sm text-text-muted">
              No documents yet. Import a repository and generate documentation.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => router.push("/repos/import")}
            >
              Import Repository
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
