const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("github_token") || "";
  }
  return "";
}

export function setToken(token: string) {
  localStorage.setItem("github_token", token);
}

export function clearToken() {
  localStorage.removeItem("github_token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export interface Symbol {
  name: string;
  kind: string;
  line: number;
}

export interface FileNode {
  path: string;
  language: string | null;
  size: number;
  symbols: Symbol[];
  summary: string | null;
}

export interface RepoResponse {
  id: string;
  full_name: string;
  status: string;
  files: FileNode[];
}

export interface StatusResponse {
  id: string;
  status: string;
  files_count: number;
}

export interface Chapter {
  title: string;
  content: string;
  order: number;
}

export interface DocResponse {
  id: string;
  repo_id: string;
  chapters: Chapter[];
}

export const api = {
  health: () => request<{ status: string }>("/api/v1/health"),

  importRepo: (githubUrl: string) =>
    request<RepoResponse>("/api/v1/repos/import", {
      method: "POST",
      body: JSON.stringify({ github_url: githubUrl }),
    }),

  getRepoStatus: (repoId: string) =>
    request<StatusResponse>(`/api/v1/repos/${encodeURIComponent(repoId)}/status`),

  getRepoTree: (repoId: string) =>
    request<RepoResponse>(`/api/v1/repos/${encodeURIComponent(repoId)}/tree`),

  generateDocs: (repoId: string) =>
    request<DocResponse>("/api/v1/docs/generate", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId }),
    }),

  getDoc: (docId: string) =>
    request<DocResponse>(`/api/v1/docs/${encodeURIComponent(docId)}`),
};
