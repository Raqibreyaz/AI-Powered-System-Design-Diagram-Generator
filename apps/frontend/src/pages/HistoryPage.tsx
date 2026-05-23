import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Clock } from "lucide-react";
import { diagramService } from "../services/diagram.service";
import { Button } from "../components/ui/Button";
import { useDiagramStore } from "../store/diagram.store";
import { useUIStore } from "../store/ui.store";
import type { DiagramVersion } from "@diagram-forge/shared";

export default function HistoryPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { loadDiagram } = useDiagramStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (!diagramId) return;
    diagramService.listVersions(diagramId).then((r) => setVersions(r.versions)).catch(() => {});
  }, [diagramId]);

  const handleRestore = async (versionId: string) => {
    if (!diagramId) return;
    setRestoring(versionId);
    try {
      const res = await diagramService.restoreVersion(diagramId, versionId);
      loadDiagram(res.diagram.id, res.diagram.dslJson, {
        title: res.diagram.title,
        version: res.diagram.currentVersion,
        diagramType: res.diagram.diagramType,
      });
      showToast("Version restored", "success");
      navigate(`/workspace/${diagramId}`);
    } catch {
      showToast("Restore failed", "error");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-slate-100 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/workspace/${diagramId}`)}>
            <ArrowLeft size={13} /> Back
          </Button>
          <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-slate-500" /> Version History
          </h1>
        </div>

        {versions.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-12">No versions found</div>
        ) : (
          <div className="space-y-2">
            {versions.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-surface-1 border border-border rounded-lg hover:border-border-strong transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-slate-100">v{v.versionNumber}</span>
                    {i === 0 && (
                      <span className="text-[10px] bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{v.changeNote ?? "—"}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                {i !== 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={restoring === v.id}
                    onClick={() => void handleRestore(v.id)}
                  >
                    <RotateCcw size={11} /> Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
