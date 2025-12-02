/*
  Warnings:

  - You are about to drop the column `refreshTokenId` on the `EmailVerificationToken` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailVerificationToken" DROP CONSTRAINT "EmailVerificationToken_refreshTokenId_fkey";

-- AlterTable
ALTER TABLE "EmailVerificationToken" DROP COLUMN "refreshTokenId";
