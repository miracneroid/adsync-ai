import os
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AdSync AI Processor",
    description="Microservice for preprocessing ad creatives using Groq LLM",
    version="1.0.0"
)

# CORS configuration for development and production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://adsyncai.netlify.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("Warning: GROQ_API_KEY not found in environment variables.")

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# --- Pydantic Models for Validation ---

class AdAnalysisRequest(BaseModel):
    ad_text: str = Field(..., min_length=5, description="The raw text of the advertisement")

class AdAnalysisResponse(BaseModel):
    offer: str = Field(..., description="The main offer or discount identified")
    product: str = Field(..., description="The product or service being advertised")
    urgency: Optional[str] = Field(None, description="Any urgency or time-limited factors")
    call_to_action: str = Field(..., description="The primary action expected from the user")

# --- Endpoints ---

@app.get("/")
async def root():
    return {"status": "online", "message": "AdSync AI Processor is running"}

@app.post("/analyze-ad", response_model=AdAnalysisResponse)
async def analyze_ad(request: AdAnalysisRequest):
    """
    Analyzes raw ad text and returns structured intent data using Groq.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    try:
        # Construct the system prompt for structured JSON extraction
        system_prompt = """
        You are an expert ad copy analyst. Your job is to extract structured intent data from raw ad text.
        You must return ONLY a valid JSON object with the following fields:
        - offer: The main discount or value proposition (e.g., '50% off', 'Buy 1 Get 1').
        - product: The name or type of the product/service.
        - urgency: Any deadline or limited-time mention (e.g., 'Today only', 'Limited stock').
        - call_to_action: The specific button or link text (e.g., 'Shop Now', 'Register').

        Rules:
        1. If a field is not found, use "None".
        2. Do not include any explanation or markdown code blocks.
        3. Ensure the JSON is valid.
        """

        user_prompt = f"Ad Creative Text:\n\"\"\"\n{request.ad_text}\n\"\"\""

        # Call Groq API
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # Low temperature for more deterministic output
            response_format={"type": "json_object"}  # Ensure JSON output
        )

        # Parse the JSON response
        raw_response = completion.choices[0].message.content
        structured_data = json.loads(raw_response)

        return structured_data

    except Exception as e:
        print(f"Error during AI processing: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to analyze ad creative: {str(e)}"
        )

# --- Run instructions (included in comments for visibility) ---
# 1. Create virtual env: python3 -m venv venv
# 2. Activate: source venv/bin/activate
# 3. Install: pip install -r requirements.txt
# 4. Run: uvicorn main:app --reload --port 8001
