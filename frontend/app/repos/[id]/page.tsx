"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, RepoResponse, FileNode } from "@/lib/api";

export default function RepoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [repo, setRepo] = useState<RepoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    if (!id) return;

    const decodedId = decodeURIComponent(id);

    const fetchRepo = () => {
      api.getRepoTree(decodedId)
        .then((data) => {
          setRepo(data);
          setError(null);
          
          // If the repo is still indexing, poll again in 3 seconds
          if (data.status === "pending" || data.status === "indexing") {
            setTimeout(fetchRepo, 3000);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    };

    fetchRepo();
  }, [id]);

  const toggleFile = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleExplain = async () => {
    if (!repo) return;
    setExplaining(true);
    try {
      const doc = await api.generateDocs(repo.id);
      router.push(`/docs/${encodeURIComponent(doc.id)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setExplaining(false);
    }
  };

  const kindColors: Record<string, string> = {
    function: "text-blue-600",
    method: "text-blue-600",
    class: "text-purple-600",
    struct: "text-purple-600",
    interface: "text-teal-600",
    import: "text-green-600",
    variable: "text-amber-600",
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-gray-500">Loading repository data...</p>
      </main>
    );
  }

  if (error || !repo) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-red-500">{error || "Repository not found"}</p>
      </main>
    );
  }

  const filesByDir = groupByDirectory(repo.files);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{repo.full_name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Status: {repo.status} &middot; {repo.files.length} files
          </p>
        </div>
        <button
          onClick={handleExplain}
          disabled={explaining}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {explaining ? "Generating..." : "Generate Documentation"}
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200">
        {Object.entries(filesByDir).map(([dir, files]) => (
          <div key={dir}>
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700">
              {dir || "/"}
            </div>
            {files.map((file) => (
              <FileRow key={file.path} file={file} expanded={expanded} onToggle={toggleFile} kindColors={kindColors} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

function FileRow({
  file,
  expanded,
  onToggle,
  kindColors,
}: {
  file: FileNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  kindColors: Record<string, string>;
}) {
  const isExpanded = expanded.has(file.path);
  const hasSymbols = file.symbols.length > 0;
  const filename = file.path.split("/").pop() || file.path;

  return (
    <div>
      <button
        onClick={() => onToggle(file.path)}
        className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-2 text-left hover:bg-neutral-50"
      >
        <span className="text-gray-400">{isExpanded ? "▾" : "▸"}</span>
        <span className="font-mono text-sm">{filename}</span>
        {file.summary && <span className="ml-2 text-xs text-neutral-500 truncate max-w-md">→ {file.summary}</span>}
        <span className="ml-auto flex items-center gap-2">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">{file.language || "?"}</span>
          <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
          {hasSymbols && <span className="text-xs text-gray-400">{file.symbols.length} symbols</span>}
        </span>
      </button>
      {isExpanded && hasSymbols && (
        <div className="border-b border-neutral-100 bg-neutral-50/50 px-8 py-1">
          {file.symbols.map((sym, i) => (
            <div key={i} className="flex items-center gap-3 py-0.5 font-mono text-xs">
              <span className={`w-16 shrink-0 ${kindColors[sym.kind] || "text-gray-500"}`}>{sym.kind}</span>
              <span className="text-gray-800">{sym.name}</span>
              <span className="text-gray-400">line {sym.line}</span>
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
