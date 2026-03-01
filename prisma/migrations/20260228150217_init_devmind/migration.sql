-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debug_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "codeSnippet" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "conceptGap" TEXT,
    "explanation" TEXT,
    "fix" TEXT,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debug_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "recurringMistakes" JSONB NOT NULL DEFAULT '[]',
    "conceptWeaknesses" JSONB NOT NULL DEFAULT '[]',
    "improvementMetrics" JSONB NOT NULL DEFAULT '{}',
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "debug_sessions_userId_idx" ON "debug_sessions"("userId");

-- CreateIndex
CREATE INDEX "debug_sessions_userId_errorType_idx" ON "debug_sessions"("userId", "errorType");

-- CreateIndex
CREATE UNIQUE INDEX "learning_metrics_userId_key" ON "learning_metrics"("userId");

-- AddForeignKey
ALTER TABLE "debug_sessions" ADD CONSTRAINT "debug_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_metrics" ADD CONSTRAINT "learning_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
