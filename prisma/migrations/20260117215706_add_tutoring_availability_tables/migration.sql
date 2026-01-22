/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "ProfileTutorCourse" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "ProfileTutorCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileTuteeCourse" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "ProfileTuteeCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileTutorCourse_courseId_idx" ON "ProfileTutorCourse"("courseId");

-- CreateIndex
CREATE INDEX "ProfileTuteeCourse_courseId_idx" ON "ProfileTuteeCourse"("courseId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_profileId_idx" ON "AvailabilitySlot"("profileId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_day_idx" ON "AvailabilitySlot"("day");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "ProfileTutorCourse" ADD CONSTRAINT "ProfileTutorCourse_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTutorCourse" ADD CONSTRAINT "ProfileTutorCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTuteeCourse" ADD CONSTRAINT "ProfileTuteeCourse_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTuteeCourse" ADD CONSTRAINT "ProfileTuteeCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
