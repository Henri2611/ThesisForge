"use client";

import { Card } from "@/app/components/ui/card";
import { HelpCircle, BookOpen, FileText, MessageSquare, Sparkles } from "lucide-react";

const guides = [
  {
    title: "Getting Started",
    description: "Learn how to import your first repository and generate documentation.",
    icon: BookOpen,
  },
  {
    title: "Document Generation",
    description: "Understand how ThesisForge analyzes your code and creates structured documents.",
    icon: FileText,
  },
  {
    title: "Export & Templates",
    description: "Format your documents with academic templates and export to DOCX/PDF.",
    icon: HelpCircle,
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Help & Documentation</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Guides and references for using ThesisForge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Card key={guide.title}>
              <div className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-bg mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {guide.title}
                </h3>
                <p className="mt-1 text-xs text-text-muted leading-relaxed">
                  {guide.description}
                </p>
                <span className="mt-3 inline-block rounded bg-secondary-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  Coming soon
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text-primary">Need help?</p>
            <p className="text-xs text-text-muted mt-0.5">
              Reach out via the GitHub repository for support and feature requests.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
