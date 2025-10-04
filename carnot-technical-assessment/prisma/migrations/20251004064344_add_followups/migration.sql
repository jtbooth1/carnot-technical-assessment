-- CreateTable
CREATE TABLE "followups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    CONSTRAINT "followups_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "research_results" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "followups_resultId_idx" ON "followups"("resultId");
