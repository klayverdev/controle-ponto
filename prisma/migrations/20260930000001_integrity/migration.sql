ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_minutes_check"
  CHECK ("dailyMinutes" > 0 AND "dailyMinutes" <= 1440 AND "breakMinutes" >= 0 AND "toleranceMinutes" >= 0);

ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_format_check"
  CHECK ("recordDate" ~ '^\d{4}-\d{2}-\d{2}$' AND "recordTime" ~ '^\d{2}:\d{2}:\d{2}$');

ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_cancel_check"
  CHECK (("cancelledAt" IS NULL) = ("cancelReason" IS NULL));

ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_minutes_check"
  CHECK ("workedMinutes" >= 0 AND "expectedMinutes" >= 0 AND "overtimeMinutes" >= 0 AND "deficitMinutes" >= 0);

ALTER TABLE "MonthlyClosing" ADD CONSTRAINT "MonthlyClosing_month_check"
  CHECK ("month" BETWEEN 1 AND 12 AND "year" BETWEEN 2000 AND 2200);

CREATE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_append_only"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER "TimeRecord_no_delete"
  BEFORE DELETE ON "TimeRecord"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE FUNCTION guard_time_record() RETURNS trigger AS $$
BEGIN
  IF NEW."employeeId" IS DISTINCT FROM OLD."employeeId"
     OR NEW."recordedAt" IS DISTINCT FROM OLD."recordedAt"
     OR NEW."recordDate" IS DISTINCT FROM OLD."recordDate"
     OR NEW."recordTime" IS DISTINCT FROM OLD."recordTime"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."source" IS DISTINCT FROM OLD."source"
     OR NEW."seq" IS DISTINCT FROM OLD."seq"
     OR NEW."integrityHash" IS DISTINCT FROM OLD."integrityHash"
     OR (OLD."cancelledAt" IS NOT NULL AND NEW."cancelledAt" IS DISTINCT FROM OLD."cancelledAt")
  THEN
    RAISE EXCEPTION 'TimeRecord is immutable; cancel and re-create instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TimeRecord_guard"
  BEFORE UPDATE ON "TimeRecord"
  FOR EACH ROW EXECUTE FUNCTION guard_time_record();
