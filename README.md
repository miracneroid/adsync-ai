# AdSync AI — Smart Landing Page Personalization Engine

AdSync AI is a high-performance personalization engine designed to bridge the gap between ad creatives and landing page experiences. This project implements an agentic workflow that dynamically rewrites landing page content to match the specific intent of an ad, ensuring a cohesive user journey and higher conversion rates.

## Features

- **Dynamic Hero Personalization**: Intelligently identifies and rewrites and CTA text while preserving 100% of the original HTML/CSS structure.
- **Deep Design Extraction**: Automatically analyzes brand colors, fonts, and framework-specific classes (like Tailwind) to ensure injected components feel "native."
- **Premium Banner Injection**: Generates high-quality, sticky notification banners with glassmorphism, SVG icons, and smooth CSS transitions.
- **Advanced Scraping & Rendering**: Leverages Firecrawl with JavaScript execution and scroll-down actions to capture the full state of modern SPAs.
- **Multi-Provider AI Orchestration**: Seamlessly switches between Groq (Llama 3.1), Google Gemini, and OpenAI based on performance or cost requirements.
- **Interactive Previews**: Injects smooth fade-in animations and optimized link handling for a seamless preview experience.

## ⚙️ Configuration & Setup

### 1. Environment Variables

#### Frontend (`.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PROCESSOR_URL=your_python_microservice_url # e.g., https://adsync-processor.onrender.com
```

#### AdSync AI Processor (`.env` or Environment Variables)
```env
GROQ_API_KEY=your_groq_api_key
ALLOWED_ORIGINS=https://adsyncai.netlify.app,http://localhost:5173
```

#### Backend (Supabase Secrets)
```bash
supabase secrets set AI_PROVIDER=groq
supabase secrets set GROQ_API_KEY=...
supabase secrets set FIRECRAWL_API_KEY=...
```

### 2. Local Development

**Frontend (React):**
```bash
npm install
npm run dev
```

**AdSync AI Processor (Python Microservice):**
```bash
cd adsync-ai-processor
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Set GROQ_API_KEY in environment
uvicorn main:app --reload --port 8001
```

**Edge Function (Supabase/Deno):**
```bash
deno run --allow-net --allow-env --env-file=supabase/functions/personalize/.env supabase/functions/personalize/index.ts
```

---

## 🚀 Deployment

### **Frontend (Netlify)**
- Connect your GitHub repo to Netlify.
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PROCESSOR_URL` in the Netlify UI.
- Netlify will automatically build and deploy from the `dist` folder.

### **AdSync AI Processor (Render)**
This service needs to be hosted where Python is supported.
- **Render**: Create a "Web Service", connect your repo, set the build command to `pip install -r adsync-ai-processor/requirements.txt`, and start command to `uvicorn adsync-ai-processor.main:app --host 0.0.0.0 --port $PORT`.
- Set `GROQ_API_KEY` and `ALLOWED_ORIGINS` in the environment variables.

### **Edge Function (Supabase)**
- Link your project: `supabase link --project-id your_project_id`.
- Deploy using the Supabase CLI: `supabase functions deploy personalize`.
- Ensure all secrets are set using `supabase secrets set`.

---

## 🔌 Agentic Workflow Integration

AdSync AI now implements a **multi-stage agentic workflow**:

1.  **Intent Preprocessing**: The React frontend calls the **AdSync AI Processor (FastAPI)** to break down raw ad text into structured fields (offer, product, urgency).
2.  **Design Analysis**: The **Personalize Edge Function** scrapes the landing page to extract its design system (colors, fonts, layout).
3.  **Context-Aware Personalization**: The Edge Function receives both the **structured intent** and **design context** to generate a perfectly aligned hero section and premium banner.

---

## 📂 Project Structure

```text
.
├── adsync-ai-processor/        # 🐍 Python Microservice (FastAPI + Groq)
│   ├── main.py
│   └── requirements.txt
├── src/
│   ├── pages/
│   │   └── Index.tsx           # 🏗️ Orchestration Logic (Integrates Python + Edge Function)
│   ├── components/
│   │   ├── InputForm.tsx
│   │   └── ResultsView.tsx
│   └── integrations/supabase/
├── supabase/
│   └── functions/
│       └── personalize/        # ⭐ CORE LOGIC: Personalization Engine
├── README.md
└── package.json
```

## Example Demo Flow

```text
User: Enters Ad Creative: "Get 50% off all organic coffee beans today only! Use code COFFEE50."
User: Enters Landing Page URL: "https://example-coffee-shop.com"

AdSync AI:
1. Scrapes the landing page and identifies the "Hero" section.
2. Extracts colors (e.g., #4b2c20) and fonts (e.g., 'Playfair Display').
3. Rewrites the H1 from "Quality Coffee for You" to "50% Off Organic Coffee Beans Today!"
4. Injects a premium banner with a "Claim Deal" CTA and a countdown effect.
5. Displays a real-time preview of the personalized page.
```

## Architecture Explanation

I chose a serverless, agentic approach because personalization requires a fine-grained balance between maintaining design integrity and maximizing conversion. The project is split into a **React 18 frontend** for a responsive user dashboard and a **Supabase Edge Function (Deno)** for the heavy lifting.

The core logic follows a structured pipeline: First, **Firecrawl** captures the full DOM state after executing JavaScript. Next, a custom **Design Extractor** parses the CSS to create a "style profile" of the site. This profile, along with the ad intent, is passed to an **AI Orchestrator** which handles the prompt engineering for various LLMs. Finally, a post-processing stage fixes relative asset paths and injects a custom "Premium Banner" that matches the site's brand perfectly. This modular architecture allows AdSync AI to be easily extended with new AI models or more complex injection methods.

## Deployment Approach

To deploy AdSync AI at scale, I've optimized it for **Netlify** (Frontend) and **Supabase** (Backend). The frontend uses a standard Vite build process with `_redirects` for SPA routing. The backend is deployed as a globally distributed Edge Function, ensuring low latency for users worldwide. For a production environment, I would integrate a Redis-based caching layer for scraped HTML to reduce API costs and implement a robust logging system to track conversion improvements across different AI-generated variations.

## Notes

- The personalization logic is strictly guarded to prevent "hallucinations" from breaking the page layout.
- Supports `gpt-4o`, `gemini-2.0-flash`, and `llama-3.1-8b-instant` via environment variables.
- A `mock` provider is available for testing UI flows without consuming AI credits.

---

**Built as a submission for the Troopod AI assignment.**
