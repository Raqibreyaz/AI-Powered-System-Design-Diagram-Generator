import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, Key, Database } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface text-slate-100 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={13} /> Back
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="space-y-4">
          <section className="p-4 bg-surface-1 border border-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={14} className="text-accent" />
              <h2 className="text-sm font-semibold">AI Provider</h2>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              The active AI provider is configured via environment variables on the server.
              Set <code className="bg-surface-2 px-1 rounded font-mono">GEMINI_API_KEY</code> (preferred) or{" "}
              <code className="bg-surface-2 px-1 rounded font-mono">OPENAI_API_KEY</code> in your{" "}
              <code className="bg-surface-2 px-1 rounded font-mono">.env</code> file to activate it.
              If neither is set, the mock provider is used (safe for development).
            </p>
            <div className="space-y-1.5">
              {[
                { name: "Gemini", key: "GEMINI_API_KEY", model: "GEMINI_MODEL", badge: "Preferred" },
                { name: "OpenAI", key: "OPENAI_API_KEY", model: "OPENAI_MODEL", badge: "Fallback" },
                { name: "Mock", key: "(none)", model: "–", badge: "Dev default" },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs py-1.5 px-2 bg-surface-2 rounded">
                  <span className="font-medium text-slate-200">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-slate-400">{p.key}</code>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-3 text-slate-400 border border-border">
                      {p.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 bg-surface-1 border border-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} className="text-accent" />
              <h2 className="text-sm font-semibold">Database</h2>
            </div>
            <p className="text-xs text-slate-400">
              PostgreSQL via Prisma. Configure <code className="bg-surface-2 px-1 rounded font-mono">DATABASE_URL</code> in{" "}
              <code className="bg-surface-2 px-1 rounded font-mono">.env</code>.
            </p>
          </section>

          <section className="p-4 bg-surface-1 border border-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Key size={14} className="text-accent" />
              <h2 className="text-sm font-semibold">Authentication</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Demo mode: any email address can log in via{" "}
              <code className="bg-surface-2 px-1 rounded font-mono">POST /api/auth/demo-login</code>.
              The workspace auto-logs in with <code className="bg-surface-2 px-1 rounded font-mono">demo@diagramforge.dev</code>.
              Replace with real auth (magic-link, OAuth) when ready.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
