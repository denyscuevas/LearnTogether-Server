-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_threadId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "ThreadParticipant" DROP CONSTRAINT "ThreadParticipant_profileId_fkey";

-- DropForeignKey
ALTER TABLE "ThreadParticipant" DROP CONSTRAINT "ThreadParticipant_threadId_fkey";

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
