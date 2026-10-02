process.env.PIN_PEPPER ??= "test-pepper-test-pepper-test-pepper-1234";
process.env.SESSION_SECRET ??= "test-session-test-session-test-session-12";
process.env.APP_ORIGIN ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://ponto:ponto@localhost:5432/ponto_test?schema=public";
process.env.ARGON_MEMORY_KIB = "1024";
process.env.ARGON_TIME_COST = "1";
process.env.KIOSK_MIN_INTERVAL_SECONDS = "60";
