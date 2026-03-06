# 🚀 DevMinds — Complete AWS Deployment & Implementation Guide

> **Project**: DevMinds – AI-Powered Multi-Agent Code Debugger Platform  
> **Stack**: Next.js 16.1 · React 19 · TypeScript · Prisma · Inngest · E2B · Gemini AI  
> **Target**: Full production deployment on Amazon Web Services (AWS)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [AWS Service Mapping](#2-aws-service-mapping)
3. [Prerequisites & Accounts](#3-prerequisites--accounts)
4. [Phase 1 — Infrastructure Setup](#4-phase-1--infrastructure-setup)
5. [Phase 2 — Database & Storage](#5-phase-2--database--storage)
6. [Phase 3 — Authentication](#6-phase-3--authentication)
7. [Phase 4 — Application Hosting](#7-phase-4--application-hosting)
8. [Phase 5 — Workflow Engine (Inngest Replacement)](#8-phase-5--workflow-engine-inngest-replacement)
9. [Phase 6 — AI & External Services](#9-phase-6--ai--external-services)
10. [Phase 7 — CDN & Static Assets](#10-phase-7--cdn--static-assets)
11. [Phase 8 — Secrets & Configuration](#11-phase-8--secrets--configuration)
12. [Phase 9 — CI/CD Pipeline](#12-phase-9--cicd-pipeline)
13. [Phase 10 — Monitoring & Observability](#13-phase-10--monitoring--observability)
14. [Security Hardening](#14-security-hardening)
15. [Cost Estimation](#15-cost-estimation)
16. [Deployment Checklist](#16-deployment-checklist)

---

## 1. Architecture Overview

### Current Architecture (Vercel-based)

```
 Users
   │
   ▼
Vercel (Next.js Host)         ← Frontend + API Routes
   │
   ├──► Supabase (PostgreSQL + Auth + Storage)
   ├──► Inngest (Multi-Agent Workflow Engine)
   ├──► E2B (Code Execution Sandboxes)
   ├──► Google Gemini AI (LLM)
   ├──► Groq (LLM)
   ├──► Pinecone (Vector DB)
   └──► Firebase (Auth/Firestore)
```

### Target AWS Architecture

```
 Users
   │
   ▼
Amazon CloudFront (CDN + WAF)
   │
   ├──► AWS Amplify / App Runner  ← Next.js Application
   │         │
   │         ├──► Amazon RDS Aurora PostgreSQL   ← Database
   │         ├──► Amazon ElastiCache (Redis)     ← Session Cache
   │         ├──► Amazon S3                      ← File Storage
   │         ├──► Amazon Cognito                 ← Authentication
   │         ├──► AWS Step Functions             ← Multi-Agent Workflows
   │         ├──► AWS Lambda                     ← Serverless Functions
   │         ├──► AWS Secrets Manager            ← Credentials
   │         └──► Amazon EventBridge             ← Event Bus
   │
   └──► External (Unchanged)
             ├──► E2B Sandboxes (Code Execution)
             ├──► Google Gemini AI
             ├──► Groq
             └──► Pinecone
```

---

## 2. AWS Service Mapping

| Current Service                           | AWS Equivalent                                | Purpose                   |
| ----------------------------------------- | --------------------------------------------- | ------------------------- |
| Vercel Hosting                            | **AWS Amplify** or **AWS App Runner**         | Next.js application host  |
| Supabase PostgreSQL                       | **Amazon RDS Aurora Serverless v2**           | Primary database          |
| Supabase Auth                             | **Amazon Cognito**                            | User authentication       |
| Supabase Storage                          | **Amazon S3**                                 | File and asset storage    |
| Inngest Workflow Engine                   | **AWS Step Functions** + **EventBridge**      | Multi-agent orchestration |
| Inngest Event Queue                       | **Amazon SQS**                                | Message queuing           |
| File-based user store (`data/users.json`) | **Cognito User Pool**                         | User identity store       |
| Vercel Edge Config / env vars             | **AWS Secrets Manager** + **Parameter Store** | Secrets management        |
| Vercel CDN                                | **Amazon CloudFront**                         | Global CDN                |
| Vercel Analytics                          | **Amazon CloudWatch** + **AWS X-Ray**         | Monitoring                |
| Neon serverless adapter                   | **RDS Proxy** (connection pooling)            | DB connection pooling     |

> **Note:** E2B Sandboxes, Google Gemini AI, Groq, and Pinecone remain as external services  
> since they provide specialized capabilities not available natively in AWS.

---

## 3. Prerequisites & Accounts

### Required Accounts

- [ ] AWS Account with billing configured
- [ ] AWS IAM user with AdministratorAccess (for initial setup)
- [ ] E2B Account — https://e2b.dev
- [ ] Google AI Studio API Key — https://aistudio.google.com
- [ ] Groq API Key — https://console.groq.com
- [ ] Pinecone Account — https://pinecone.io
- [ ] Google OAuth App (for social login)

### Required Tools — Install on Your Machine

```powershell
# AWS CLI v2
winget install Amazon.AWSCLI

# Node.js 20+
winget install OpenJS.NodeJS.LTS

# AWS CDK (Infrastructure as Code)
npm install -g aws-cdk

# AWS Amplify CLI
npm install -g @aws-amplify/cli

# Docker Desktop (for container builds)
winget install Docker.DockerDesktop

# Verify installations
aws --version
cdk --version
amplify --version
docker --version
```

### Configure AWS CLI

```powershell
# Configure with your AWS credentials
aws configure

# When prompted, enter:
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## 4. Phase 1 — Infrastructure Setup

### 4.1 Create AWS CDK Project for Infrastructure

Create a separate `infrastructure/` folder next to your project:

```powershell
mkdir d:\Projects\DevMinds-Infrastructure
cd d:\Projects\DevMinds-Infrastructure
cdk init app --language typescript
npm install @aws-cdk/aws-amplify-alpha
```

### 4.2 VPC and Networking

Create `infrastructure/lib/vpc-stack.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "DevMindsVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // For RDS
        },
      ],
    });

    new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
  }
}
```

### 4.3 Bootstrap CDK

```powershell
# Bootstrap CDK in your AWS account (run once per account/region)
cdk bootstrap aws://<YOUR_ACCOUNT_ID>/us-east-1
```

---

## 5. Phase 2 — Database & Storage

### 5.1 Amazon RDS Aurora PostgreSQL (Replaces Supabase)

Create `infrastructure/lib/database-stack.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  public readonly dbSecret: secretsmanager.Secret;
  public readonly dbCluster: rds.DatabaseCluster;

  constructor(
    scope: Construct,
    id: string,
    vpc: ec2.Vpc,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    // Create DB credentials secret
    this.dbSecret = new secretsmanager.Secret(this, "DevMindsDbSecret", {
      secretName: "devminds/db-credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "devminds_admin" }),
        generateStringKey: "password",
        excludePunctuation: true,
        includeSpace: false,
      },
    });

    // Aurora PostgreSQL Serverless v2 (scales to zero when idle)
    this.dbCluster = new rds.DatabaseCluster(this, "DevMindsDb", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      defaultDatabaseName: "devminds",
      serverlessV2MinCapacity: 0.5, // Minimum ACU (cost-saving)
      serverlessV2MaxCapacity: 16, // Maximum ACU (for scaling)
      writer: rds.ClusterInstance.serverlessV2("writer"),
      readers: [
        rds.ClusterInstance.serverlessV2("reader", { scaleWithWriter: true }),
      ],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      backup: { retention: cdk.Duration.days(7) },
      deletionProtection: true,
    });

    // RDS Proxy for connection pooling (replaces Neon serverless adapter)
    const proxy = new rds.DatabaseProxy(this, "DevMindsDbProxy", {
      proxyTarget: rds.ProxyTarget.fromCluster(this.dbCluster),
      secrets: [this.dbSecret],
      vpc,
      requireTLS: true,
      idleClientTimeout: cdk.Duration.minutes(10),
    });

    new cdk.CfnOutput(this, "DbProxyEndpoint", {
      value: proxy.endpoint,
      exportName: "DevMindsDbProxyEndpoint",
    });
  }
}
```

### 5.2 Update Prisma Schema for RDS

Edit your `prisma/schema.prisma` to use the RDS connection:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  # Remove the Neon adapter — RDS Proxy handles connection pooling natively
}
```

Your `DATABASE_URL` format for RDS Proxy:

```
postgresql://devminds_admin:<PASSWORD>@<RDS_PROXY_ENDPOINT>:5432/devminds?sslmode=require
```

### 5.3 Run Prisma Migrations Against RDS

```powershell
# Set DATABASE_URL to your RDS endpoint temporarily
$env:DATABASE_URL = "postgresql://devminds_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/devminds?sslmode=require"

# Generate Prisma client
npx prisma generate

# Run all migrations
npx prisma migrate deploy

# Seed initial data (if any)
npx prisma db seed
```

### 5.4 Amazon S3 for File Storage (Replaces Supabase Storage)

```typescript
// infrastructure/lib/storage-stack.ts
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class StorageStack extends cdk.Stack {
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.assetsBucket = new s3.Bucket(this, "DevMindsAssets", {
      bucketName: `devminds-assets-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "DeleteOldVersions",
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.assetsBucket.bucketName,
    });
  }
}
```

---

## 6. Phase 3 — Authentication

### 6.1 Amazon Cognito User Pool (Replaces NextAuth + Firebase Auth)

```typescript
// infrastructure/lib/auth-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "DevMindsUserPool", {
      userPoolName: "devminds-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Google OAuth Identity Provider
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleProvider",
      {
        userPool: this.userPool,
        clientId: cdk.SecretValue.secretsManager("devminds/google-oauth", {
          jsonField: "clientId",
        }).toString(),
        clientSecretValue: cdk.SecretValue.secretsManager(
          "devminds/google-oauth",
          {
            jsonField: "clientSecret",
          },
        ),
        scopes: ["email", "profile", "openid"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
        },
      },
    );

    // App client for Next.js
    this.userPoolClient = this.userPool.addClient("DevMindsNextApp", {
      userPoolClientName: "devminds-nextjs",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          "http://localhost:3000/api/auth/callback/cognito",
          "https://your-domain.com/api/auth/callback/cognito",
        ],
        logoutUrls: ["http://localhost:3000", "https://your-domain.com"],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
```

### 6.2 Update NextAuth to use Cognito

Install the Cognito NextAuth provider:

```powershell
npm install next-auth @auth/core
```

Update `lib/auth.ts`:

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
});

export const authOptions: NextAuthOptions = {
  providers: [
    // Cognito OAuth (Google federated login flows through Cognito)
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    }),

    // Email/Password via Cognito USER_PASSWORD_AUTH
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const command = new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: process.env.COGNITO_CLIENT_ID!,
          AuthParameters: {
            USERNAME: credentials!.email,
            PASSWORD: credentials!.password,
          },
        });
        const response = await cognitoClient.send(command);
        const idToken = response.AuthenticationResult?.IdToken;
        if (!idToken) return null;

        // Decode token to extract user info (JWT – no signature verification needed client-side)
        const payload = JSON.parse(
          Buffer.from(idToken.split(".")[1], "base64").toString(),
        );
        return { id: payload.sub, email: payload.email, name: payload.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },
};
```

Install AWS SDK for Cognito:

```powershell
npm install @aws-sdk/client-cognito-identity-provider
```

---

## 7. Phase 4 — Application Hosting

### Option A: AWS Amplify (Recommended for Next.js — Easiest)

AWS Amplify provides first-class Next.js 14+ SSR support including App Router.

#### Step 1: Connect Repository

```powershell
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize in your project
cd d:\Projects\DevMinds
amplify init

# Answer the prompts:
# Project name: devminds
# Environment: prod
# Default editor: Visual Studio Code
# App type: javascript
# Framework: react
# Source directory: app
# Build command: npm run build
# Start command: npm start
```

#### Step 2: Create Amplify App via AWS Console

1. Go to **AWS Console → Amplify → New App → Host Web App**
2. Connect to your **GitHub/GitLab/Bitbucket** repository
3. Select your **main/production branch**
4. Configure build settings (Amplify auto-detects Next.js):

```yaml
# amplify.yml (Amplify auto-generates this — customize as needed)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npx prisma generate
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

#### Step 3: Set Environment Variables in Amplify

In **Amplify Console → App → Environment Variables**, add all secrets:

```
DATABASE_URL=postgresql://...@<RDS_PROXY_ENDPOINT>:5432/devminds?sslmode=require
NEXTAUTH_URL=https://your-amplify-domain.amplifyapp.com
NEXTAUTH_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
COGNITO_CLIENT_ID=<from CDK output>
COGNITO_CLIENT_SECRET=<from Cognito>
COGNITO_USER_POOL_ID=<from CDK output>
AWS_REGION=us-east-1
GOOGLE_GENERATIVE_AI_API_KEY=<your Gemini key>
GROQ_API_KEY=<your Groq key>
E2B_API_KEY=<your E2B key>
PINECONE_API_KEY=<your Pinecone key>
PINECONE_INDEX=<your index name>
AWS_S3_BUCKET=devminds-assets-<account-id>
INNGEST_API_KEY=<keep or replace with Step Functions>
```

---

### Option B: AWS App Runner (Container-based, More Control)

#### Step 1: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Update `next.config.ts` to enable standalone output:

```typescript
const nextConfig: NextConfig = {
  output: "standalone", // Add this line
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("e2b");
      }
    }
    return config;
  },
};
```

#### Step 2: Push to Amazon ECR

```powershell
# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name devminds --region us-east-1

