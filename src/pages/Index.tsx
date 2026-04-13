import { useState } from "react";
import { InputForm } from "@/components/InputForm";
import { ResultsView, Change } from "@/components/ResultsView";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type AppState = "input" | "loading" | "result";

const Index = () => {
  const [state, setState] = useState<AppState>("input");
  const [result, setResult] = useState<string>("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 glow-bg pointer-events-none" />

      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto flex items-center gap-3 py-4 px-6">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
            <span className="gradient-text">Adsync AI</span>
            <span className="text-muted-foreground ml-2 text-sm font-normal">AI Page Personalizer</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 container max-w-5xl mx-auto px-6 py-12">
        {state === "result" ? (
          <ResultsView
            html={result}
            originalUrl={originalUrl}
            changes={changes}
            onBack={() => {
              setState("input");
              setResult("");
              setChanges([]);
            }}
          />
        ) : (
          <InputForm
            loading={state === "loading"}
            onSubmit={async (adContent, landingPageUrl) => {
              setState("loading");
              setOriginalUrl(landingPageUrl);
              try {
                // Step 1: Preprocess Ad Intent using the Python Microservice
                let analyzedIntent = null;
                const processorUrl = import.meta.env.VITE_PROCESSOR_URL || "http://localhost:8001";
                
                try {
                  const intentResp = await fetch(`${processorUrl}/analyze-ad`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ad_text: adContent }),
                  });
                  if (intentResp.ok) {
                    analyzedIntent = await intentResp.json();
                    console.log("Preprocessed Intent:", analyzedIntent);
                  }
                } catch (intentErr) {
                  console.warn(`Preprocessing microservice at ${processorUrl} not reachable, skipping intent analysis.`, intentErr);
                }

                // Step 2: Main Personalization Pipeline
                const { data, error } = await supabase.functions.invoke("personalize", {
                  body: { 
                    adContent, 
                    landingPageUrl,
                    intent: analyzedIntent // Passing structured intent to the Edge Function
                  },
                });

                if (error) throw error;
                if (!data) throw new Error("No data returned from personalization function");

                setResult(data.html);
                setChanges(data.changes || []);
                setState("result");
              } catch (e: unknown) {
                console.error(e);
                toast({
                  title: "Error",
                  description: e instanceof Error ? e.message : "Failed to personalize page",
                  variant: "destructive",
                });
                setState("input");
              }
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
