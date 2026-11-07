-- Add optional, consented conversation sharing to reports.
ALTER TABLE "Report"
ADD COLUMN "shareConversation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sharedConversationThreadId" TEXT,
ADD COLUMN "conversationSharedAt" TIMESTAMP(3);

CREATE INDEX "Report_sharedConversationThreadId_idx"
ON "Report"("sharedConversationThreadId");

ALTER TABLE "Report"
ADD CONSTRAINT "Report_sharedConversationThreadId_fkey"
FOREIGN KEY ("sharedConversationThreadId") REFERENCES "Thread"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
