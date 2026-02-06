/*
  Warnings:

  - You are about to drop the column `created_at` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sender_id` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `thread_id` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `last_message_at` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `last_message_id` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `last_message_preview` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `ThreadParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `last_message_preview` on the `ThreadParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `last_read_message_id` on the `ThreadParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `profile_id` on the `ThreadParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `thread_id` on the `ThreadParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `ThreadParticipant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[threadId,profileId]` on the table `ThreadParticipant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `senderId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `threadId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Thread` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profileId` to the `ThreadParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `threadId` to the `ThreadParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ThreadParticipant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "ThreadParticipant" DROP CONSTRAINT "ThreadParticipant_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "ThreadParticipant" DROP CONSTRAINT "ThreadParticipant_thread_id_fkey";

-- DropIndex
DROP INDEX "Message_created_at_idx";

-- DropIndex
DROP INDEX "Message_thread_id_idx";

-- DropIndex
DROP INDEX "Thread_updated_at_idx";

-- DropIndex
DROP INDEX "ThreadParticipant_thread_id_profile_id_key";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "created_at",
DROP COLUMN "sender_id",
DROP COLUMN "thread_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "senderId" TEXT NOT NULL,
ADD COLUMN     "threadId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "created_at",
DROP COLUMN "last_message_at",
DROP COLUMN "last_message_id",
DROP COLUMN "last_message_preview",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageId" TEXT,
ADD COLUMN     "lastMessagePreview" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ThreadParticipant" DROP COLUMN "created_at",
DROP COLUMN "last_message_preview",
DROP COLUMN "last_read_message_id",
DROP COLUMN "profile_id",
DROP COLUMN "thread_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastMessagePreview" TEXT,
ADD COLUMN     "lastReadMessageId" TEXT,
ADD COLUMN     "profileId" TEXT NOT NULL,
ADD COLUMN     "threadId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Thread_updatedAt_idx" ON "Thread"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadParticipant_threadId_profileId_key" ON "ThreadParticipant"("threadId", "profileId");

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
