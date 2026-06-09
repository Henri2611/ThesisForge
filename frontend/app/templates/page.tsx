"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Dialog } from "@/app/components/ui/dialog";
import { Select } from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Search, LayoutTemplate, FileText, Plus, Upload, Download,
  Trash2, Check, AlertCircle
} from "lucide-react";
import { api, type Template } from "@/lib/api";

const FONTS_BODY = ["Times New Roman", "Arial", "Calibri", "Cambria", "Georgia", "Helvetica", "Garamond", "Palatino"];
const FONTS_HEADING = ["Times New Roman", "Arial", "Calibri Light", "Calibri", "Cambria", "Georgia", "Helvetica"];
const FONTS_CODE = ["Courier New", "Consolas", "Monaco", "Fira Code", "Source Code Pro", "Menlo"];
const LINE_SPACINGS = [1.0, 1.15, 1.25, 1.5, 1.75, 2.0];
const PAPER_SIZES = ["A4", "Letter", "Legal"];

interface StyleConfig {
  page: { size: string; margin_top: number; margin_bottom: number; margin_left: number; margin_right: number; orientation: string };
  fonts: { body: string; heading: string; code: string; size_body: number; size_h1: number; size_h2: number; size_h3: number };
  spacing: { line: number; after_para: number; before_heading: number };
  cover_page: boolean;
  heading_numbering: boolean;
  header: string;
  footer_page_numbers: boolean;
  color_primary: string;
}

