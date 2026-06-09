"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Mermaid } from "@/app/components/ui/mermaid";
import { Network, AlertCircle, Download } from "lucide-react";

function mermaidGraph(nodes: { id: string; label: string }[], edges: { source: string; target: string; type: string }[]) {
  const lines = ["graph TD"];
  for (const n of nodes) {
    const id = n.id.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`  ${id}["${n.label}"]`);
  }
  for (const e of edges) {
    const src = e.source.replace(/[^a-zA-Z0-9]/g, "_");
    const tgt = e.target.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`  ${src} --> ${tgt}`);
  }
  return lines.join("\n");
}

export default function DiagramsPage() {
  const [repoId, setRepoId] = useState("");

  const { data: repos } = useQuery({
    queryKey: ["repos"],
    queryFn: api.listRepos,
  });

  const { data: graph, isLoading, error } = useQuery({
    queryKey: ["dependencies", repoId],
    queryFn: () => api.getDependencies(repoId),
    enabled: !!repoId,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Diagrams</h1>
          <p className="text-sm text-text-secondary mt-1">
            Dependency graph of your repository
          </p>
        </div>
        <div className="flex items-center gap-2">
          {repos && (
            <Select
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              options={[
                { value: "", label: "Select repo..." },
                ...repos.map((r) => ({ value: r.id, label: r.full_name })),
              ]}
            />
          )}
        </div>
      </div>

      {!repoId && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Network className="h-8 w-8 text-text-muted/40" />
            <p className="text-sm text-text-muted">Select a repository to view its dependency graph</p>
          </div>
        </Card>
      )}

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-2 p-4 text-sm text-error">
            <AlertCircle className="h-4 w-4" />
            <span>{(error as Error).message}</span>
          </div>
        </Card>
      )}

      {graph && graph.nodes.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Network className="h-8 w-8 text-text-muted/40" />
            <p className="text-sm text-text-muted">No import dependencies found in this repository</p>
          </div>
        </Card>
      )}

      {graph && graph.nodes.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {graph.nodes.length} modules, {graph.edges.length} dependencies
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => {
                const blob = new Blob([mermaidGraph(graph.nodes, graph.edges)], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "dependency-graph.mermaid";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </Button>
          </div>
          <Card>
            <div className="p-4">
              <Mermaid chart={mermaidGraph(graph.nodes, graph.edges)} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
