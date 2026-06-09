const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token") || localStorage.getItem("github_token") || "";
  }
  return "";
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("github_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("github_token");
}

export function hasAuthToken(): boolean {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("access_token");
  }
  return false;
}

export function getGithubToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("github_token") || "";
  }
  return "";
}

export function setGithubToken(token: string) {
  localStorage.setItem("github_token", token);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  const isFormData = options?.body instanceof FormData;
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Symbol {
  name: string;
  kind: string;
  line: number;
}

export interface FileNode {
  id: string;
  path: string;
  language: string | null;
  size: number;
  symbols: Symbol[];
  summary: string | null;
}

export interface FileAnalysis {
  id: string;
  path: string;
  language: string | null;
  size: number;
  summary: string | null;
  symbols: Symbol[];
  content: string;
}

export interface RepoResponse {
  id: string;
  full_name: string;
  status: string;
  files: FileNode[];
  last_error?: string | null;
}

export interface StatusResponse {
  id: string;
  status: string;
  files_count: number;
  last_error?: string | null;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface RepoListItem {
  id: string;
  full_name: string;
  status: string;
  files_count: number;
  created_at: string;
  last_error?: string | null;
}

export interface Template {
  id: string;
  name: string;
  organization: string;
  description: string;
  tags: string[];
  format: string;
  is_global?: boolean;
}

export interface DocResponse {
  id: string;
  title: string;
  status: string;
  repo_id: string;
  created_at: string;
  chapters: Chapter[];
}

export const api = {
  health: () => request<{ status: string }>("/api/v1/health"),

  listRepos: () =>
    request<RepoListItem[]>("/api/v1/repos"),

  importRepo: (githubUrl: string) =>
    request<RepoResponse>("/api/v1/repos/import", {
      method: "POST",
      body: JSON.stringify({ github_url: githubUrl }),
    }),

  getRepoStatus: (repoId: string) =>
    request<StatusResponse>(`/api/v1/repos/${encodeURIComponent(repoId)}/status`),

  deleteRepo: (repoId: string) =>
    request<{ id: string; deleted: boolean }>(`/api/v1/repos/${encodeURIComponent(repoId)}`, {
      method: "DELETE",
    }),

  getRepoTree: (repoId: string) =>
    request<RepoResponse>(`/api/v1/repos/${encodeURIComponent(repoId)}/tree`),

  getFileAnalysis: (repoId: string, fileId: string) =>
    request<FileAnalysis>(`/api/v1/repos/${encodeURIComponent(repoId)}/file-analysis/${encodeURIComponent(fileId)}`),

  generateDocs: (repoId: string) =>
    request<DocResponse>("/api/v1/docs/generate", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId }),
    }),

  getDoc: (docId: string) =>
    request<DocResponse>(`/api/v1/docs/${encodeURIComponent(docId)}`),

  cancelDoc: (docId: string) =>
    request<{ id: string; status: string }>(`/api/v1/docs/${encodeURIComponent(docId)}/cancel`, {
      method: "POST",
    }),

  regenerateDoc: (docId: string) =>
    request<{ id: string; repo_id: string; status: string }>(`/api/v1/docs/${encodeURIComponent(docId)}/regenerate`, {
      method: "POST",
    }),

  generateReadme: (repoId: string) =>
    request<{ readme: string }>(`/api/v1/repos/${encodeURIComponent(repoId)}/readme`, {
      method: "POST",
    }),

  updateChapter: (docId: string, chapterId: string, data: { content?: string; title?: string }) =>
    request<Chapter>(`/api/v1/docs/${encodeURIComponent(docId)}/chapters/${encodeURIComponent(chapterId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listTemplates: () =>
    request<Template[]>("/api/v1/templates"),

  getTemplate: (templateId: string) =>
    request<Template>(`/api/v1/templates/${encodeURIComponent(templateId)}`),

  createExport: (docId: string, format: string = "DOCX", templateId?: string) =>
    request<{ id: string; status: string; format: string }>(
      `/api/v1/docs/${encodeURIComponent(docId)}/export`,
      {
        method: "POST",
        body: JSON.stringify({ format, template_id: templateId }),
      }
    ),

  listExports: (docId: string) =>
    request<
      { id: string; format: string; status: string; error?: string; created_at: string }[]
    >(`/api/v1/docs/${encodeURIComponent(docId)}/exports`),

  getExportStatus: (docId: string, exportId: string) =>
    request<{ id: string; status: string; error?: string }>(
      `/api/v1/docs/${encodeURIComponent(docId)}/exports/${encodeURIComponent(exportId)}/status`
    ),

  getExportDownloadUrl: (docId: string, exportId: string) =>
    `${API_BASE}/api/v1/docs/${encodeURIComponent(docId)}/exports/${encodeURIComponent(exportId)}/download`,

  signup: (data: { email: string; password: string; name?: string }) =>
    request<{ access_token: string; user_id: string; email: string; name?: string; github_login?: string; has_github_token?: boolean }>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user_id: string; email: string; name?: string; github_login?: string; has_github_token?: boolean }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () =>
    request<{ id: string; email: string; name: string | null; avatar_url: string | null; github_login?: string; has_github_token?: boolean }>("/api/v1/auth/me"),

  storeGithubToken: (token: string) =>
    request<{ valid: boolean; login: string; avatar_url: string }>("/api/v1/auth/store-github-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  getDashboardMetrics: () =>
    request<{ repositories_indexed: number; documents_generated: number; export_count: number }>("/api/v1/dashboard/metrics"),

  listDocs: () =>
    request<{ id: string; title: string; status: string; repo_id: string; created_at: string | null }[]>("/api/v1/docs"),

  createUserTemplate: (data: FormData) =>
    request<Template>("/api/v1/templates", {
      method: "POST",
      body: data,
    }).catch((e) => { throw e; }),

  deleteTemplate: (templateId: string) =>
    request<void>(`/api/v1/templates/${encodeURIComponent(templateId)}`, { method: "DELETE" }),

  getDependencies: (repoId: string) =>
    request<{ nodes: { id: string; label: string }[]; edges: { source: string; target: string; type: string }[] }>(
      `/api/v1/repos/${encodeURIComponent(repoId)}/dependencies`
    ),
};
