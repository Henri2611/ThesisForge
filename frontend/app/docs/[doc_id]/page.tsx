"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, DocResponse } from "@/lib/api";

export default function DocPage() {
  const { doc_id } = useParams<{ doc_id: string }>();
  const [doc, setDoc] = useState<DocResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc_id) return;

    const decodedId = decodeURIComponent(doc_id);

    api.getDoc(decodedId)
      .then(setDoc)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [doc_id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-gray-500">Loading documentation...</p>
      </main>
    );
  }

  if (error || !doc) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-red-500">{error || "Document not found"}</p>
        <Link href="/repos" className="mt-4 inline-block text-sm text-neutral-900 underline">
          Back to repositories
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href={`/repos/${encodeURIComponent(doc.repo_id)}`} className="text-sm text-neutral-600 underline hover:text-neutral-900">
          &larr; Back to repository
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Generated Documentation</h1>
      <p className="mt-1 text-sm text-gray-500">{doc.repo_id}</p>

      <div className="mt-8 space-y-8">
        {doc.chapters
          .sort((a, b) => a.order - b.order)
          .map((chapter, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-6">
              <h2 className="mb-4 text-xl font-semibold">{chapter.title}</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                {chapter.content.split("\n").map((line, j) => {
                  if (line.startsWith("# ")) return <h1 key={j} className="mb-2 mt-4 text-2xl font-bold">{line.slice(2)}</h1>;
                  if (line.startsWith("## ")) return <h2 key={j} className="mb-2 mt-3 text-xl font-semibold">{line.slice(3)}</h2>;
                  if (line.startsWith("### ")) return <h3 key={j} className="mb-1 mt-2 text-lg font-medium">{line.slice(4)}</h3>;
                  if (line.startsWith("- ")) return <li key={j} className="ml-4 text-gray-700">{line.slice(2)}</li>;
                  if (line.trim() === "") return <br key={j} />;
                  return <p key={j} className="mb-1 text-gray-700">{line}</p>;
                })}
              </div>
            </div>
          ))}
      </div>
    </main>
  );
}
