import { useNavigate } from "react-router-dom";
import { Layers, Wand2, FileCode2, GitBranch, ArrowRight, Zap } from "lucide-react";
import { Button } from "../components/ui/Button";

const FEATURES = [
  {
    icon: Wand2,
    title: "Prompt to Diagram",
    description: "Describe your architecture in plain English and get an editable diagram instantly.",
  },
  {
    icon: FileCode2,
    title: "Files to Diagram",
    description: "Upload Kubernetes YAMLs, Docker Compose, and Dockerfiles to extract your real architecture.",
  },
  {
    icon: GitBranch,
    title: "Fully Editable",
    description: "Drag nodes, rename labels, add edges, and regenerate any selection with a new prompt.",
  },
  {
    icon: Zap,
    title: "Traceability",
    description: "Every node and edge links back to the prompt fragment or file line that created it.",
  },
];

const SAMPLE_PROMPTS = [
  "Scalable video transcoding pipeline with ECS, S3, and CDN",
  "OAuth 2.0 PKCE authorization code flow",
  "Microservices e-commerce with API gateway and event bus",
  "Real-time chat with WebSockets and Redis pub/sub",
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = (prompt?: string) => {
    if (prompt) {
      sessionStorage.setItem("df_starter_prompt", prompt);
    }
    navigate("/workspace");
  };

  return (
    <div className="min-h-screen bg-surface text-slate-100 font-sans">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Layers size={14} className="text-accent" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">Diagram Forge</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>Settings</Button>
          <Button variant="primary" size="sm" onClick={() => handleStart()}>
            Open App <ArrowRight size={13} />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
          <Wand2 size={11} /> AI-powered · Strictly typed DSL · ELK auto-layout
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 leading-tight mb-4">
          System design diagrams,
          <br />
          <span className="text-accent">generated and editable</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Diagram Forge turns natural language prompts and infrastructure files into
          fully editable architecture, flowchart, and sequence diagrams — with full
          traceability back to the source.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={() => handleStart()}>
            <Wand2 size={16} /> Start Generating
          </Button>
          <Button variant="secondary" size="lg" onClick={() => handleStart(SAMPLE_PROMPTS[0])}>
            Try a Sample
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-4 bg-surface-1 border border-border rounded-xl hover:border-border-strong transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <f.icon size={13} className="text-accent" />
                </div>
                <span className="text-sm font-semibold text-slate-100">{f.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample prompts */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Sample prompts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleStart(p)}
              className="text-left text-xs text-slate-400 bg-surface-1 border border-border rounded-lg px-3 py-2.5 hover:border-accent/50 hover:text-slate-200 transition-all group"
            >
              <ArrowRight size={11} className="inline mr-1.5 text-slate-600 group-hover:text-accent transition-colors" />
              {p}
            </button>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 px-6 py-4 text-center text-xs text-slate-600">
        Diagram Forge — MVP · Strict DSL · Provider-agnostic AI
      </footer>
    </div>
  );
}
