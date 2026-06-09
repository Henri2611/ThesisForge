"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clearToken } from "@/lib/api";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearToken();
    localStorage.removeItem("openai_key");
    router.push("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Logging out...
      </div>
    </div>
  );
}