# Build image
docker build -t devminds .

# Tag and push
docker tag devminds:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devminds:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devminds:latest
```

#### Step 3: Deploy to App Runner

```powershell
# Create App Runner service
aws apprunner create-service --cli-input-json file://apprunner.json
```

Create `apprunner.json`:

```json
{
  "ServiceName": "devminds",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/devminds:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "DATABASE_URL": "{{resolve:secretsmanager:devminds/db-url}}",
          "NEXTAUTH_SECRET": "{{resolve:secretsmanager:devminds/nextauth-secret}}"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/api/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
```

---

## 8. Phase 5 — Workflow Engine (Inngest Replacement)

The current Inngest multi-agent workflow (Scanner → Validator → Fixer → File Writer) maps cleanly to **AWS Step Functions** with **Lambda** functions for each agent.

### 8.1 Create Lambda Functions for Each Agent

Install AWS Lambda handler dependencies:

```powershell
npm install @aws-sdk/client-sfn @aws-sdk/client-lambda
```

Create `lib/aws/agents/scanner-lambda.ts`:

````typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export const handler = async (event: {
  code: string;
  language: string;
  sessionId: string;
}) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `
    Analyze this ${event.language} code for bugs, security issues, and anti-patterns.
    Return a JSON array of issues found.
    Code: \`\`\`${event.language}\n${event.code}\n\`\`\`
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON response
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
  const issues = jsonMatch ? JSON.parse(jsonMatch[1]) : [];

  return {
    sessionId: event.sessionId,
    code: event.code,
    language: event.language,
    issues,
    scannedAt: new Date().toISOString(),
  };
};
````

Create `lib/aws/agents/fixer-lambda.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export const handler = async (event: {
  code: string;
  language: string;
  issues: Array<{ type: string; message: string; line?: number }>;
  sessionId: string;
}) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const issuesSummary = event.issues
    .map((i) => `- ${i.type}: ${i.message}`)
    .join("\n");

  const prompt = `
    Fix the following issues in this ${event.language} code:
    Issues:
    ${issuesSummary}
    
    Original code:
    \`\`\`${event.language}\n${event.code}\n\`\`\`
    
    Return ONLY the fixed code without explanation.
  `;

  const result = await model.generateContent(prompt);
  const fixedCode = result.response.text();

  return {
    sessionId: event.sessionId,
    originalCode: event.code,
    fixedCode,
    issuesFixed: event.issues.length,
  };
};
```

### 8.2 Step Functions State Machine (Multi-Agent Workflow)

Create `infrastructure/lib/workflow-stack.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class WorkflowStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda: Scanner Agent
    const scannerFn = new nodejs.NodejsFunction(this, "ScannerAgent", {
      functionName: "devminds-scanner-agent",
      entry: "../lib/aws/agents/scanner-lambda.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(2),
      environment: {
        GOOGLE_GENERATIVE_AI_API_KEY: cdk.SecretValue.secretsManager(
          "devminds/api-keys",
          { jsonField: "geminiKey" },
        ).toString(),
      },
    });

    // Lambda: Validator Agent
    const validatorFn = new nodejs.NodejsFunction(this, "ValidatorAgent", {
      functionName: "devminds-validator-agent",
      entry: "../lib/aws/agents/validator-lambda.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(2),
    });

    // Lambda: Fixer Agent
    const fixerFn = new nodejs.NodejsFunction(this, "FixerAgent", {
      functionName: "devminds-fixer-agent",
      entry: "../lib/aws/agents/fixer-lambda.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(3),
      environment: {
        GOOGLE_GENERATIVE_AI_API_KEY: cdk.SecretValue.secretsManager(
          "devminds/api-keys",
          { jsonField: "geminiKey" },
        ).toString(),
      },
    });

    // Step Functions Tasks
    const scanStep = new tasks.LambdaInvoke(this, "ScanCode", {
      lambdaFunction: scannerFn,
      outputPath: "$.Payload",
    });

    const validateStep = new tasks.LambdaInvoke(this, "ValidateFixes", {
      lambdaFunction: validatorFn,
      outputPath: "$.Payload",
    });

    const fixStep = new tasks.LambdaInvoke(this, "FixCode", {
      lambdaFunction: fixerFn,
      outputPath: "$.Payload",
    });

    // Choice: Were issues found?
    const issuesFound = new sfn.Choice(this, "IssuesFound?")
      .when(
        sfn.Condition.numberGreaterThan("$.issues.length", 0),
        validateStep.next(fixStep),
      )
      .otherwise(
        new sfn.Succeed(this, "NoIssuesFound", {
          comment: "Code is clean — no issues detected",
        }),
      );

    // State Machine Definition
    const definition = scanStep.next(issuesFound);

    this.stateMachine = new sfn.StateMachine(this, "DebugWorkflow", {
      stateMachineName: "devminds-debug-workflow",
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(10),
      tracingEnabled: true, // X-Ray tracing
    });

    new cdk.CfnOutput(this, "StateMachineArn", {
      value: this.stateMachine.stateMachineArn,
    });
  }
}
```

### 8.3 Update API Routes to Use Step Functions

Update `app/api/debug/trigger/route.ts` to use Step Functions instead of Inngest:

```typescript
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { NextRequest, NextResponse } from "next/server";

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export async function POST(request: NextRequest) {
  const { code, language, sessionId } = await request.json();

  const execution = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN!,
      name: `debug-${sessionId}-${Date.now()}`,
      input: JSON.stringify({ code, language, sessionId }),
    }),
  );

  return NextResponse.json({
    executionArn: execution.executionArn,
    sessionId,
  });
}
```

Update `app/api/debug/poll/route.ts` to poll Step Functions:

```typescript
import { SFNClient, DescribeExecutionCommand } from "@aws-sdk/client-sfn";
import { NextRequest, NextResponse } from "next/server";

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionArn = searchParams.get("executionArn");

  if (!executionArn) {
    return NextResponse.json(
      { error: "executionArn required" },
      { status: 400 },
    );
  }

  const execution = await sfnClient.send(
    new DescribeExecutionCommand({ executionArn }),
  );

  const statusMap: Record<string, string> = {
    RUNNING: "processing",
    SUCCEEDED: "completed",
    FAILED: "failed",
    TIMED_OUT: "timeout",
    ABORTED: "aborted",
  };

  return NextResponse.json({
    status: statusMap[execution.status ?? "RUNNING"] ?? "unknown",
    output: execution.output ? JSON.parse(execution.output) : null,
    startDate: execution.startDate,
    stopDate: execution.stopDate,
  });
}
```

---

## 9. Phase 6 — AI & External Services

These services remain external but need proper configuration on AWS.

### 9.1 Store API Keys in AWS Secrets Manager

```powershell
# Store all third-party API keys securely
aws secretsmanager create-secret \
  --name "devminds/api-keys" \
  --secret-string '{
    "geminiKey": "<YOUR_GEMINI_API_KEY>",
    "groqKey": "<YOUR_GROQ_API_KEY>",
    "e2bKey": "<YOUR_E2B_API_KEY>",
    "pineconeKey": "<YOUR_PINECONE_API_KEY>"
  }' \
  --region us-east-1

