-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_research_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "followupId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "backgroundId" TEXT,
    CONSTRAINT "research_tasks_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "research_tasks_followupId_fkey" FOREIGN KEY ("followupId") REFERENCES "followups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_research_tasks" ("backgroundId", "completedAt", "createdAt", "error", "id", "startedAt", "status", "topicId") SELECT "backgroundId", "completedAt", "createdAt", "error", "id", "startedAt", "status", "topicId" FROM "research_tasks";
DROP TABLE "research_tasks";
ALTER TABLE "new_research_tasks" RENAME TO "research_tasks";
CREATE INDEX "research_tasks_topicId_status_idx" ON "research_tasks"("topicId", "status");
CREATE INDEX "research_tasks_status_idx" ON "research_tasks"("status");
CREATE INDEX "research_tasks_createdAt_idx" ON "research_tasks"("createdAt");
CREATE INDEX "research_tasks_followupId_idx" ON "research_tasks"("followupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
