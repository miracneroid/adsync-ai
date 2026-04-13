const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractHeroSection(html: string): { snippet: string; startIndex: number; endIndex: number } | null {
    const patterns = [
        /<(?:section|div|header)[^>]*(?:class|id)\s*=\s*["'][^"']*(?:hero|banner|jumbotron|videobanner|masthead|splash|above-fold|main-banner)[^"']*["'][^>]*>[\s\S]*?<\/(?:section|div|header)>/gi,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(html);
        if (match) {
            const snippet = match[0];
            const hasEditable = /<(?:h1|h2|h3|h4|p|span|a|button)\b[^>]*>[\s\S]*?<\/(?:h1|h2|h3|h4|p|span|a|button)>/i.test(snippet);
            if (hasEditable) {
                return {
                    snippet,
                    startIndex: match.index,
                    endIndex: match.index + snippet.length,
                };
            }
        }
    }

    const h1Match = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/i);
    if (h1Match && h1Match.index !== undefined) {
        const beforeH1 = html.substring(0, h1Match.index);
        const parentOpenings = [...beforeH1.matchAll(/<(?:section|div|header|main)\b[^>]*>/gi)];

        if (parentOpenings.length > 0) {
            const lastOpening = parentOpenings[parentOpenings.length - 1];
            const openTagName = lastOpening[0].match(/<(\w+)/)?.[1] || "div";
            const startIdx = lastOpening.index!;

            const afterStart = html.substring(startIdx);
            const chunk = afterStart.substring(0, 8000);
            const closeMatch = chunk.match(new RegExp(`<\\/${openTagName}>`, "i"));
            if (closeMatch && closeMatch.index !== undefined) {
                const endIdx = startIdx + closeMatch.index + closeMatch[0].length;
                return {
                    snippet: html.substring(startIdx, endIdx),
                    startIndex: startIdx,
                    endIndex: endIdx,
                };
            }
        }

        const contextStart = Math.max(0, h1Match.index - 800);
        const contextEnd = Math.min(html.length, h1Match.index + h1Match[0].length + 3000);
        return {
            snippet: html.substring(contextStart, contextEnd),
            startIndex: contextStart,
            endIndex: contextEnd,
        };
    }

    return null;
}

