"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Dialog } from "@/app/components/ui/dialog";
import { Select } from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Loader2,
  AlertCircle,
  FileText,
  ArrowLeft,
  RefreshCw,
  Download,
  Square,
  RotateCcw,
} from "lucide-react";
import { MarkdownEditor } from "@/app/components/ui/markdown-editor";

export default function DocPage() {
  const { doc_id } = useParams<{ doc_id: string }>();
  const decodedId = decodeURIComponent(doc_id || "");
  const queryClient = useQueryClient();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("DOCX");
  const [exportTemplate, setExportTemplate] = useState("");
  const [exportId, setExportId] = useState<string | null>(null);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["doc", decodedId],
    queryFn: () => api.getDoc(decodedId),
    enabled: !!decodedId,
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 5000 : false,
    retry: false,
  });

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
  });

  const cancelDoc = useMutation({
    mutationFn: () => api.cancelDoc(decodedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc", decodedId] });
      queryClient.invalidateQueries({ queryKey: ["docs"] });
    },
  });

  const regenerateDoc = useMutation({
    mutationFn: () => api.regenerateDoc(decodedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc", decodedId] });
      queryClient.invalidateQueries({ queryKey: ["docs"] });
    },
  });

  const createExport = useMutation({
    mutationFn: () => api.createExport(decodedId, exportFormat, exportTemplate || undefined),
    onSuccess: (res) => setExportId(res.id),
  });

  const { data: exportStatus } = useQuery({
    queryKey: ["export-status", exportId],
    queryFn: () => api.getExportStatus(decodedId, exportId!),
    enabled: !!exportId,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ||
      query.state.data?.status === "processing"
        ? 2000
        : false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl flex flex-col gap-8">
        <Skeleton className="h-4 w-32" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="h-8 w-8 text-error" />
        <p className="text-sm text-error">
          {error instanceof Error ? error.message : "Document not found"}
        </p>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const sortedChapters = [...doc.chapters].sort((a, b) => a.order - b.order);
  const isExported = exportStatus?.status === "completed";
  const isExporting =
    exportStatus?.status === "pending" || exportStatus?.status === "processing";

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/repos/${encodeURIComponent(doc.repo_id)}`}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to repository
        </Link>
        <div className="flex items-center gap-2">
          {doc.status === "generating" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-info">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                AI is writing this document...
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={Square}
                loading={cancelDoc.isPending}
                onClick={() => cancelDoc.mutate()}
              >
                Cancel
              </Button>
            </div>
          )}
          {(doc.status === "completed" || doc.status === "cancelled") && (
            <div className="flex items-center gap-2">
              {doc.status === "completed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() => setExportOpen(true)}
                >
                  Export
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                loading={regenerateDoc.isPending}
                onClick={() => regenerateDoc.mutate()}
              >
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setExportId(null);
        }}
        title="Export Document"
        icon={<Download className="h-4 w-4 text-primary" />}
      >
        {!exportId ? (
          <div className="flex flex-col gap-4">
            <Select
              label="Format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              options={[
                { value: "DOCX", label: "Microsoft Word (.docx)" },
              ]}
            />
            {templates && templates.length > 0 && (
              <Select
                label="Template (optional)"
                value={exportTemplate}
                onChange={(e) => setExportTemplate(e.target.value)}
                options={[
                  { value: "", label: "No template" },
                  ...templates.map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.organization})`,
                  })),
                ]}
              />
            )}
            <Button
              onClick={() => createExport.mutate()}
              loading={createExport.isPending}
              className="mt-2"
            >
              Start Export
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            {isExporting && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-text-muted">
                  Generating your {exportFormat} file...
                </p>
              </>
            )}
            {isExported && (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                  <Download className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-text-primary">
                  Export ready
                </p>
                <a
                  href={api.getExportDownloadUrl(decodedId, exportId)}
                  download
                >
                  <Button icon={Download}>Download {exportFormat}</Button>
                </a>
              </>
            )}
            {exportStatus?.status === "failed" && (
              <p className="text-sm text-error">
                Export failed: {exportStatus.error || "Unknown error"}
              </p>
            )}
          </div>
        )}
      </Dialog>

      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            {doc.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            Generated on{" "}
            {new Date(doc.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="h-1 w-1 rounded-full bg-divider" />
          <StatusBadge status={doc.status} />
          {doc.status === "completed" && (
            <>
              <span className="h-1 w-1 rounded-full bg-divider" />
              <span>{sortedChapters.length} chapters</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {sortedChapters.map((chapter) => (
          <section
            key={chapter.id}
            className="scroll-mt-16"
            id={`chapter-${chapter.order}`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold bg-purple-bg text-primary">
                {chapter.order}
              </div>
              <h2 className="text-base font-semibold text-text-primary">
                {chapter.title}
              </h2>
            </div>
            {!chapter.content && doc.status === "generating" ? (
              <Card>
                <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                  <Loader2 className="h-5 w-5 animate-spin mb-3" />
                  <p className="text-sm">Writing section...</p>
                </div>
              </Card>
            ) : (
              <MarkdownEditor
                content={chapter.content || ""}
                docId={decodedId}
                chapterId={chapter.id}
              />
            )}
          </section>
        ))}
        {doc.chapters.length === 0 && (
          <Card>
            <div className="p-8 text-center text-sm text-text-muted">
              {doc.status === "generating"
                ? "Analyzing codebase and preparing table of contents..."
                : "No chapters found in this document."}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
