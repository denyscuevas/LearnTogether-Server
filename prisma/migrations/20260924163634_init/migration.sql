-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_reviewer_id_idx" ON "Review"("reviewer_id");

-- CreateIndex
CREATE INDEX "Review_reviewee_id_idx" ON "Review"("reviewee_id");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
