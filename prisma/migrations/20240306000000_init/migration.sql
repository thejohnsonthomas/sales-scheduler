-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SOLUTION_ENGINEER', 'ACCOUNT_EXECUTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ACCOUNT_EXECUTIVE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "googleId" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSegment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRegion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "segmentId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "aeId" TEXT NOT NULL,
    "seId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "googleEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRobinState" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundRobinState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxMeetingsPerDay" INTEGER NOT NULL DEFAULT 6,
    "maxMeetingsPerWeek" INTEGER NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilizationMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "segmentId" TEXT,
    "regionId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "metricType" TEXT NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilizationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastData" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT,
    "regionId" TEXT,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "predictedDemand" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "Segment_name_key" ON "Segment"("name");
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");
CREATE UNIQUE INDEX "UserSegment_userId_segmentId_key" ON "UserSegment"("userId", "segmentId");
CREATE INDEX "UserSegment_segmentId_idx" ON "UserSegment"("segmentId");
CREATE INDEX "UserSegment_userId_idx" ON "UserSegment"("userId");
CREATE UNIQUE INDEX "UserRegion_userId_regionId_key" ON "UserRegion"("userId", "regionId");
CREATE INDEX "UserRegion_regionId_idx" ON "UserRegion"("regionId");
CREATE INDEX "UserRegion_userId_idx" ON "UserRegion"("userId");
CREATE INDEX "Meeting_aeId_idx" ON "Meeting"("aeId");
CREATE INDEX "Meeting_seId_idx" ON "Meeting"("seId");
CREATE INDEX "Meeting_segmentId_idx" ON "Meeting"("segmentId");
CREATE INDEX "Meeting_regionId_idx" ON "Meeting"("regionId");
CREATE INDEX "Meeting_startTime_idx" ON "Meeting"("startTime");
CREATE INDEX "Meeting_segmentId_regionId_idx" ON "Meeting"("segmentId", "regionId");
CREATE UNIQUE INDEX "RoundRobinState_segmentId_regionId_userId_key" ON "RoundRobinState"("segmentId", "regionId", "userId");
CREATE INDEX "RoundRobinState_segmentId_regionId_idx" ON "RoundRobinState"("segmentId", "regionId");
CREATE UNIQUE INDEX "CapacityLimit_userId_key" ON "CapacityLimit"("userId");
CREATE INDEX "UtilizationMetric_userId_date_idx" ON "UtilizationMetric"("userId", "date");
CREATE INDEX "UtilizationMetric_segmentId_regionId_date_idx" ON "UtilizationMetric"("segmentId", "regionId", "date");
CREATE INDEX "UtilizationMetric_date_idx" ON "UtilizationMetric"("date");
CREATE INDEX "ForecastData_segmentId_regionId_idx" ON "ForecastData"("segmentId", "regionId");
CREATE INDEX "ForecastData_forecastDate_idx" ON "ForecastData"("forecastDate");

-- AddForeignKey
ALTER TABLE "UserSegment" ADD CONSTRAINT "UserSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSegment" ADD CONSTRAINT "UserSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRegion" ADD CONSTRAINT "UserRegion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRegion" ADD CONSTRAINT "UserRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_aeId_fkey" FOREIGN KEY ("aeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_seId_fkey" FOREIGN KEY ("seId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundRobinState" ADD CONSTRAINT "RoundRobinState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundRobinState" ADD CONSTRAINT "RoundRobinState_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundRobinState" ADD CONSTRAINT "RoundRobinState_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapacityLimit" ADD CONSTRAINT "CapacityLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
