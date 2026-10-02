CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR');
CREATE TYPE "RecordType" AS ENUM ('ENTRY', 'EXIT');
CREATE TYPE "RecordSource" AS ENUM ('KIOSK', 'ADMIN');
CREATE TYPE "DayStatus" AS ENUM ('OK', 'INCONSISTENT', 'OPEN', 'ABSENT');
CREATE TYPE "ClosingStatus" AS ENUM ('CLOSED', 'REOPENED');

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recoveryCodes" TEXT[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KioskDevice" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ,
    CONSTRAINT "KioskDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkSchedule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dailyMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "toleranceMinutes" INTEGER NOT NULL,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "pinLookup" TEXT,
    "pinHash" TEXT,
    "positionId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "workScheduleId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeRecord" (
    "id" UUID NOT NULL,
    "seq" SERIAL NOT NULL,
    "employeeId" UUID NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "recordDate" CHAR(10) NOT NULL,
    "recordTime" CHAR(8) NOT NULL,
    "type" "RecordType" NOT NULL,
    "source" "RecordSource" NOT NULL,
    "deviceId" UUID,
    "createdByUserId" UUID,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledByUserId" UUID,
    "cancelReason" TEXT,
    "integrityHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailySummary" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" CHAR(10) NOT NULL,
    "firstEntry" CHAR(8),
    "lastExit" CHAR(8),
    "workedMinutes" INTEGER NOT NULL,
    "expectedMinutes" INTEGER NOT NULL,
    "overtimeMinutes" INTEGER NOT NULL,
    "deficitMinutes" INTEGER NOT NULL,
    "status" "DayStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonthlyClosing" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "ClosingStatus" NOT NULL,
    "closedBy" UUID NOT NULL,
    "closedAt" TIMESTAMPTZ NOT NULL,
    "reopenedBy" UUID,
    "reopenedAt" TIMESTAMPTZ,
    "reopenReason" TEXT,
    CONSTRAINT "MonthlyClosing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitEvent" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "KioskDevice_tokenHash_key" ON "KioskDevice"("tokenHash");
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");
CREATE UNIQUE INDEX "WorkSchedule_name_key" ON "WorkSchedule"("name");
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE UNIQUE INDEX "Employee_pinLookup_key" ON "Employee"("pinLookup");
CREATE UNIQUE INDEX "TimeRecord_seq_key" ON "TimeRecord"("seq");
CREATE INDEX "TimeRecord_employeeId_recordedAt_idx" ON "TimeRecord"("employeeId", "recordedAt");
CREATE INDEX "TimeRecord_recordDate_idx" ON "TimeRecord"("recordDate");
CREATE UNIQUE INDEX "DailySummary_employeeId_date_key" ON "DailySummary"("employeeId", "date");
CREATE INDEX "DailySummary_date_idx" ON "DailySummary"("date");
CREATE UNIQUE INDEX "MonthlyClosing_year_month_key" ON "MonthlyClosing"("year", "month");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "RateLimitEvent_key_createdAt_idx" ON "RateLimitEvent"("key", "createdAt");
CREATE INDEX "RateLimitEvent_createdAt_idx" ON "RateLimitEvent"("createdAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "WorkSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "KioskDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
