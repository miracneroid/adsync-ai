import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export interface Change {
  section: string;
  before: string;
  after: string;
}

interface ResultsViewProps {
  html: string;
  originalUrl: string;
  changes: Change[];
  onBack: () => void;
}

export const ResultsView = ({ html, originalUrl, changes, onBack }: ResultsViewProps) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"preview" | "code" | "changes">("preview");
  const [expandedChange, setExpandedChange] = useState<number | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold font-[family-name:var(--font-heading)]">
              Personalized Page
            </h2>
            <p className="text-sm text-muted-foreground">
              {changes.length} text modification{changes.length !== 1 ? "s" : ""} applied
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={originalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-1" /> Original
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied" : "Copy HTML"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {(["preview", "changes", "code"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors capitalize ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "changes" ? `Changes (${changes.length})` : t === "code" ? "HTML Code" : "Preview"}
          </button>
        ))}
      </div>

      {tab === "preview" ? (
        <div className="border border-border rounded-xl overflow-hidden bg-background">
          <iframe
            srcDoc={html}
            className="w-full h-[700px] border-0"
            title="Personalized Landing Page"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : tab === "changes" ? (
        <div className="space-y-3">
          {changes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No changes summary available.</p>
          ) : (
            changes.map((change, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedChange(expandedChange === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground capitalize">{change.section}</span>
                  {expandedChange === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedChange === i && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                      <p className="text-xs font-medium text-destructive mb-1">Before</p>
                      <p className="text-sm text-foreground">{change.before}</p>
                    </div>
                    <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <p className="text-xs font-medium text-emerald-400 mb-1">After</p>
                      <p className="text-sm text-foreground">{change.after}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <pre className="p-4 text-xs text-muted-foreground overflow-auto max-h-[700px] bg-muted/30">
            <code>{html}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