# Store Google OAuth credentials
aws secretsmanager create-secret \
  --name "devminds/google-oauth" \
  --secret-string '{
    "clientId": "<GOOGLE_CLIENT_ID>",
    "clientSecret": "<GOOGLE_CLIENT_SECRET>"
  }' \
  --region us-east-1
```

### 9.2 Update lib/gemini-client.ts for AWS

```typescript
// lib/gemini-client.ts — no changes needed, just ensure env var is set
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
}

export const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
);
```

### 9.3 Pinecone Vector DB Configuration

The `@pinecone-database/pinecone` SDK works without change. Just ensure the environment variable is set:

```
PINECONE_API_KEY=<from Secrets Manager>
PINECONE_INDEX=devminds-embeddings
```

---

## 10. Phase 7 — CDN & Static Assets

### 10.1 Amazon CloudFront Distribution

```typescript
// infrastructure/lib/cdn-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as waf from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export class CdnStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    appRunnerServiceUrl: string,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    // WAF Web ACL — rate limiting + bot protection
    const webAcl = new waf.CfnWebACL(this, "DevMindsWaf", {
      defaultAction: { allow: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "DevMindsWaf",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "RateLimitRule",
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: "IP",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimitRule",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "CommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, "DevMindsCdn", {
      defaultBehavior: {
        origin: new origins.HttpOrigin(appRunnerServiceUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // SSR — no caching
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        // Cache static Next.js assets aggressively
        "_next/static/*": {
          origin: new origins.HttpOrigin(appRunnerServiceUrl),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "public/*": {
          origin: new origins.HttpOrigin(appRunnerServiceUrl),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      webAclId: webAcl.attrArn,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
```

---

## 11. Phase 8 — Secrets & Configuration

### 11.1 Full Secrets Manager Setup

```powershell
# Database credentials (generated by CDK — see Phase 2)
# aws secretsmanager get-secret-value --secret-id devminds/db-credentials

# NextAuth secret
aws secretsmanager create-secret \
  --name "devminds/nextauth" \
  --secret-string "{\"secret\": \"$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")\"}"

# All environment variables in one secret for easy retrieval
aws secretsmanager create-secret \
  --name "devminds/app-config" \
  --secret-string '{
    "NEXTAUTH_URL": "https://your-domain.com",
    "DATABASE_URL": "postgresql://...",
    "AWS_REGION": "us-east-1",
    "STATE_MACHINE_ARN": "arn:aws:states:us-east-1:...",
    "AWS_S3_BUCKET": "devminds-assets-..."
  }'
```

### 11.2 Create AWS Parameter Store Entries (Non-Secret Config)

```powershell
# Non-secret configuration
aws ssm put-parameter --name "/devminds/prod/AWS_REGION" --value "us-east-1" --type String
aws ssm put-parameter --name "/devminds/prod/NODE_ENV" --value "production" --type String
aws ssm put-parameter --name "/devminds/prod/PINECONE_INDEX" --value "devminds-embeddings" --type String
```

### 11.3 Create a Helper to Load Secrets in Next.js

Create `lib/aws/secrets.ts`:

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

let cachedSecrets: Record<string, string> | null = null;

export async function getSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets) return cachedSecrets;

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: "devminds/api-keys" }),
  );

  cachedSecrets = JSON.parse(response.SecretString ?? "{}");
  return cachedSecrets;
}
```

Install the SDK:

```powershell
npm install @aws-sdk/client-secrets-manager @aws-sdk/client-sfn @aws-sdk/client-s3
```

---

## 12. Phase 9 — CI/CD Pipeline

### 12.1 AWS CodePipeline + CodeBuild

Create `infrastructure/lib/pipeline-stack.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Construct } from "constructs";

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact("Source");
    const buildOutput = new codepipeline.Artifact("Build");

    // CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, "DevMindsBuild", {
      projectName: "devminds-build",
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
        privileged: true, // Required for Docker builds
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": { nodejs: "20" },
          },
          pre_build: {
            commands: [
              "npm ci",
              "npx prisma generate",
              // Login to ECR
              "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI",
            ],
          },
          build: {
            commands: [
              // Run type checks
              "npx tsc --noEmit",
              // Run ESLint
              "npm run lint",
              // Build Docker image
              "docker build -t $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION .",
              "docker push $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION",
              // Also tag as latest
              "docker tag $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPO_URI:latest",
              "docker push $ECR_REPO_URI:latest",
            ],
          },
          post_build: {
            commands: [
              // Run Prisma migrations
              "npx prisma migrate deploy",
              // Update App Runner service
              "aws apprunner update-service --service-arn $APP_RUNNER_ARN --source-configuration ImageRepository={ImageIdentifier=$ECR_REPO_URI:latest}",
            ],
          },
        },
        artifacts: {
          files: ["**/*"],
        },
      }),
      environmentVariables: {
        ECR_REPO_URI: {
          value: `${this.account}.dkr.ecr.us-east-1.amazonaws.com/devminds`,
        },
      },
    });

    // Pipeline
    new codepipeline.Pipeline(this, "DevMindsPipeline", {
      pipelineName: "devminds-pipeline",
      stages: [
        {
          stageName: "Source",
          actions: [
            new actions.GitHubSourceAction({
              actionName: "GitHub_Source",
              owner: "<YOUR_GITHUB_USERNAME>",
              repo: "devminds",
              branch: "main",
              oauthToken: cdk.SecretValue.secretsManager(
                "devminds/github-token",
              ),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new actions.CodeBuildAction({
              actionName: "Build_and_Test",
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });
  }
}
```

### 12.2 GitHub Actions Alternative (Simpler)

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: devminds

jobs:
  test:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint

  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Run DB Migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm ci
          npx prisma generate
          npx prisma migrate deploy

      - name: Update App Runner Service
        run: |
          aws apprunner update-service \
            --service-arn ${{ secrets.APP_RUNNER_ARN }} \
            --source-configuration "ImageRepository={ImageIdentifier=${{ steps.build-image.outputs.image }},ImageRepositoryType=ECR}"
```

Add these secrets to your GitHub repository (**Settings → Secrets**):

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
APP_RUNNER_ARN
DATABASE_URL
```

---

## 13. Phase 10 — Monitoring & Observability

### 13.1 CloudWatch Dashboard

```typescript
// infrastructure/lib/monitoring-stack.ts
import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Log Group for application logs
    new logs.LogGroup(this, "AppLogs", {
      logGroupName: "/devminds/application",
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, "DevMindsDashboard", {
      dashboardName: "DevMinds-Production",
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "API Latency (p99)",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/AppRunner",
            metricName: "RequestLatency",
            statistic: "p99",
            period: cdk.Duration.minutes(5),
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: "Step Functions Executions",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/States",
            metricName: "ExecutionsSucceeded",
            statistic: "Sum",
          }),
          new cloudwatch.Metric({
            namespace: "AWS/States",
            metricName: "ExecutionsFailed",
            statistic: "Sum",
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: "RDS ACU Capacity",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "ServerlessDatabaseCapacity",
          }),
        ],
      }),
    );

    // Alarm: High error rate
    new cloudwatch.Alarm(this, "HighErrorRateAlarm", {
      alarmName: "DevMinds-HighErrorRate",
      metric: new cloudwatch.Metric({
        namespace: "AWS/AppRunner",
        metricName: "Http5xxRequests",
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: "More than 10 5xx errors in 10 minutes",
    });
  }
}
```

### 13.2 Add Health Check Endpoint

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // your Prisma client

export async function GET() {
  try {
    // Verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: String(error) },
      { status: 503 },
    );
  }
}
```

---

## 14. Security Hardening

### 14.1 IAM Least-Privilege Policy for the App

Create an IAM role for your App Runner / EC2 instance with only what it needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsAccess",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": ["arn:aws:secretsmanager:us-east-1:*:secret:devminds/*"]
    },
    {
      "Sid": "StepFunctionsAccess",
      "Effect": "Allow",
      "Action": ["states:StartExecution", "states:DescribeExecution"],
      "Resource": [
        "arn:aws:states:us-east-1:*:stateMachine:devminds-debug-workflow"
      ]
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::devminds-assets-*/*"]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### 14.2 Security Checklist

```
[x] All database connections use SSL (sslmode=require)
[x] RDS is in an isolated private subnet (no internet access)
[x] Secrets stored in AWS Secrets Manager (never in code or env files)
[x] CloudFront WAF protects against XSS, SQLi, and rate abuse
[x] S3 bucket blocks all public access
[x] App Runner uses HTTPS only
[x] Cognito enforces password policy
[x] IAM roles follow least-privilege principle
[x] VPC Security Groups restrict traffic to minimum required ports
[x] CloudTrail enabled for all API call auditing
[x] RDS deletion protection enabled
```

### 14.3 Enable AWS CloudTrail Audit Logging

```powershell
aws cloudtrail create-trail \
  --name devminds-audit \
  --s3-bucket-name devminds-cloudtrail-logs-<ACCOUNT_ID> \
  --include-global-service-events \
  --is-multi-region-trail

aws cloudtrail start-logging --name devminds-audit
```

---

## 15. Cost Estimation

### Monthly Cost Breakdown (us-east-1, assuming moderate traffic ~1000 users)

| Service                      | Tier / Config                | Estimated Monthly Cost |
| ---------------------------- | ---------------------------- | ---------------------- |
| **AWS Amplify**              | 1000 build minutes + hosting | ~$5–15                 |
| **App Runner** (alternative) | 1 vCPU / 2GB, ~50% active    | ~$30–60                |
| **RDS Aurora Serverless v2** | 0.5–2 ACU average            | ~$20–60                |
| **RDS Proxy**                | 1 proxy endpoint             | ~$15                   |
| **Amazon Cognito**           | Up to 50k MAU free           | **$0**                 |
| **Amazon S3**                | 5 GB storage + requests      | ~$2                    |
| **CloudFront**               | 1 TB transfer /month         | ~$85                   |
| **AWS Step Functions**       | 1000 state transitions/day   | ~$5                    |
| **AWS Lambda** (agents)      | 1M invocations/month         | ~$2                    |
| **AWS Secrets Manager**      | 5 secrets                    | ~$2.50                 |
| **CloudWatch**               | Logs + dashboards            | ~$5                    |
| **NAT Gateway**              | 1 AZ                         | ~$35                   |
|                              | **Total Estimate**           | **≈ $175–260 /month**  |

> **Cost Optimization Tips:**
>
> - Use **Aurora Serverless v2** (scales to 0 during idle periods)
> - Use **Amplify** instead of App Runner + ECR + NAT gateway (saves ~$60/month)
> - Enable **CloudFront caching** for static assets
> - Set **Lambda reserved concurrency** to prevent runaway costs
> - Use **S3 Intelligent-Tiering** for storage cost optimization

---

## 16. Deployment Checklist

### Initial Setup

- [ ] AWS account created and billing alerts configured
- [ ] IAM user created with MFA enabled
- [ ] AWS CLI configured (`aws configure`)
- [ ] CDK bootstrapped: `cdk bootstrap aws://<ACCOUNT_ID>/us-east-1`
- [ ] Docker Desktop installed and running

### Infrastructure

- [ ] VPC with public, private, isolated subnets deployed (`cdk deploy VpcStack`)
- [ ] RDS Aurora Serverless v2 cluster created (`cdk deploy DatabaseStack`)
- [ ] S3 bucket created for assets (`cdk deploy StorageStack`)
- [ ] Cognito User Pool created (`cdk deploy AuthStack`)
- [ ] Step Functions state machine deployed (`cdk deploy WorkflowStack`)
- [ ] CloudFront distribution created (`cdk deploy CdnStack`)

### Application

- [ ] `Dockerfile` created and tested locally (`docker build . && docker run -p 3000:3000`)
- [ ] ECR repository created and Docker image pushed
- [ ] Amplify app or App Runner service created
- [ ] All environment variables configured in hosting platform
- [ ] `output: 'standalone'` added to `next.config.ts`

### Database

- [ ] Prisma schema updated (removed Neon adapter)
- [ ] `DATABASE_URL` points to RDS Proxy endpoint
- [ ] `npx prisma migrate deploy` run against RDS
- [ ] Supabase migrations in `supabase/migrations/` applied to RDS

### Authentication

- [ ] Cognito User Pool configured
- [ ] Google OAuth provider connected to Cognito
- [ ] NextAuth updated to use Cognito provider
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] `NEXTAUTH_SECRET` set in Secrets Manager

### Secrets

- [ ] `devminds/api-keys` secret created (Gemini, Groq, E2B, Pinecone)
- [ ] `devminds/google-oauth` secret created
- [ ] `devminds/db-credentials` auto-created by RDS stack
- [ ] `devminds/nextauth` secret created

### CI/CD

- [ ] GitHub Actions workflow file created (`.github/workflows/deploy-aws.yml`)
- [ ] GitHub repository secrets configured (AWS keys, APP_RUNNER_ARN, DATABASE_URL)
- [ ] First pipeline run successful

### Monitoring

- [ ] CloudWatch Dashboard created
- [ ] High error rate alarm configured
- [ ] `GET /api/health` endpoint returns 200
- [ ] CloudTrail audit logging enabled

### Security

- [ ] WAF configured on CloudFront
- [ ] RDS in isolated subnet (no public access)
- [ ] S3 bucket public access blocked
- [ ] IAM role with least-privilege attached to App Runner
- [ ] Deletion protection on RDS

---

## Quick Reference — Environment Variables (Production)

```bash
# ── Application ────────────────────────────────────────────────
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<32-byte-random-hex>

# ── AWS ────────────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_S3_BUCKET=devminds-assets-<ACCOUNT_ID>

# ── Database ───────────────────────────────────────────────────
DATABASE_URL=postgresql://devminds_admin:<PASSWORD>@<RDS_PROXY_ENDPOINT>:5432/devminds?sslmode=require

# ── Cognito Auth ───────────────────────────────────────────────
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=<app-client-id>
COGNITO_CLIENT_SECRET=<app-client-secret>

# ── Workflow (Step Functions) ──────────────────────────────────
STATE_MACHINE_ARN=arn:aws:states:us-east-1:<ACCOUNT_ID>:stateMachine:devminds-debug-workflow

# ── External AI Services ───────────────────────────────────────
GOOGLE_GENERATIVE_AI_API_KEY=<gemini-key>
GROQ_API_KEY=<groq-key>

# ── Code Execution ─────────────────────────────────────────────
E2B_API_KEY=<e2b-key>

# ── Vector DB ──────────────────────────────────────────────────
PINECONE_API_KEY=<pinecone-key>
PINECONE_INDEX=devminds-embeddings
```

---

## Troubleshooting

| Issue                                | Likely Cause                               | Fix                                                                                                       |
| ------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED` to RDS                | RDS in private subnet, app not in same VPC | Ensure App Runner is in the same VPC or use RDS Proxy public endpoint                                     |
| Prisma `Can't reach database server` | SSL mismatch                               | Add `?sslmode=require` to `DATABASE_URL`                                                                  |
| Cognito `NotAuthorizedException`     | Wrong client ID or wrong auth flow         | Verify `COGNITO_CLIENT_ID` and that USER_PASSWORD_AUTH is enabled                                         |
| Step Functions `AccessDenied`        | IAM role missing `states:StartExecution`   | Update App Runner's IAM role permissions                                                                  |
| CloudFront showing stale HTML        | Cache behavior set to aggressive           | Set main route cache policy to `CACHING_DISABLED`                                                         |
| E2B sandbox timeout                  | Lambda/API route timeout too short         | E2B calls must come from App Runner (not Lambda) — ensure the route is not serverless with a <30s timeout |
| Amplify build failing on Prisma      | Prisma generate not run before build       | Add `npx prisma generate` to the `preBuild` phase in `amplify.yml`                                        |

---

_Generated for DevMinds — AWS Production Deployment Guide · March 2026_
