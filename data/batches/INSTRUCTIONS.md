# Annotation task (AID301c question bank)

Course context: FPT University course AID301c follows the IBM "AI Enterprise Workflow" specialization (Coursera, 6 courses), with the fictional streaming company AAVAIL as case study.

Read your batch file (JSON array). For EVERY question, produce one annotation object. Work through all questions; do not skip.

## Output
Write a JSON array (UTF-8, `ensure_ascii=False`) to the output path you were given, one object per input question, same order:
{
  "id": "<same id>",
  "chapterId": 1-6,
  "aiAnswer": ["B"],          // YOUR own best answer (option keys), solved independently from knowledge of ML / Python / IBM AI Workflow
  "agree": true,              // true if aiAnswer equals the given "answer" (always false when answer is null)
  "confidence": "high" | "medium" | "low",
  "explanation": "...",       // Vietnamese, see below
  "reviewNote": "..."         // Vietnamese, ONLY when agree=false or conflict=true or confidence low: 1-2 sentences on why the source answer may be wrong / which answer is more defensible
}

## Explanation rules (Vietnamese)
- 2–4 sentences, plain Vietnamese; keep technical terms in English (e.g. "precision", "Docker image", "p-value").
- Explain WHY the correct answer is right and briefly why the most tempting wrong option(s) are wrong, naming them by content (and letter in parentheses).
- The explanation must justify the answer that will be SHOWN to students: the given "answer" if it exists and you agree; if you disagree with the given answer, explain the given answer is from the source, then state which answer you believe is correct and why (the student will review it). If answer is null, explain your aiAnswer.
- For code questions explain what the code does. No markdown, no bullet lists; plain text, may use "\n" between 2 short paragraphs.

## Chapters (pick the best fit)
1. Quy trình AI doanh nghiệp & thu thập dữ liệu (Course 1 Business Priorities & Data Ingestion): process models (CRISP-DM, design thinking phases Empathize/Define/Ideate/Prototype/Test, IBM Design Thinking), business opportunity/scientific thinking, course prerequisites, Python basics & data types, pandas data munging, data ingestion pipelines, sparse matrices, file formats/databases.
2. Phân tích dữ liệu & kiểm định giả thuyết (Course 2): EDA, missing values/imputation, visualization, distributions (scipy.stats), probability, hypothesis testing, t-test/z-test/chi-square, p-value, multiple testing, Bayesian ideas.
3. Feature engineering & bias (Course 3): class imbalance (SMOTE, under/over-sampling, imbalanced-learn), scaling/transforms, dimensionality reduction (PCA, NMF, t-SNE), topic modeling, clustering, outlier/anomaly detection, bias & fairness in data.
4. Machine learning, visual recognition & NLP (Course 4): supervised models (regression, classification, trees, ensembles, SVM), evaluation metrics (accuracy/precision/recall/F1, confusion matrix, classification_report), cross-validation, grid search, sklearn Pipeline, overfitting/regularization, neural networks/CNN, transfer learning, Watson Visual Recognition, NLP (tokenization, TF-IDF, embeddings).
5. Triển khai mô hình (Course 5 Enterprise Model Deployment): Docker/containers, Flask/REST API, model serialization (joblib/pickle), Spark/PySpark/Spark ML, recommender systems (collaborative filtering, ALS, cold start), Watson Studio / Watson Machine Learning deployment.
6. AI in production (Course 6): unit testing (unittest), logging, performance monitoring, data/model drift, business metrics, Watson OpenScale, Kubernetes/Red Hat OpenShift, CI/CD, capstone.

When done: validate the output parses, has the same ids in the same order, every aiAnswer key exists in options, chapterId in 1..6. Report briefly: count, number of disagreements (ids), number of low-confidence (ids).
