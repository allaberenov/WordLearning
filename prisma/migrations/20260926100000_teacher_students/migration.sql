CREATE TYPE "TeacherStudentStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'REMOVED');

ALTER TABLE "Deck"
  ADD COLUMN "assignedByTeacherId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE TABLE "TeacherStudent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "teacherId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "TeacherStudentStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "removedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherStudent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deck_assignedByTeacherId_assignedAt_idx" ON "Deck"("assignedByTeacherId", "assignedAt");
CREATE UNIQUE INDEX "TeacherStudent_teacherId_studentId_key" ON "TeacherStudent"("teacherId", "studentId");
CREATE INDEX "TeacherStudent_teacherId_status_idx" ON "TeacherStudent"("teacherId", "status");
CREATE INDEX "TeacherStudent_studentId_status_idx" ON "TeacherStudent"("studentId", "status");
CREATE INDEX "TeacherStudent_requestedAt_idx" ON "TeacherStudent"("requestedAt");

ALTER TABLE "Deck" ADD CONSTRAINT "Deck_assignedByTeacherId_fkey" FOREIGN KEY ("assignedByTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherStudent" ADD CONSTRAINT "TeacherStudent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherStudent" ADD CONSTRAINT "TeacherStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
