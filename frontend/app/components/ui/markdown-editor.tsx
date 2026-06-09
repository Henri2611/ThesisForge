"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Eye, Pencil, Save, X, Loader2 } from "lucide-react";

interface MarkdownEditorProps {
  content: string;
  docId: string;
  chapterId: string;
}

export function MarkdownEditor({ content, docId, chapterId }: MarkdownEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveMutation = useMutation({
    mutationFn: (text: string) =>
      api.updateChapter(docId, chapterId, { content: text }),
  });

  useEffect(() => {
    setDraft(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Auto-save after 15s of inactivity
  const scheduleAutoSave = useCallback(
    (text: string) => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => {
        if (text !== content) saveMutation.mutate(text);
      }, 15_000);
    },
    [content, saveMutation]
  );

  const handleChange = (text: string) => {
    setDraft(text);
    scheduleAutoSave(text);
  };

  const handleSave = async () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    await saveMutation.mutateAsync(draft);
  };

  const handleCancel = () => {
    setDraft(content);
    setIsEditing(false);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  const insertMarkdown = (before: string, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = draft.slice(start, end);
    const replacement = `${before}${selected}${after}`;
    setDraft(draft.slice(0, start) + replacement + draft.slice(end));
    scheduleAutoSave(
      draft.slice(0, start) + replacement + draft.slice(end)
    );
    setTimeout(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
      ta.focus();
    }, 0);
  };

  const toolbarBtns = [
    { label: "B", action: () => insertMarkdown("**", "**"), title: "Bold" },
    { label: "I", action: () => insertMarkdown("*", "*"), title: "Italic" },
    { label: "H2", action: () => insertMarkdown("## "), title: "Heading" },
    { label: "[]", action: () => insertMarkdown("[", "](url)"), title: "Link" },
    { label: "-", action: () => insertMarkdown("- "), title: "List" },
    { label: "```", action: () => insertMarkdown("```\n", "\n```"), title: "Code block" },
  ];

  const wordCount = draft
    ? draft.split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = draft?.length ?? 0;

  if (!isEditing) {
    return (
      <div className="group relative rounded-lg border border-border bg-card">
        <div className="p-6">
          <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-accent prose-pre:bg-sidebar prose-pre:text-sidebar-text-active">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-text-muted opacity-0 group-hover:opacity-100 hover:border-border-strong hover:text-text-secondary shadow-sm transition-all"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1.5">
        <div className="flex items-center gap-0.5">
          {toolbarBtns.map((btn) => (
            <button
              key={btn.title}
              onClick={btn.action}
              title={btn.title}
              className="rounded-md px-2 py-1 text-xs font-mono text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
            >
              {btn.label}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`rounded-md px-2 py-1 text-xs transition-colors ${
              showPreview
                ? "bg-card text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
            title="Toggle preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-text-muted hidden sm:inline">
            {wordCount} words
          </span>
          <span className="text-[10px] text-text-muted hidden sm:inline">
            {charCount} chars
          </span>
          {saveMutation.isPending && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveMutation.isSuccess && !saveMutation.isPending && (
            <span className="text-[10px] text-success">Saved</span>
          )}
          <span className="text-[10px] text-text-muted hidden sm:inline">
            Ctrl+S
          </span>
          <button
            onClick={handleCancel}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-surface transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-accent-violet px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Editor + Preview split */}
      <div className="flex min-h-[280px]">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 resize-none border-0 bg-sidebar p-4 font-mono text-sm leading-relaxed text-sidebar-text-active placeholder:text-text-muted focus:outline-none ${
            showPreview ? "w-1/2" : "w-full"
          }`}
          placeholder="Write markdown..."
          spellCheck={false}
        />
        {showPreview && (
          <div className="w-1/2 overflow-y-auto border-l border-border bg-card p-4">
            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-accent prose-pre:bg-sidebar prose-pre:text-sidebar-text-active">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {draft || "*Start typing to see preview...*"}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
