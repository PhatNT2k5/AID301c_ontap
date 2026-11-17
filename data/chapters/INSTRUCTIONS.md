# Chapter content + video script task (AID301c, Vietnamese)

AID301c (FPT University) has no public slides/syllabus. Its exam content follows the IBM "AI Enterprise Workflow" specialization on Coursera (6 courses; case study: streaming company AAVAIL). The study site has 6 chapters, one per IBM course:

1. Quy trình AI doanh nghiệp & thu thập dữ liệu — IBM Course 1 "AI Workflow: Business Priorities and Data Ingestion"
2. Phân tích dữ liệu & kiểm định giả thuyết — IBM Course 2 "AI Workflow: Data Analysis and Hypothesis Testing"
3. Feature engineering & phát hiện bias — IBM Course 3 "AI Workflow: Feature Engineering and Bias Detection"
4. Machine learning, nhận dạng hình ảnh & NLP — IBM Course 4 "AI Workflow: Machine Learning, Visual Recognition and NLP"
5. Triển khai mô hình doanh nghiệp — IBM Course 5 "AI Workflow: Enterprise Model Deployment"
6. AI trong vận hành (AI in Production) — IBM Course 6 "AI Workflow: AI in Production"

## Inputs
- Question bank (English, with answers): `C:\Users\phath\Desktop\AID301c\web\data\merged.json`. Search it (grep / python) for your chapter's topics: the chapter MUST teach the concepts these exam questions test (e.g. design thinking phases, SMOTE, classification_report, Docker commands, unittest, Watson OpenScale…). Note specific facts the questions rely on and cover them.
- Web: use WebSearch / web-fetch to confirm facts and to collect REAL source URLs (Coursera course pages, IBM docs, scikit-learn / scipy / imbalanced-learn / Docker / Flask / Spark / Python docs). Only list URLs you have confirmed exist.

## Output
For each of your chapters write `C:\Users\phath\Desktop\AID301c\web\data\chapters\ch<N>.json` (UTF-8, ensure_ascii=False):
{
  "id": N,
  "title": "<Vietnamese title as above>",
  "ibmCourse": "IBM AI Workflow – Course N: <English course name>",
  "intro": "2–3 sentence Vietnamese overview",
  "keyPoints": [ {"heading": "Vietnamese heading", "body": "Vietnamese paragraphs separated by \n; concrete facts, definitions, examples; English technical terms kept"} ],   // 6–9 key points, thorough enough to answer the exam questions
  "sources": [ {"label": "Readable name", "url": "https://..."} ],   // 4–8 confirmed URLs, first = Coursera course page
  "slides": [
    {"title": "short Vietnamese slide title", "bullets": ["≤ 12 words each", "3–5 bullets"], "code": "optional short code snippet (≤ 8 lines) to show on the slide", "narration": "Vietnamese spoken narration for this slide"}
  ]
}
Video script rules:
- 9–11 slides: slide 1 = chapter title + what you will learn; last slide = recap + exam tips (common traps from the question bank).
- Total narration across slides: 900–1050 Vietnamese words (space-separated syllables) ≈ 5 minutes of speech. Check with python (len(text.split())).
- Narration is natural spoken Vietnamese for a TTS voice: full sentences, no markdown, no bullet symbols, no code read aloud character by character, no URLs. Keep English technical terms (e.g. "Docker", "precision") but avoid long English phrases; spell out acronyms only if natural. Numbers as digits are fine.
- Bullets/titles are what appears on screen; narration explains them.

Validate JSON parses and word counts; report briefly: per chapter number of slides, narration word count, list of sources.