const DEFAULT_CONFIG: StyleConfig = {
  page: { size: "A4", margin_top: 25.4, margin_bottom: 25.4, margin_left: 25.4, margin_right: 25.4, orientation: "portrait" },
  fonts: { body: "Times New Roman", heading: "Times New Roman", code: "Courier New", size_body: 12, size_h1: 18, size_h2: 16, size_h3: 14 },
  spacing: { line: 1.5, after_para: 6, before_heading: 12 },
  cover_page: true,
  heading_numbering: true,
  header: "",
  footer_page_numbers: true,
  color_primary: "#1A1A2E",
};

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<string>("all");
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [exportFormat, setExportFormat] = useState("DOCX");
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<"details" | "style" | "upload">("details");
  const [formName, setFormName] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [style, setStyle] = useState<StyleConfig>(DEFAULT_CONFIG);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateStyle(section: keyof StyleConfig, value: unknown) {
    setStyle((prev) => {
      const current = prev[section];
      if (typeof current === "object" && current !== null && typeof value === "object" && value !== null) {
        return { ...prev, [section]: { ...(current as object), ...(value as object) } };
      }
      return { ...prev, [section]: value };
    });
  }

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    retry: false,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["docs"],
    queryFn: api.listDocs,
    enabled: !!useTemplateId,
  });

  const completedDocs = docs.filter((d) => d.status === "completed");

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("name", formName);
      fd.append("organization", formOrg);
      fd.append("description", formDesc);
      fd.append("format", "DOCX");
      fd.append("tags", JSON.stringify(formTags.split(",").map((t) => t.trim()).filter(Boolean)));
      fd.append("config_json", JSON.stringify(style));
      if (uploadFile) fd.append("docx_file", uploadFile);
      return api.createUserTemplate(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowCreate(false);
      setFormName("");
      setFormOrg("");
      setFormDesc("");
      setFormTags("");
      setUploadFile(null);
      setStyle(DEFAULT_CONFIG);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => api.createExport(selectedDocId, exportFormat, useTemplateId!),
    onSuccess: () => { setSelectedDocId(""); setUseTemplateId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const formats = useMemo(() => {
    const set = new Set(templates.map((t) => t.format));
    return ["all", ...Array.from(set)];
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const ms = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.organization.toLowerCase().includes(search.toLowerCase());
      const mf = format === "all" || t.format === format;
      return ms && mf;
    });
  }, [templates, search, format]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Templates</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose a template or create your own.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Create Template</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {formats.map((f) => (
            <button key={f} onClick={() => setFormat(f)} className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${format === f ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><div className="p-5">
              <Skeleton className="h-10 w-10 rounded-md mb-3" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-6 w-full" />
            </div></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-bg">
                    <LayoutTemplate className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-secondary-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">{template.format}</span>
                    {!template.is_global && (
                      <button onClick={() => deleteMutation.mutate(template.id)} className="rounded p-1 text-text-muted hover:text-error transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{template.name}</h3>
                <p className="mt-0.5 text-xs text-text-muted">{template.organization}</p>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.tags?.map((tag: string) => (
                    <span key={tag} className="rounded bg-secondary-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">{tag}</span>
                  ))}
                </div>
                <Button variant="outline" size="sm" icon={FileText} className="mt-4 w-full" onClick={() => setUseTemplateId(template.id)}>
                  Use Template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="h-10 w-10 text-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">No templates match your search.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setFormat("all"); }}>Clear filters</Button>
        </div>
      )}

      <Dialog open={!!useTemplateId} onClose={() => { setUseTemplateId(null); setSelectedDocId(""); }} title="Use Template" icon={<LayoutTemplate className="h-4 w-4 text-primary" />}>
        <div className="flex flex-col gap-4">
          {completedDocs.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No completed documents yet. Generate a document first.</p>
          ) : (
            <Select label="Select a document" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}
              options={[{ value: "", label: "Choose..." }, ...completedDocs.map((d) => ({ value: d.id, label: d.title }))]} />
          )}
          <Select label="Export format" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}
            options={[{ value: "DOCX", label: "Microsoft Word (.docx)" }, { value: "PDF", label: "PDF (.pdf)" }, { value: "LaTeX", label: "LaTeX (.tex)" }]} />
          <Button onClick={() => exportMutation.mutate()} disabled={!selectedDocId} loading={exportMutation.isPending} icon={Download}>Export</Button>
          {exportMutation.isSuccess && <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" /> Export started.</p>}
          {exportMutation.isError && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {(exportMutation.error as Error).message}</p>}
        </div>
      </Dialog>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create Template" icon={<Plus className="h-4 w-4 text-primary" />}>
        <div className="flex flex-col gap-4">
          <div className="flex gap-1 rounded-md border border-border p-0.5 self-start">
            {(["details", "style", "upload"] as const).map((t) => (
              <button key={t} onClick={() => setCreateTab(t)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors capitalize ${createTab === t ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"}`}>
                {t === "details" ? "Details" : t === "style" ? "Style" : "Upload"}
              </button>
            ))}
          </div>

          {createTab === "details" && (
            <>
              <Input label="Template name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. My University Template" />
              <Input label="Organization" value={formOrg} onChange={(e) => setFormOrg(e.target.value)} placeholder="e.g. University of Nairobi" />
              <Input label="Description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description..." />
              <Input label="Tags (comma-separated)" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="e.g. academic, thesis, engineering" />
            </>
          )}

          {createTab === "style" && (
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Page</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Paper size" value={style.page.size}
                  onChange={(e) => updateStyle("page", { size: e.target.value })}
                  options={PAPER_SIZES.map((s) => ({ value: s, label: s }))} />
                <Select label="Orientation" value={style.page.orientation}
                  onChange={(e) => updateStyle("page", { orientation: e.target.value })}
                  options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Top margin (mm)" type="number" value={style.page.margin_top} onChange={(e) => updateStyle("page", { margin_top: Number(e.target.value) })} />
                <Input label="Bottom margin (mm)" type="number" value={style.page.margin_bottom} onChange={(e) => updateStyle("page", { margin_bottom: Number(e.target.value) })} />
                <Input label="Left margin (mm)" type="number" value={style.page.margin_left} onChange={(e) => updateStyle("page", { margin_left: Number(e.target.value) })} />
                <Input label="Right margin (mm)" type="number" value={style.page.margin_right} onChange={(e) => updateStyle("page", { margin_right: Number(e.target.value) })} />
              </div>

              <hr className="border-border" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Fonts</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Body font" value={style.fonts.body}
                  onChange={(e) => updateStyle("fonts", { body: e.target.value })}
                  options={FONTS_BODY.map((f) => ({ value: f, label: f }))} />
                <Select label="Heading font" value={style.fonts.heading}
                  onChange={(e) => updateStyle("fonts", { heading: e.target.value })}
                  options={FONTS_HEADING.map((f) => ({ value: f, label: f }))} />
                <Select label="Code font" value={style.fonts.code}
                  onChange={(e) => updateStyle("fonts", { code: e.target.value })}
                  options={FONTS_CODE.map((f) => ({ value: f, label: f }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Body size (pt)" type="number" min={8} max={24} value={style.fonts.size_body} onChange={(e) => updateStyle("fonts", { size_body: Number(e.target.value) })} />
                <Input label="H1 size (pt)" type="number" min={8} max={36} value={style.fonts.size_h1} onChange={(e) => updateStyle("fonts", { size_h1: Number(e.target.value) })} />
                <Input label="H2 size (pt)" type="number" min={8} max={36} value={style.fonts.size_h2} onChange={(e) => updateStyle("fonts", { size_h2: Number(e.target.value) })} />
                <Input label="H3 size (pt)" type="number" min={8} max={36} value={style.fonts.size_h3} onChange={(e) => updateStyle("fonts", { size_h3: Number(e.target.value) })} />
              </div>

              <hr className="border-border" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Spacing</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Line spacing" value={String(style.spacing.line)}
                  onChange={(e) => updateStyle("spacing", { line: Number(e.target.value) })}
                  options={LINE_SPACINGS.map((s) => ({ value: String(s), label: String(s) }))} />
                <Input label="Para after (pt)" type="number" min={0} max={48} value={style.spacing.after_para} onChange={(e) => updateStyle("spacing", { after_para: Number(e.target.value) })} />
              </div>

              <hr className="border-border" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Layout</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={style.cover_page} onChange={(e) => setStyle((s) => ({ ...s, cover_page: e.target.checked }))} className="rounded border-border accent-primary" />
                  <span className="text-sm text-text-primary">Cover page</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={style.heading_numbering} onChange={(e) => setStyle((s) => ({ ...s, heading_numbering: e.target.checked }))} className="rounded border-border accent-primary" />
                  <span className="text-sm text-text-primary">Heading numbering (1. Introduction)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={style.footer_page_numbers} onChange={(e) => setStyle((s) => ({ ...s, footer_page_numbers: e.target.checked }))} className="rounded border-border accent-primary" />
                  <span className="text-sm text-text-primary">Page numbers in footer</span>
                </label>
              </div>
              <Input label="Primary color" type="color" value={style.color_primary} onChange={(e) => setStyle((s) => ({ ...s, color_primary: e.target.value }))} />
              <Input label="Header text (optional)" value={style.header} onChange={(e) => setStyle((s) => ({ ...s, header: e.target.value }))} placeholder="e.g. ThesisForge — {title}" />
            </div>
          )}

          {createTab === "upload" && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              {uploadFile ? (
                <>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm font-medium text-text-primary">{uploadFile.name}</p>
                  <p className="text-xs text-text-muted mt-1">Click to change</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>Remove</Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-text-muted/40 mb-2" />
                  <p className="text-sm text-text-muted">Drop a .docx file here or click to browse</p>
                  <p className="text-xs text-text-muted/60 mt-1">We'll extract fonts, margins, and styles</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setFormName(f.name.replace(/\.docx$/, "")); }}} />
            </div>
          )}

          <Button onClick={() => createMutation.mutate()} disabled={!formName.trim()} loading={createMutation.isPending}>Save Template</Button>
        </div>
      </Dialog>
    </div>
  );
}
