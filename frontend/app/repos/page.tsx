"use client";

import Link from "next/link";
import { getToken } from "@/lib/api";

export default function ReposPage() {
  const hasToken = !!getToken();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Repositories</h1>
        <Link
          href="/repos/import"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Import Repository
        </Link>
      </div>
      <div className="mt-8 rounded-lg border border-neutral-200 p-12 text-center text-gray-500">
        {hasToken ? (
          <p>No repositories yet. <Link href="/repos/import" className="text-neutral-900 underline">Import one</Link> to get started.</p>
        ) : (
          <p>Set your GitHub token on the <Link href="/" className="text-neutral-900 underline">home page</Link> first.</p>
        )}
      </div>
    </main>
  );
}
