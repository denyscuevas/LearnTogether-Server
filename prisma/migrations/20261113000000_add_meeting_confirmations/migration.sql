CREATE TABLE "MeetingConfirmation" (
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingConfirmation_pkey" PRIMARY KEY ("meetingId", "userId")
);

ALTER TABLE "MeetingConfirmation" ADD CONSTRAINT "MeetingConfirmation_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
