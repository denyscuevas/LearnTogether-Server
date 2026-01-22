-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "major" TEXT NOT NULL,
    "yearOfStudy" INTEGER NOT NULL,
    "isTutor" BOOLEAN NOT NULL DEFAULT false,
    "isTutee" BOOLEAN NOT NULL DEFAULT false,
    "profilePicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_major_idx" ON "Profile"("major");

-- CreateIndex
CREATE INDEX "Profile_yearOfStudy_idx" ON "Profile"("yearOfStudy");

-- CreateIndex
CREATE INDEX "Profile_isTutor_idx" ON "Profile"("isTutor");

-- CreateIndex
CREATE INDEX "Profile_isTutee_idx" ON "Profile"("isTutee");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
