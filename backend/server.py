from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
from groq import Groq
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Groq client
groq_client = Groq(api_key=os.environ['GROQ_API_KEY'])

# Initialize embedding model (lightweight for faster performance)
embedding_model = None

def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return embedding_model

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class Email(BaseModel):
    email_id: int
    customer_id: str
    subject: str
    body: str
    tag: Optional[str] = None

class TagRequest(BaseModel):
    customer_id: str
    subject: str
    body: str

class TagResponse(BaseModel):
    predicted_tag: str
    confidence: float
    reasoning: str

class Pattern(BaseModel):
    customer_id: str
    pattern_type: str  # 'pattern' or 'anti_pattern'
    description: str
    keywords: List[str]
    target_tag: Optional[str] = None

class SentimentRequest(BaseModel):
    email_text: str

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    reasoning: str

class PromptVersion(BaseModel):
    version: int
    prompt: str
    results: Optional[List[Dict[str, Any]]] = None

class KBArticle(BaseModel):
    article_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str

class RAGQuery(BaseModel):
    query: str

class RAGResponse(BaseModel):
    query: str
    retrieved_articles: List[Dict[str, Any]]
    answer: str
    confidence: float

# ==================== PART A: EMAIL TAGGING ====================

@api_router.post("/emails/bulk")
async def add_emails_bulk(emails: List[Email]):
    """Add multiple emails to the database"""
    try:
        emails_data = [email.model_dump() for email in emails]
        result = await db.emails.insert_many(emails_data)
        return {"message": f"Added {len(result.inserted_ids)} emails", "count": len(result.inserted_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/emails")
async def get_emails(customer_id: Optional[str] = None):
    """Get all emails or filter by customer_id"""
    try:
        query = {"customer_id": customer_id} if customer_id else {}
        emails = await db.emails.find(query, {"_id": 0}).to_list(1000)
        return emails
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/customers")
async def get_customers():
    """Get list of unique customer IDs"""
    try:
        customers = await db.emails.distinct("customer_id")
        return {"customers": sorted(customers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_customer_tags(customer_id: str) -> List[str]:
    """Get all unique tags for a specific customer (ensures customer isolation)"""
    emails = await db.emails.find({"customer_id": customer_id}, {"tag": 1, "_id": 0}).to_list(1000)
    tags = list(set([email.get("tag") for email in emails if email.get("tag")]))
    return tags

async def get_customer_patterns(customer_id: str) -> Dict[str, List[Pattern]]:
    """Get patterns and anti-patterns for a customer"""
    patterns_data = await db.patterns.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    patterns = [Pattern(**p) for p in patterns_data]
    
    result = {
        "patterns": [p for p in patterns if p.pattern_type == "pattern"],
        "anti_patterns": [p for p in patterns if p.pattern_type == "anti_pattern"]
    }
    return result

@api_router.post("/tag/predict", response_model=TagResponse)
async def predict_tag(request: TagRequest):
    """Predict tag for an email with customer isolation"""
    try:
        # Get customer-specific tags (CUSTOMER ISOLATION)
        available_tags = await get_customer_tags(request.customer_id)
        
        if not available_tags:
            raise HTTPException(status_code=400, detail="No tags found for this customer. Please add training data first.")
        
        # Get customer patterns
        patterns = await get_customer_patterns(request.customer_id)
        
        # Build prompt with patterns and anti-patterns
        pattern_text = ""
        if patterns["patterns"]:
            pattern_text += "\n\nPatterns (signals that help identify tags):\n"
            for p in patterns["patterns"]:
                pattern_text += f"- {p.description}. Keywords: {', '.join(p.keywords)}. Tag: {p.target_tag}\n"
        
        if patterns["anti_patterns"]:
            pattern_text += "\n\nAnti-patterns (common mistakes to avoid):\n"
            for p in patterns["anti_patterns"]:
                pattern_text += f"- {p.description}. Misleading keywords: {', '.join(p.keywords)}\n"
        
        prompt = f"""You are an email classification system for customer support emails.

Customer ID: {request.customer_id}
Available tags for THIS customer ONLY: {', '.join(available_tags)}
{pattern_text}

Email to classify:
Subject: {request.subject}
Body: {request.body}

Rules:
1. You MUST choose ONLY from the available tags listed above
2. Consider the patterns and anti-patterns to improve accuracy
3. Analyze the core issue, not just keywords
4. Provide confidence score (0.0-1.0)

Respond in JSON format:
{{
  "predicted_tag": "<tag from available list>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}}"""
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300
        )
        
        response_text = completion.choices[0].message.content
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return TagResponse(**result)
        else:
            raise HTTPException(status_code=500, detail="Failed to parse LLM response")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/patterns")
async def add_pattern(pattern: Pattern):
    """Add a pattern or anti-pattern for improving tagging accuracy"""
    try:
        pattern_dict = pattern.model_dump()
        await db.patterns.insert_one(pattern_dict)
        return {"message": "Pattern added successfully", "pattern": pattern_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/patterns/{customer_id}")
async def get_patterns(customer_id: str):
    """Get all patterns for a customer"""
    try:
        patterns = await get_customer_patterns(customer_id)
        return patterns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PART B: SENTIMENT ANALYSIS ====================

@api_router.post("/sentiment/analyze", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest, version: int = 1):
    """Analyze sentiment of email text"""
    try:
        if version == 1:
            prompt = f"""Analyze the sentiment of this customer support email.

Email: {request.email_text}

Provide:
1. Sentiment: positive, negative, or neutral
2. Confidence score (0.0-1.0)
3. Brief reasoning

Respond in JSON format:
{{
  "sentiment": "<positive/negative/neutral>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}}"""
        else:  # version 2 - improved
            prompt = f"""You are a sentiment analysis expert for customer support emails.

Email: {request.email_text}

Analyze sentiment considering:
1. Explicit emotion words (frustrated, happy, confused)
2. Issue severity (critical bugs vs. feature requests)
3. Tone indicators (polite questions vs. urgent demands)
4. Context: support emails often express frustration about problems, but requests for help are different from complaints

Rules:
- NEGATIVE: Clear frustration, anger, or dissatisfaction with service
- POSITIVE: Appreciation, satisfaction, or polite feature requests
- NEUTRAL: Factual issue reports, setup questions, informational queries

Respond in JSON format:
{{
  "sentiment": "<positive/negative/neutral>",
  "confidence": <0.0-1.0>,
  "reasoning": "<explain which signals led to this classification>"
}}"""
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=300
        )
        
        response_text = completion.choices[0].message.content
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return SentimentResponse(**result)
        else:
            raise HTTPException(status_code=500, detail="Failed to parse LLM response")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/sentiment/test-batch")
async def test_sentiment_batch(emails: List[str], version: int = 1):
    """Test sentiment analysis on a batch of emails"""
    try:
        results = []
        for email_text in emails:
            result = await analyze_sentiment(SentimentRequest(email_text=email_text), version)
            results.append({
                "email": email_text[:100] + "..." if len(email_text) > 100 else email_text,
                "sentiment": result.sentiment,
                "confidence": result.confidence,
                "reasoning": result.reasoning
            })
        return {"version": version, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PART C: RAG FOR KB ====================

@api_router.post("/kb/articles")
async def add_kb_article(article: KBArticle):
    """Add a knowledge base article"""
    try:
        article_dict = article.model_dump()
        
        # Generate embedding for the article
        model = get_embedding_model()
        text_to_embed = f"{article.title}. {article.content}"
        embedding = model.encode(text_to_embed).tolist()
        article_dict['embedding'] = embedding
        
        await db.kb_articles.insert_one(article_dict)
        return {"message": "Article added successfully", "article_id": article.article_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/kb/articles")
async def get_kb_articles():
    """Get all KB articles"""
    try:
        articles = await db.kb_articles.find({}, {"_id": 0, "embedding": 0}).to_list(100)
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/rag/query", response_model=RAGResponse)
async def rag_query(request: RAGQuery):
    """Query the knowledge base using RAG"""
    try:
        # Generate query embedding
        model = get_embedding_model()
        query_embedding = model.encode(request.query)
        
        # Retrieve all articles with embeddings
        articles = await db.kb_articles.find({}, {"_id": 0}).to_list(100)
        
        if not articles:
            raise HTTPException(status_code=400, detail="No KB articles found. Please add articles first.")
        
        # Calculate similarities
        article_embeddings = np.array([article['embedding'] for article in articles])
        similarities = cosine_similarity([query_embedding], article_embeddings)[0]
        
        # Get top 3 most relevant articles
        top_indices = np.argsort(similarities)[::-1][:3]
        retrieved_articles = []
        
        for idx in top_indices:
            article = articles[idx]
            retrieved_articles.append({
                "article_id": article['article_id'],
                "title": article['title'],
                "content": article['content'],
                "category": article['category'],
                "similarity_score": float(similarities[idx])
            })
        
        # Generate answer using Groq with retrieved context
        context = "\n\n".join([
            f"Article: {art['title']}\nContent: {art['content']}"
            for art in retrieved_articles
        ])
        
        prompt = f"""You are a helpful support assistant. Answer the user's question based on the provided knowledge base articles.

Question: {request.query}

Relevant KB Articles:
{context}

Provide a clear, helpful answer based on the articles. If the articles don't fully answer the question, mention what's available and suggest next steps.

Also provide a confidence score (0.0-1.0) indicating how well the articles answer the question.

Respond in JSON format:
{{
  "answer": "<your detailed answer>",
  "confidence": <0.0-1.0>
}}"""
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=500
        )
        
        response_text = completion.choices[0].message.content
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return RAGResponse(
                query=request.query,
                retrieved_articles=retrieved_articles,
                answer=result["answer"],
                confidence=result["confidence"]
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to parse LLM response")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/kb/initialize-sample")
async def initialize_sample_kb():
    """Initialize KB with sample articles based on email data"""
    try:
        # Check if articles already exist
        existing = await db.kb_articles.count_documents({})
        if existing > 0:
            return {"message": f"KB already has {existing} articles"}
        
        sample_articles = [
            KBArticle(
                title="How to Configure Automations in Hiver",
                content="""Automations in Hiver allow you to automate repetitive tasks. To configure:
1. Go to Settings > Automations
2. Click 'Create New Rule'
3. Define trigger conditions (e.g., subject contains 'refund')
4. Set actions (e.g., assign to specific agent, apply tag)
5. Test your rule before activating
6. Common issues: Rules not triggering - check if conditions are too specific. Duplicate actions - review existing rules for conflicts.""",
                category="automation"
            ),
            KBArticle(
                title="CSAT Scores Not Appearing - Troubleshooting",
                content="""If CSAT scores are not visible in your dashboard:
1. Verify CSAT surveys are enabled in Settings > CSAT
2. Check if surveys were sent (Email Logs section)
3. Ensure sufficient time has passed for customer responses
4. Check dashboard filters - they might be hiding CSAT data
5. Clear browser cache and refresh
6. If issue persists after 24 hours, contact support with your account details.""",
                category="analytics"
            ),
            KBArticle(
                title="Setting Up SLAs in Hiver",
                content="""Service Level Agreements (SLAs) help track response times:
1. Navigate to Settings > SLAs
2. Create SLA policies for different customer tiers (VIP, Standard, etc.)
3. Set target response times (e.g., 2 hours for VIP)
4. Configure breach notifications
5. Apply SLA rules based on customer tags or email properties
6. Monitor SLA compliance in Analytics dashboard.""",
                category="setup"
            ),
            KBArticle(
                title="Shared Mailbox Access Issues",
                content="""If you cannot access a shared mailbox:
1. Verify you have been added to the shared mailbox team
2. Check your role permissions in Settings > Team
3. Try logging out and back in
4. Clear browser cookies
5. Ensure your email is verified
6. Admin users: Go to Shared Mailboxes > Permissions to grant access.""",
                category="access"
            ),
            KBArticle(
                title="Tagging System in Hiver",
                content="""Tags help categorize and organize emails:
1. Create tags in Settings > Tags
2. Apply tags manually or via automation rules
3. Tags are customer-specific and don't cross accounts
4. Use tag filters in views to find related emails
5. Tag suggestions: AI suggests relevant tags based on email content
6. Best practice: Create a consistent tagging taxonomy for your team.""",
                category="tagging"
            ),
            KBArticle(
                title="Email Threading Issues",
                content="""If email threads are not merging correctly:
1. Threads merge based on subject line and participants
2. Check if subject line changed (RE: or FW: prefixes are ignored)
3. Verify sender email address matches
4. Manual merge: Select emails > Actions > Merge threads
5. Threading works best when using Reply (not New email)
6. Contact support if system incorrectly separates related emails.""",
                category="threading"
            ),
            KBArticle(
                title="Performance Optimization",
                content="""If Hiver is loading slowly:
1. Check your internet connection speed
2. Clear browser cache and cookies
3. Disable browser extensions temporarily
4. Try incognito/private mode
5. Update to latest browser version
6. Large mailboxes (10K+ emails) may load slower - use filters
7. Close unused tabs to free memory.""",
                category="performance"
            ),
            KBArticle(
                title="Mail Merge Troubleshooting",
                content="""Mail merge allows sending personalized bulk emails:
1. Prepare CSV with recipient data and column headers
2. Go to Compose > Mail Merge
3. Upload CSV and map columns
4. Preview before sending
5. Common issues: CSV format errors - ensure UTF-8 encoding. Variables not replaced - check column name spelling. Emails not sending - verify sender permissions.""",
                category="mail_merge"
            ),
            KBArticle(
                title="User Management and Permissions",
                content="""Managing team members in Hiver:
1. Admin role required to add/remove users
2. Go to Settings > Team Members
3. Click 'Add Member' and enter email
4. Assign role: Admin, Member, or Guest
5. Set mailbox access permissions
6. Remove users: Select user > Actions > Remove
7. Billing: User count affects subscription cost.""",
                category="user_management"
            ),
            KBArticle(
                title="Workflow Rules and Conditions",
                content="""Creating effective workflow rules:
1. Use specific conditions to avoid unexpected triggers
2. Combine multiple conditions with AND/OR logic
3. Test rules on sample emails before activating
4. Order matters: Rules execute in priority order
5. Anti-patterns: Overly broad conditions causing conflicts. Too many rules slowing system. Circular rules triggering each other.
6. Best practice: Document rule purpose in description field.""",
                category="workflow"
            )
        ]
        
        # Add embeddings and insert
        model = get_embedding_model()
        for article in sample_articles:
            article_dict = article.model_dump()
            text_to_embed = f"{article.title}. {article.content}"
            embedding = model.encode(text_to_embed).tolist()
            article_dict['embedding'] = embedding
            await db.kb_articles.insert_one(article_dict)
        
        return {"message": f"Initialized {len(sample_articles)} sample KB articles"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== UTILITY ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Hiver AI Assignment API"}

@api_router.post("/reset-database")
async def reset_database():
    """Reset all collections (for testing)"""
    try:
        await db.emails.delete_many({})
        await db.patterns.delete_many({})
        await db.kb_articles.delete_many({})
        return {"message": "Database reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()