function stripTags(html: string) {
    return String(html)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function deriveChangesFromBeforeAfter(before: string, after: string) {
    const changes: Array<{ section: string; before: string; after: string }> = [];
    const tags = ["h1", "h2", "h3", "h4", "p", "button", "a", "span"];

    for (const tag of tags) {
        const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
        const beforeMatches = [...before.matchAll(re)];
        const afterMatches = [...after.matchAll(re)];

        for (let i = 0; i < Math.min(beforeMatches.length, afterMatches.length); i++) {
            const bText = stripTags(beforeMatches[i][1]);
            const aText = stripTags(afterMatches[i][1]);
            if (bText && aText && bText !== aText) {
                const alreadyAdded = changes.some((c) => c.before === bText && c.after === aText);
                if (!alreadyAdded) {
                    changes.push({ section: tag, before: bText, after: aText });
                }
            }
        }
    }
    return changes.slice(0, 15);
}

function buildMockReplacements(adContent: string) {
    const text = stripTags(adContent);
    const firstLine = text.split('\n').map((s) => s.trim()).filter(Boolean)[0] || text;

    const percentOff = text.match(/\b\d{1,2}\s*%+\s*(?:off|OFF)\b/)?.[0];
    const moneyOff = text.match(/\$\s*\d+\s*(?:off|OFF)\b/)?.[0];
    const code = text.match(/\b(?:code|CODE)\s*[:\-]?\s*([A-Z0-9]{3,15})\b/)?.[1];
    const urgency = /\b(today|tonight|ends|limited|hurry|last chance|one day)\b/i.test(text) ? "Limited time" : null;

    const headlineBits = [
        firstLine ? firstLine.slice(0, 90) : null,
        percentOff || moneyOff || null,
        code ? `Code ${code}` : null,
        urgency,
    ].filter(Boolean);

    const headline = headlineBits.join(" · ") || "Limited-time offer";
    const cta = percentOff || moneyOff ? "Claim deal" : "Learn more";

    return { headline, cta, summary: text.slice(0, 220) };
}

function mockPersonalizeSnippet(snippet: string, adContent: string) {
    const { headline, cta, summary } = buildMockReplacements(adContent);
    const changes: Array<{ section: string; before: string; after: string }> = [];
    let updated = String(snippet);

    const replaceTags = (tag: string, nextText: string) => {
        const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi");
        updated = updated.replace(re, (match, attrs, inner) => {
            const beforeText = stripTags(inner);
            if (!beforeText || beforeText === nextText) return match;
            changes.push({ section: tag, before: beforeText, after: nextText });
            return `<${tag}${attrs}>${nextText}</${tag}>`;
        });
    };

    replaceTags("h1", headline);
    replaceTags("h2", headline);
    replaceTags("button", cta);
    replaceTags("a", cta);

    return { 
        snippet: updated, 
        banner: {
            html: `<div style="background:#1e293b;color:white;padding:12px;text-align:center;font-weight:500;">${headline} <a href="#" style="color:#38bdf8;margin-left:10px;">${cta} &rarr;</a></div>`,
            text: summary
        },
        changes 
    };
}

function buildInjectedBannerHtml({ adContent, landingPageUrl }: { adContent: string, landingPageUrl: string, fullHtml: string }) {
    const { headline, cta } = buildMockReplacements(adContent);
    const bannerId = "adsync-ai-offer-banner";

    const html = `<div id="${bannerId}" style="position:sticky;top:0;z-index:2147483000;background:rgba(15, 23, 42, 0.96);color:white;font-family:inherit;border-bottom:1px solid rgba(255,255,255,0.12);">
  <div style="max-width:1100px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:20px;">
    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
      <div style="background:rgba(255,255,255,0.1);padding:4px;border-radius:6px;flex-shrink:0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#60a5fa;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
      </div>
      <p style="margin:0;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,0.9);">
        ${headline}
      </p>
    </div>
    <a href="${landingPageUrl}" style="background:#3b82f6;color:white;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'\" onmouseout=\"this.style.opacity='1'\">
      ${cta}
    </a>
  </div>
</div>`;

    return {
        html,
        bannerId,
        change: { section: "injected banner", before: "", after: `${headline} · ${cta}` }
    };
}

function injectBannerIntoHtml({ fullHtml, bannerHtml, bannerId }: { fullHtml: string, bannerHtml: string, bannerId: string }) {
    if (fullHtml.includes(bannerId)) return fullHtml;
    const bodyMatch = fullHtml.match(/<body([^>]*)>/i);
    if (bodyMatch) {
        return fullHtml.replace(bodyMatch[0], `${bodyMatch[0]}${bannerHtml}`);
    }
    return bannerHtml + fullHtml;
}

async function callGemini({ systemPrompt, userPrompt }: { systemPrompt: string, userPrompt: string }) {
    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim().replace(/^"|"$/g, '');
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const model = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const aiResp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            generationConfig: { temperature: 0.2 },
        }),
    });

    if (!aiResp.ok) {
        const errText = await aiResp.text();
        if (aiResp.status === 429) {
            await sleep(2000);
            return callGemini({ systemPrompt, userPrompt });
        }
        return { ok: false, status: aiResp.status, errorText: errText };
    }

    const data = await aiResp.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    content = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    return { ok: true, content };
}

