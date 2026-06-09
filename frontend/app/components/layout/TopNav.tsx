"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { api, RepoListItem } from "@/lib/api";

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RepoListItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const repos = await api.listRepos();
        const filtered = repos.filter(
          (r) =>
            r.full_name.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered.slice(0, 6));
        setOpen(filtered.length > 0);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navigate = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/repos/${encodeURIComponent(id)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-secondary-surface hover:text-text-primary lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="relative min-w-0 flex-1 sm:max-w-sm lg:w-72 lg:flex-none" ref={ref}>
        <div className="flex items-center gap-2 rounded-md border border-border bg-input px-3 py-0 transition-colors focus-within:border-primary/40">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="h-8 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border bg-card shadow-lg overflow-hidden">
            {results.map((repo) => (
              <button
                key={repo.id}
                onClick={() => navigate(repo.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary-surface transition-colors"
              >
                <span className="flex-1 truncate text-sm font-medium text-text-primary">
                  {repo.full_name}
                </span>
                <span className="shrink-0 text-xs text-text-muted">{repo.files_count} files</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <button className="text-text-muted hover:text-text-secondary transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-3 border-l border-border pl-4 sm:flex">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: 'linear-gradient(90deg, #5B3DF5, #6D5EF7)' }}
          >
            D
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </div>
      </div>
    </header>
  );
}
