"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, RepoResponse, FileNode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Dialog } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Loader2,
  FileText,
  BookOpen,
  X,
  Copy,
  Check,
  AlertCircle,
  File,
  Folder,
  GitBranch,
  ListTree,
  Code2,
  GitMerge,
  Settings2,
  Globe,
  BookMarked,
  Trash2,
} from "lucide-react";

type TabId = "overview" | "filetree" | "intelligence" | "dependencies" | "settings";

const tabs: { id: TabId; label: string; icon: typeof Globe }[] = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "filetree", label: "File Tree", icon: ListTree },
  { id: "intelligence", label: "Code Intelligence", icon: Code2 },
  { id: "dependencies", label: "Dependencies", icon: GitMerge },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export default function RepoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const decodedId = decodeURIComponent(id || "");
  const [tab, setTab] = useState<TabId>("overview");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [readme, setReadme] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const { data: repo, isLoading, error } = useQuery({
    queryKey: ["repo", decodedId],
    queryFn: () => api.getRepoTree(decodedId),
    enabled: !!decodedId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "indexing") return 3000;
      return false;
    },
    retry: false,
  });

  const generateDocs = useMutation({
    mutationFn: () => api.generateDocs(decodedId),
    onSuccess: (doc) => {
      router.push(`/docs/${encodeURIComponent(doc.id)}`);
    },
  });

  const generateReadme = useMutation({
    mutationFn: () => api.generateReadme(decodedId),
    onSuccess: (res) => setReadme(res.readme),
  });

  const deleteRepo = useMutation({
    mutationFn: () => api.deleteRepo(decodedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      router.push("/");
    },
  });

  const { data: fileAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ["file-analysis", decodedId, selectedFileId],
    queryFn: () => api.getFileAnalysis(decodedId, selectedFileId!),
    enabled: !!selectedFileId,
    retry: false,
  });

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setTab("intelligence");
  };

  const toggleFile = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCopyReadme = () => {
    if (!readme) return;
    navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </Card>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-sm text-error">
          {error instanceof Error ? error.message : "Repository not found"}
        </p>
        <Button variant="secondary" onClick={() => router.push("/repos")}>
          Back to repositories
        </Button>
      </div>
    );
  }

  const filesByDir = groupByDirectory(repo.files);

  return (
    <div className="flex flex-col gap-6">
      {/* README Dialog */}
      <Dialog
        open={!!readme}
        onClose={() => { setReadme(null); setCopied(false); }}
        title="README.md"
        icon={<BookMarked className="h-4 w-4 text-primary" />}
        className="max-w-3xl"
      >
        <div className="flex items-center justify-end gap-1 mb-4">
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopyReadme}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-primary prose-pre:bg-sidebar prose-pre:text-sidebar-text-active">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {readme || ""}
          </ReactMarkdown>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Repository"
        icon={<AlertCircle className="h-4 w-4 text-error" />}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{repo.full_name}</strong>?
            This will permanently remove all files, documents, and data associated
            with this repository.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={deleteRepo.isPending}
              onClick={() => deleteRepo.mutate()}
              className="bg-error hover:bg-error/90"
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Repository Header */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-bg">
                <GitBranch className="h-5 w-5" style={{ color: "#5B3DF5" }} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-text-primary">
                  {repo.full_name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted sm:gap-3">
                  <span>{repo.files.length} files</span>
                  <span className="h-1 w-1 rounded-full bg-divider" />
                  <StatusBadge status={repo.status} />
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                icon={BookOpen}
                loading={generateReadme.isPending}
                onClick={() => generateReadme.mutate()}
                className="w-full justify-center sm:w-auto"
              >
                README
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FileText}
                loading={generateDocs.isPending}
                onClick={() => generateDocs.mutate()}
                className="w-full justify-center sm:w-auto"
              >
                {generateDocs.isPending ? "Generating..." : "Generate Docs"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full justify-center sm:w-auto text-error hover:bg-error-bg"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-divider px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              )}
              style={
                isActive ? { borderBottomColor: "#5B3DF5" } : undefined
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <>
        {repo.status === "failed" && repo.last_error && (
          <div className="rounded-lg border border-error/30 bg-error-bg p-4 text-sm">
            <p className="font-medium text-error flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-4 w-4" />
              Ingestion failed
            </p>
            <p className="text-text-secondary">{repo.last_error}</p>
            <p className="mt-2 text-text-muted text-xs">
              Make sure your GitHub token has <code className="text-error">repo</code> scope.
              You can update it on the{" "}
              <Link href="/" className="text-primary hover:text-primary-hover">Dashboard</Link>.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-text-primary">
                Repository Info
              </h3>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Status</span>
                  <StatusBadge status={repo.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Files</span>
                  <span className="text-text-primary">
                    {repo.files.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Languages</span>
                  <span className="text-text-primary">
                    {[
                      ...new Set(
                        repo.files.map((f) => f.language).filter(Boolean)
                      ),
                    ]
                      .slice(0, 5)
                      .join(", ") || "Various"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-text-primary">
                Actions
              </h3>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="outline"
                  icon={BookOpen}
                  loading={generateReadme.isPending}
                  onClick={() => generateReadme.mutate()}
                >
                  Generate README
                </Button>
                <Button
                  variant="primary"
                  icon={FileText}
                  loading={generateDocs.isPending}
                  onClick={() => generateDocs.mutate()}
                >
                  Generate Documentation
                </Button>
              </div>
            </div>
          </Card>
        </div>
        </>
      )}

      {tab === "filetree" && (
        <Card>
          <div className="p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              File Explorer
            </h3>
            <div className="rounded-lg border border-border">
              {Object.entries(filesByDir).map(([dir, files]) => (
                <div key={dir}>
                  <div className="flex items-center gap-2 border-b border-divider bg-secondary-surface px-4 py-2">
                    <Folder className="h-3.5 w-3.5" style={{ color: "#94A3B8" }} />
                    <span className="text-xs font-medium text-text-secondary">
                      {dir || "/"}
                    </span>
                  </div>
                  {files.map((file) => (
                    <FileRow
                      key={file.path}
                      file={file}
                      expanded={expanded}
                      onToggle={toggleFile}
                      onAnalyze={handleSelectFile}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {tab === "intelligence" && (
        <Card>
          <div className="p-6">
            {!selectedFileId ? (
              <>
                <h3 className="text-sm font-semibold text-text-primary">
                  Code Intelligence
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Select a file from the File Tree tab to view its code analysis.
                </p>
              </>
            ) : analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin mb-3" />
                <p className="text-sm">Loading file analysis...</p>
              </div>
            ) : fileAnalysis ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {fileAnalysis.path}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                      <StatusBadge status={fileAnalysis.language || "unknown"} />
                      <span>{formatSize(fileAnalysis.size)}</span>
                      <span>{fileAnalysis.symbols.length} symbols</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFileId(null)}
                    className="shrink-0 text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    Clear
                  </button>
                </div>

                {fileAnalysis.summary && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-medium text-text-muted mb-1">Summary</p>
                    <p className="text-sm text-text-primary">{fileAnalysis.summary}</p>
                  </div>
                )}

                {fileAnalysis.symbols.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Symbols</p>
                    <div className="rounded-lg border border-border">
                      {fileAnalysis.symbols.map((sym, i) => {
                        const kindColors: Record<string, string> = {
                          function: "text-info", method: "text-info",
                          class: "text-primary", struct: "text-primary",
                          interface: "text-success", import: "text-text-muted",
                        };
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 border-b border-divider px-3 py-1.5 last:border-0 font-mono text-xs"
                          >
                            <span className={cn("w-14 shrink-0", kindColors[sym.kind] || "text-text-muted")}>
                              {sym.kind}
                            </span>
                            <span style={{ color: "#4F46E5" }}>{sym.name}</span>
                            <span className="text-text-muted ml-auto">L{sym.line}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {fileAnalysis.content && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Source Code</p>
                    <div className="overflow-x-auto rounded-lg border border-border bg-sidebar p-4">
                      <pre className="text-xs leading-relaxed text-sidebar-text-active font-mono whitespace-pre-wrap">
                        {fileAnalysis.content}
                      </pre>
                    </div>
                  </div>
                )}

                {!fileAnalysis.content && !fileAnalysis.summary && fileAnalysis.symbols.length === 0 && (
                  <p className="text-sm text-text-muted py-4 text-center">
                    No analysis data available for this file.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-error">Failed to load file analysis.</p>
            )}
          </div>
        </Card>
      )}

      {(tab === "dependencies" || tab === "settings") && (
        <Card>
          <div className="p-6">
            <h3 className="text-sm font-semibold text-text-primary capitalize">
              {tab}
            </h3>
            <p className="mt-2 text-sm text-text-muted">Coming soon.</p>
          </div>
        </Card>
      )}

      {generateReadme.isError && (
        <div className="rounded-lg border border-error/30 bg-error-bg p-4 text-sm text-error">
          {generateReadme.error instanceof Error
            ? generateReadme.error.message
            : "README generation failed"}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  expanded,
  onToggle,
  onAnalyze,
}: {
  file: FileNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onAnalyze: (fileId: string) => void;
}) {
  const isExpanded = expanded.has(file.path);
  const hasSymbols = file.symbols.length > 0;
  const filename = file.path.split("/").pop() || file.path;

  const kindColors: Record<string, string> = {
    function: "text-info",
    method: "text-info",
    class: "text-primary",
    struct: "text-primary",
    interface: "text-success",
    import: "text-text-muted",
  };

  return (
    <div>
      <button
        onClick={() => onToggle(file.path)}
        className="flex w-full items-center gap-3 border-b border-divider px-4 py-2 text-left hover:bg-purple-bg transition-colors"
      >
        <File
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "#CBD5E1" }}
        />
        <span className="font-mono text-xs text-text-primary">{filename}</span>
        {file.summary && (
          <span className="hidden truncate text-xs text-text-muted sm:inline ml-2">
            → {file.summary}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {file.language && (
            <span className="rounded bg-secondary-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              {file.language}
            </span>
          )}
          <span className="text-[11px] text-text-muted">
            {formatSize(file.size)}
          </span>
          {hasSymbols && (
            <span className="text-[11px] text-text-muted">
              {file.symbols.length} sym
            </span>
          )}
          <span
            onClick={(e) => { e.stopPropagation(); onAnalyze(file.id); }}
            className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-purple-bg"
          >
            Analyze
          </span>
        </span>
      </button>
      {isExpanded && hasSymbols && (
        <div className="border-b border-divider px-4 py-1 bg-purple-bg">
          {file.symbols.map((sym, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-0.5 font-mono text-[11px]"
            >
              <span
                className={cn(
                  "w-14 shrink-0",
                  kindColors[sym.kind] || "text-text-muted"
                )}
              >
                {sym.kind}
              </span>
              <span style={{ color: "#4F46E5" }}>{sym.name}</span>
              <span className="text-text-muted">L{sym.line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDirectory(files: FileNode[]): Record<string, FileNode[]> {
  const groups: Record<string, FileNode[]> = {};
  for (const file of files) {
    const parts = file.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(file);
  }
  return groups;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
