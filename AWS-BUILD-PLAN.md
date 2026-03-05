# DevMind AWS Migration — Build Plan

> **Goal**: Migrate AI backend from Groq + Neon Postgres + Pinecone → AWS Lambda + DynamoDB + Bedrock
> **Region**: us-east-1
> **Constraint**: Simple serverless only (no ECS/K8s)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   NEXT.JS APP (existing)                │
│                                                         │
│  Editor → DevMindTrace/Explain/Docs/Practice            │
│     │                                                   │
│     ▼                                                   │
│  /api/devmind/* routes (MODIFIED — proxy to AWS)        │
└─────────────┬───────────────────────────────────────────┘
              │ HTTPS POST
              ▼
┌─────────────────────────────────────────────────────────┐
│              API GATEWAY (REST API)                     │
│              POST /analyze                              │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│              AWS LAMBDA (Node.js 20)                    │
│              "devmind-ai-orchestrator"                   │
│                                                         │
│  1. SHA256 hash (code + error + actionType)             │
│  2. Check DynamoDB cache → if hit, return               │
│  3. Call Bedrock (DeepSeek R1 primary)                  │
│  4. If confidence < 0.6 → retry with Nova Pro           │
│  5. Store response in cache                             │
│  6. Store learning profile entry                        │
│  7. Log CloudWatch metrics                              │
│  8. Return structured JSON                              │
└──────┬──────────┬──────────────┬────────────────────────┘
       │          │              │
       ▼          ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ DynamoDB │ │ DynamoDB │ │  Amazon Bedrock   │
│ Cache    │ │ Learning │ │                   │
│ Table    │ │ Profile  │ │ Claude 3 Haiku    │
│          │ │ Table    │ │ Claude 3 Sonnet   │
└──────────┘ └──────────┘ └──────────────────┘
                              │
                              ▼
                         CloudWatch
                         (custom metrics)
```

---

## What Changes vs What Stays

### STAYS (zero changes)
- [x] All frontend pages (editor, devmind/*)
- [x] DevMindPanel, DevMindTrace, DevMindExplain, DevMindDocs, DevMindPractice components
- [x] Editor page (page.tsx)
- [x] E2B sandbox (code execution)
- [x] Firebase auth

### CHANGES
- [ ] `/api/devmind/debug/route.ts` — proxy to API Gateway (actionType: "fix")
- [ ] `/api/devmind/explain/route.ts` — proxy to API Gateway (actionType: "explain")
- [ ] `/api/devmind/quiz/route.ts` — proxy to API Gateway (actionType: "quiz")
- [ ] `/api/devmind/docs/route.ts` — proxy to API Gateway (actionType: "docs")
- [ ] `/api/devmind/analytics/route.ts` — query DynamoDB directly (no LLM)
- [ ] `/api/devmind/memory/route.ts` — query DynamoDB directly (no LLM)

### NEW (AWS infrastructure)
- [ ] Lambda function code
- [ ] DynamoDB table: CodeAnalysisCache
- [ ] DynamoDB table: UserLearningProfile
- [ ] API Gateway REST API
- [ ] IAM role for Lambda
- [ ] CloudWatch custom metrics

### REMOVED (after migration)
- [ ] `groq-sdk` dependency (replaced by Bedrock)
- [ ] `@pinecone-database/pinecone` (replaced by DynamoDB)
- [ ] `@prisma/adapter-neon` + `@neondatabase/serverless` (replaced by DynamoDB)
- [ ] Prisma schema + generated client (for DevMind tables)
- [ ] `GROQ_API_KEY`, `PINECONE_API_KEY` env vars

---

## Build Phases

### PHASE 0: AWS Account Setup (Prerequisites)
**Time: ~15 min**

- [ ] 0.1 — Log into AWS Console (us-east-1)
- [ ] 0.2 — Enable Amazon Bedrock model access:
  - Go to Bedrock → Model access → Request access
  - Enable: `us.deepseek.r1-v1:0` (DeepSeek R1)
  - Enable: `amazon.nova-pro-v1:0` (Amazon Nova Pro — fallback)
  - Wait for "Access granted" (usually instant)
- [ ] 0.3 — Install AWS CLI locally (if not installed)
  ```
  winget install Amazon.AWSCLI
  ```
- [ ] 0.4 — Configure AWS credentials:
  ```
  aws configure
  # Enter: Access Key ID, Secret Access Key, Region: us-east-1, Output: json
  ```
- [ ] 0.5 — Verify credentials work:
  ```
  aws sts get-caller-identity
  ```

---

### PHASE 1: DynamoDB Tables
**Time: ~10 min**

#### Table 1: CodeAnalysisCache

| Setting | Value |
|---|---|
| Table name | `DevMind-CodeAnalysisCache` |
| Partition key | `requestHash` (String) |
| Billing mode | Pay-per-request (on-demand) |
| TTL attribute | `ttl` (auto-expire after 24h) |

Attributes stored per item:
```json
{
  "requestHash": "sha256-hex-string",
  "response": "{ full JSON response }",
  "modelUsed": "claude-3-haiku",
  "tokenCount": 450,
  "actionType": "explain",
  "timestamp": "2026-03-05T10:00:00Z",
  "ttl": 1741305600
}
```

- [ ] 1.1 — Create table via CLI:
  ```bash
  aws dynamodb create-table \
    --table-name DevMind-CodeAnalysisCache \
    --attribute-definitions AttributeName=requestHash,AttributeType=S \
    --key-schema AttributeName=requestHash,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
  ```
- [ ] 1.2 — Enable TTL:
  ```bash
  aws dynamodb update-time-to-live \
    --table-name DevMind-CodeAnalysisCache \
    --time-to-live-specification Enabled=true,AttributeName=ttl
  ```

#### Table 2: UserLearningProfile

| Setting | Value |
|---|---|
| Table name | `DevMind-UserLearningProfile` |
| Partition key | `userId` (String) |
| Sort key | `errorKey` (String) — format: `{errorType}_{timestamp}` |
| Billing mode | Pay-per-request |

Attributes stored per item:
```json
{
  "userId": "user-abc123",
  "errorKey": "ReferenceError_2026-03-05T10:00:00Z",
  "language": "javascript",
  "errorType": "ReferenceError",
  "conceptGap": "Variable scope",
  "attemptCount": 1,
  "resolved": false,
  "confidenceScore": 0.82,
  "code": "first 500 chars...",
  "timestamp": "2026-03-05T10:00:00Z"
}
```

- [ ] 1.3 — Create table via CLI:
  ```bash
  aws dynamodb create-table \
    --table-name DevMind-UserLearningProfile \
    --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=errorKey,AttributeType=S \
    --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=errorKey,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
  ```

---

### PHASE 2: IAM Role for Lambda
**Time: ~5 min**

- [ ] 2.1 — Create IAM role `DevMind-Lambda-Role` with policies:
  - `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
  - Custom inline policy for:
    - `dynamodb:GetItem`, `PutItem`, `Query`, `UpdateItem` on both tables
    - `bedrock:InvokeModel` on Claude models
    - `cloudwatch:PutMetricData`
- [ ] 2.2 — Note the Role ARN

---

### PHASE 3: Lambda Function
**Time: ~45 min (biggest phase)**

#### Project structure:
```
aws-lambda/
├── index.mjs              ← Main handler (entry point)
├── bedrock.mjs             ← Bedrock API calls
├── cache.mjs               ← DynamoDB cache logic
├── memory.mjs              ← DynamoDB learning profile logic
├── metrics.mjs             ← CloudWatch metrics
├── prompts.mjs             ← System prompts for each actionType
├── package.json            ← Dependencies (@aws-sdk/*)
└── deploy.sh               ← Zip + upload script
```

#### Lambda handler flow:
```
Request → validate → hash → cache check
  ├── cache HIT → return cached response
  └── cache MISS → build prompt → call Bedrock (DeepSeek R1)
       ├── confidence ≥ 0.6 → store cache + store profile → return
       └── confidence < 0.6 → retry Bedrock (Nova Pro)
            → store cache + store profile → return
```

- [ ] 3.1 — Create `aws-lambda/` folder in project
- [ ] 3.2 — Write `package.json` with AWS SDK deps
- [ ] 3.3 — Write `prompts.mjs` — system prompts for fix/explain/quiz/docs
- [ ] 3.4 — Write `bedrock.mjs` — Bedrock InvokeModel wrapper
- [ ] 3.5 — Write `cache.mjs` — SHA256 hashing + DynamoDB get/put
- [ ] 3.6 — Write `memory.mjs` — UserLearningProfile read/write
- [ ] 3.7 — Write `metrics.mjs` — CloudWatch PutMetricData
- [ ] 3.8 — Write `index.mjs` — Main orchestrator handler
- [ ] 3.9 — Install deps and create deployment zip
- [ ] 3.10 — Deploy Lambda via CLI

---

### PHASE 4: API Gateway
**Time: ~10 min**

- [ ] 4.1 — Create REST API: `DevMind-API`
- [ ] 4.2 — Create resource: `/analyze`
- [ ] 4.3 — Create POST method → Lambda integration
- [ ] 4.4 — Enable CORS
- [ ] 4.5 — Deploy to stage: `prod`
- [ ] 4.6 — Note the invoke URL: `https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/analyze`

---

### PHASE 5: Connect Next.js to API Gateway
**Time: ~20 min**

- [ ] 5.1 — Add env var: `AWS_API_GATEWAY_URL` to `.env.local`
- [ ] 5.2 — Create `lib/devmind/aws/gateway.ts` — utility to call API Gateway
- [ ] 5.3 — Update `/api/devmind/debug/route.ts`:
  - Send to API Gateway with `actionType: "fix"`
  - Map response back to existing `DebugResponse` format
- [ ] 5.4 — Update `/api/devmind/explain/route.ts`:
  - Send to API Gateway with `actionType: "explain"`
  - Map response back to existing explain format
- [ ] 5.5 — Update `/api/devmind/quiz/route.ts`:
  - Send to API Gateway with `actionType: "quiz"`
  - Map response back to existing quiz format
- [ ] 5.6 — Update `/api/devmind/docs/route.ts`:
  - Send to API Gateway with `actionType: "docs"`
  - Map response back to existing docs format
- [ ] 5.7 — Update `/api/devmind/analytics/route.ts`:
  - Call DynamoDB directly via AWS SDK (no Lambda needed)
  - Query UserLearningProfile for user stats
- [ ] 5.8 — Update `/api/devmind/memory/route.ts`:
  - Call DynamoDB directly via AWS SDK
  - Query recent learning entries

---

### PHASE 6: CloudWatch Dashboard (Optional Polish)
**Time: ~10 min**

- [ ] 6.1 — Lambda logs custom metrics:
  - `DevMind/TotalRequests`
  - `DevMind/CacheHits`
  - `DevMind/CacheMisses`
  - `DevMind/BedrockCalls`
  - `DevMind/ModelUpgrades` (DeepSeek R1 → Nova Pro)
  - `DevMind/AverageLatency`
- [ ] 6.2 — Create CloudWatch dashboard with widgets

---

### PHASE 7: Testing & Verification
**Time: ~15 min**

- [ ] 7.1 — Test Lambda directly (AWS Console test event)
- [ ] 7.2 — Test via API Gateway (curl/Postman)
- [ ] 7.3 — Test from Next.js (editor → trace → explain)
- [ ] 7.4 — Verify cache works (same request = instant response)
- [ ] 7.5 — Verify learning profile stores (check DynamoDB items)
- [ ] 7.6 — Verify model routing (low confidence triggers Sonnet)
- [ ] 7.7 — Verify CloudWatch metrics appear

---

## Environment Variables Needed

### New (add to `.env.local`)
```env
AWS_API_GATEWAY_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Keep (still needed)
```env
E2B_API_KEY=...          # Code execution still uses E2B
NEXT_PUBLIC_FIREBASE_*=...  # Auth still uses Firebase
```

### Remove (after migration verified)
```env
GROQ_API_KEY=...         # Replaced by Bedrock
PINECONE_API_KEY=...     # Replaced by DynamoDB
PINECONE_INDEX=...       # Replaced by DynamoDB
DATABASE_URL=...         # Replaced by DynamoDB (Neon Postgres)
```

---

## Dependencies Changes

### Add to Next.js `package.json`
```json
"@aws-sdk/client-dynamodb": "^3.x",
"@aws-sdk/lib-dynamodb": "^3.x"
```
(Only needed if analytics/memory routes query DynamoDB directly)

### Lambda `package.json` (separate)
```json
"@aws-sdk/client-bedrock-runtime": "^3.x",
"@aws-sdk/client-dynamodb": "^3.x",
"@aws-sdk/lib-dynamodb": "^3.x",
"@aws-sdk/client-cloudwatch": "^3.x"
```

### Remove from Next.js (after migration)
```json
"groq-sdk"
"@pinecone-database/pinecone"
"@prisma/adapter-neon"
"@neondatabase/serverless"
```

---

## Estimated Total Time: ~2 hours

| Phase | Time |
|---|---|
| Phase 0: AWS Setup | 15 min |
| Phase 1: DynamoDB | 10 min |
| Phase 2: IAM Role | 5 min |
| Phase 3: Lambda | 45 min |
| Phase 4: API Gateway | 10 min |
| Phase 5: Connect Next.js | 20 min |
| Phase 6: CloudWatch | 10 min |
| Phase 7: Testing | 15 min |

---

## Risk Mitigation

1. **Bedrock model access delay** — Request access FIRST (Phase 0). Usually instant but can take hours.
2. **Fallback to Groq** — Keep Groq code until AWS is fully verified. Can toggle via env var.
3. **DynamoDB query limitations** — No complex aggregations like Postgres. Analytics route will need simpler queries (scan with filter).
4. **Lambda cold start** — First request ~2-3s. Use provisioned concurrency if needed (usually fine for demo).
5. **API Gateway timeout** — Default 29s max. Bedrock calls usually 3-10s, well within limit.

---

## Hackathon Judging Points This Covers

| Criteria | How We Address It |
|---|---|
| **Implementation depth** | Full Lambda + DynamoDB + Bedrock pipeline, not just API wrapper |
| **Real AWS architecture** | 5 AWS services (Bedrock, Lambda, API Gateway, DynamoDB, CloudWatch) |
| **GenAI load-bearing** | AI does the actual debugging, explaining, quiz generation — core product |
| **Cost efficiency** | SHA256 caching, model routing (cheap → expensive), DynamoDB on-demand, TTL cleanup |
| **Smart design** | Learning memory, confidence-based model selection, structured responses |
