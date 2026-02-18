-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "isAccepted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_threadId_key" ON "ConnectionRequest"("threadId");

-- CreateIndex
CREATE INDEX "ConnectionRequest_receiverId_status_idx" ON "ConnectionRequest"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_senderId_receiverId_key" ON "ConnectionRequest"("senderId", "receiverId");

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
