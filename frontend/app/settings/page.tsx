"use client";

import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Save, Eye, EyeOff, Key } from "lucide-react";

export default function SettingsPage() {
  const [showKey, setShowKey] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (openaiKey) localStorage.setItem("openai_key", openaiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manage your API keys and preferences.
      </p>

      <Card className="mt-6">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            OpenAI API Key
          </h3>
          <p className="text-xs text-text-muted mb-3">
            Used for embeddings and LLM generation when Gemini is unavailable.
          </p>
          <Input
            type={showKey ? "text" : "password"}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            icon={<Key className="h-4 w-4" />}
            rightElement={
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
          <Button
            onClick={handleSave}
            icon={Save}
            className="mt-4"
          >
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
