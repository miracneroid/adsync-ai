import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Upload, Sparkles, Loader2 } from "lucide-react";

interface InputFormProps {
  loading: boolean;
  onSubmit: (adContent: string, landingPageUrl: string) => void;
}

export const InputForm = ({ loading, onSubmit }: InputFormProps) => {
  const [adContent, setAdContent] = useState("");
  const [landingPageUrl, setLandingPageUrl] = useState("");
  const [adType, setAdType] = useState<"text" | "url">("text");

  const canSubmit = adContent.trim() && landingPageUrl.trim() && !loading;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold font-[family-name:var(--font-heading)] gradient-text">
          Personalize Any Landing Page
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Paste your ad creative and landing page URL. Our AI will generate a CRO-optimized
          version of your page personalized to match your ad.
        </p>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-6 space-y-6">
          {/* Ad Creative */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Ad Creative
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAdType("text")}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  adType === "text"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Paste text / copy
              </button>
              <button
                type="button"
                onClick={() => setAdType("url")}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  adType === "url"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Ad URL / image link
              </button>
            </div>
            {adType === "text" ? (
              <Textarea
                placeholder="Paste your ad copy, headline, description, CTA text..."
                value={adContent}
                onChange={(e) => setAdContent(e.target.value)}
                className="min-h-[120px] bg-muted/50 border-border/50 resize-none"
              />
            ) : (
              <Input
                placeholder="https://example.com/ad-image.png or ad URL..."
                value={adContent}
                onChange={(e) => setAdContent(e.target.value)}
                className="bg-muted/50 border-border/50"
              />
            )}
          </div>

          {/* Landing Page URL */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Link className="h-4 w-4 text-primary" />
              Landing Page URL
            </label>
            <Input
              placeholder="https://example.com/landing-page"
              value={landingPageUrl}
              onChange={(e) => setLandingPageUrl(e.target.value)}
              className="bg-muted/50 border-border/50"
            />
          </div>

          <Button
            variant="glow"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => onSubmit(adContent, landingPageUrl)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Personalizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Personalized Page
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Powered by AI · CRO principles · Message-match optimization</p>
      </div>
    </div>
  );
};