async function callOpenAICompatible({ systemPrompt, userPrompt, baseUrl, model, apiKey }: { systemPrompt: string, userPrompt: string, baseUrl?: string, model?: string, apiKey?: string }) {
    const resolvedBaseUrl = (baseUrl || Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, "");
    const resolvedModel = (model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini").trim();
    const resolvedApiKey = (apiKey || Deno.env.get("OPENAI_API_KEY"))?.trim().replace(/^"|"$/g, "");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (resolvedApiKey) headers.Authorization = `Bearer ${resolvedApiKey}`;

    const aiResp = await fetch(`${resolvedBaseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: resolvedModel,
            temperature: 0.2,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });

    if (!aiResp.ok) {
        const errText = await aiResp.text();
        return { ok: false, status: aiResp.status, errorText: errText };
    }

    const data = await aiResp.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    return { ok: true, content };
}

function extractDesignContext(html: string) {
    // 1. COLORS
    const colorMatches = [...html.matchAll(/#[0-9a-fA-F]{3,6}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+\s*)?\)/gi)];
    const colors = [...new Set(colorMatches.map(m => m[0]))].slice(0, 15);

    // 2. FONTS
    const fontMatches = [...html.matchAll(/font-family:\s*([^;]+);/gi)];
    const fonts = [...new Set(fontMatches.map(m => m[1].replace(/['"]/g, '').trim()))].slice(0, 5);

    // 3. TAILWIND/CLASSES (Popular frameworks)
    const classMatches = [...html.matchAll(/class=["']([^"']+)["']/gi)];
    const classes = [...new Set(classMatches.flatMap(m => m[1].split(/\s+/)))].slice(0, 30);

    // 4. BUTTON STYLES (Search for common button patterns)
    const btnStyleMatches = [...html.matchAll(/<(?:button|a)[^>]*style=["']([^"']+)["'][^>]*>/gi)];
    const btnStyles = [...new Set(btnStyleMatches.map(m => m[1]))].slice(0, 5);

    // 5. META THEME
    const themeColor = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i)?.[1];

    return { 
        colors, 
        fonts, 
        classes, 
        btnStyles, 
        themeColor,
        isTailwind: html.includes('tailwind') || classes.some(c => c.startsWith('bg-') || c.startsWith('text-')),
    };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { adContent, landingPageUrl, intent } = await req.json();

        if (!adContent || !landingPageUrl) {
            return new Response(JSON.stringify({ error: "Missing adContent or landingPageUrl" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
        let fullHtml = "";
        const designContext: any = { colors: [], fonts: [], classes: [] };

        if (FIRECRAWL_API_KEY) {
            const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: landingPageUrl,
                    formats: ["rawHtml", "markdown"], // Get both for context
                    onlyMainContent: false,
                    waitFor: 7000, // Increased wait for heavy JS sites
                    actions: [
                        { type: "scrollDown", milliseconds: 1000 },
                        { type: "wait", milliseconds: 2000 }
                    ],
                    headers: {
                        "Accept-Language": "en-US,en;q=0.9",
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                }),
            });

            if (scrapeResp.ok) {
                const scrapeData = await scrapeResp.json();
                fullHtml = scrapeData.data?.rawHtml || scrapeData.rawHtml || "";
                const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
                // Use markdown to enhance design context if needed
                if (markdown) {
                    const title = markdown.match(/^#\s+(.+)$/m)?.[1];
                    if (title) designContext.pageTitle = title;
                }
            }
        }

        if (!fullHtml) {
            const pageResp = await fetch(landingPageUrl, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" },
            });
            fullHtml = await pageResp.text();
        }

        const heroExtraction = extractHeroSection(fullHtml);
        const snippet = heroExtraction?.snippet || fullHtml.substring(0, 15000);
        
        // Update designContext with more info if not already there
        if (!designContext.colors.length) {
            const freshContext = extractDesignContext(fullHtml);
            Object.assign(designContext, freshContext);
        }

        const systemPrompt = `You are a world-class Conversion Rate Optimization (CRO) expert and Lead Frontend Engineer at a top-tier design agency. Your mission is to personalize a landing page so it feels like a bespoke experience for a specific ad campaign.

🎨 DESIGN PHILOSOPHY:
- Every change must feel "native". Use the provided Design Context to match colors, fonts, and spacing.
- If the site uses Tailwind CSS (isTailwind: true), prioritize using Tailwind classes in your banner.
- The output must be "Industry Ready": polished, modern, and high-conversion.

🛠 PERSONALIZATION TASKS:
1. **Rewrite Hero Snippet**: Modify the provided HTML snippet. Keep the EXACT structure. Only change text to align with the Ad Creative.
2. **Create Premium Banner**: Design a sticky notification banner. 
   - It must include an icon (SVG).
   - It must have a clear value proposition and a CTA.
   - Use sophisticated CSS: glassmorphism (backdrop-filter), subtle gradients, and smooth transitions.
   - If possible, add a small "badge" or "limited time" indicator.

📤 OUTPUT FORMAT (STRICT JSON):
{
  "snippet": "<modified_html_with_text_changes>",
  "banner": {
    "html": "<div class='premium-banner' style='...'>...</div>",
    "css": "<additional_inline_styles_or_scoped_css>",
    "js": "<optional_minimal_js_for_interactivity_e.g._countdown_or_close_button>",
    "text": "<short_summary_for_logs>"
  },
  "changes": [
    { "section": "headline", "before": "...", "after": "..." }
  ]
}

🚨 CRITICAL: 
- DO NOT use markdown code blocks in your response. 
- Return ONLY the raw JSON.
- Ensure the JSON is perfectly valid.`;

        const userPrompt = `AD CREATIVE CONTENT:
"""
${adContent}
"""

${intent ? `STRUCTURED AD INTENT (PREPROCESSED):
${JSON.stringify(intent, null, 2)}` : ''}

DESIGN CONTEXT:
${JSON.stringify(designContext, null, 2)}

HTML SNIPPET TO PERSONALIZE:
${snippet}`

        let parsed: { 
            snippet: string, 
            banner?: { html: string, css?: string, js?: string, text: string },
            changes: Array<{ section: string, before: string, after: string }> 
        };
        const provider = (Deno.env.get("AI_PROVIDER") || "").trim().toLowerCase();

        if (provider === "mock") {
            parsed = mockPersonalizeSnippet(snippet, adContent);
        } else if (provider === "groq") {
            const apiKey = Deno.env.get("GROQ_API_KEY");
            const baseUrl = Deno.env.get("GROQ_BASE_URL") || "https://api.groq.com/openai/v1";
            const model = Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant";
            const ai = await callOpenAICompatible({ systemPrompt, userPrompt, baseUrl, model, apiKey });
            if (!ai.ok) throw new Error(`Groq error: ${ai.errorText}`);
            parsed = JSON.parse(ai.content);
        } else if (provider === "openai") {
            const ai = await callOpenAICompatible({ systemPrompt, userPrompt });
            if (!ai.ok) throw new Error(`OpenAI error: ${ai.errorText}`);
            parsed = JSON.parse(ai.content);
        } else {
            const ai = await callGemini({ systemPrompt, userPrompt });
            if (!ai.ok) throw new Error(`Gemini error: ${ai.errorText}`);
            parsed = JSON.parse(ai.content);
        }

        if (parsed.changes.length === 0) {
            parsed.changes = deriveChangesFromBeforeAfter(snippet, parsed.snippet);
        }

        let finalHtml;
        if (heroExtraction) {
            finalHtml =
                fullHtml.substring(0, heroExtraction.startIndex) +
                parsed.snippet +
                fullHtml.substring(heroExtraction.endIndex);
        } else {
            finalHtml = parsed.snippet + fullHtml.substring(10000);
        }

        const insertMode = (Deno.env.get("INSERT_MODE") || "banner").trim().toLowerCase();
        if (insertMode !== "none") {
            let bannerHtml = "";
            let bannerText = "";
            let bannerCss = "";
            let bannerJs = "";

            if (parsed.banner?.html) {
                bannerHtml = parsed.banner.html;
                bannerText = parsed.banner.text || "Special Offer";
                bannerCss = parsed.banner.css || "";
                bannerJs = parsed.banner.js || "";
            } else {
                const fallback = buildInjectedBannerHtml({ adContent, landingPageUrl, fullHtml: finalHtml });
                bannerHtml = fallback.html;
                bannerText = fallback.change.after;
            }

            const bannerId = "adsync-ai-offer-banner";
            if (!bannerHtml.includes("id=")) {
                bannerHtml = bannerHtml.replace("<div", `<div id="${bannerId}"`);
            }

            if (bannerCss) {
                finalHtml = finalHtml.replace("</head>", `<style>${bannerCss}</style></head>`);
            }
            if (bannerJs) {
                finalHtml = finalHtml.replace("</body>", `<script>${bannerJs}</script></body>`);
            }

            finalHtml = injectBannerIntoHtml({ fullHtml: finalHtml, bannerHtml, bannerId });
            parsed.changes = [{ section: "Personalized Banner", before: "", after: bannerText }, ...parsed.changes].slice(0, 30);
        }

        // INJECT INDUSTRY-READY SMOOTH TRANSITIONS & INTERACTIVITY
        const smoothScript = `
<style>
    @keyframes adsyncAiFadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .adsync-ai-animate {
        animation: adsyncAiFadeIn 0.8s ease-out forwards;
    }
    #adsync-ai-offer-banner {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    #adsync-ai-offer-banner:hover {
        transform: translateY(2px);
        filter: brightness(1.05);
    }
</style>
<script>
    (function() {
        function init() {
            const banner = document.getElementById('adsync-ai-offer-banner');
            if (banner) banner.classList.add('adsync-ai-animate');
            
            document.querySelectorAll('a').forEach(link => {
                if (link.href && !link.href.includes(window.location.host) && !link.href.startsWith('#')) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    })();
</script>
`;
        finalHtml = finalHtml.replace("</head>", `${smoothScript}</head>`);

        try {
            const urlObj = new URL(landingPageUrl);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            finalHtml = finalHtml.replace(/(src|href)=["'](?!https?:\/\/|\/\/|data:|#|mailto:|javascript:)\/?([^"']+)["']/gi,
                (_, attr, path) => `${attr}="${baseUrl}/${path.replace(/^\//, "")}"`
            );
            if (!finalHtml.includes("<base")) {
                finalHtml = finalHtml.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}/">`);
            }
        } catch { /* ignore */ }

        return new Response(JSON.stringify({ html: finalHtml, changes: parsed.changes }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("personalize error:", e);
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
