/*
  Warnings:

  - A unique constraint covering the columns `[profileId,courseId]` on the table `ProfileTuteeCourse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profileId,courseId]` on the table `ProfileTutorCourse` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProfileTuteeCourse_profileId_courseId_key" ON "ProfileTuteeCourse"("profileId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileTutorCourse_profileId_courseId_key" ON "ProfileTutorCourse"("profileId", "courseId");
