DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ponto') THEN
    CREATE ROLE ponto LOGIN PASSWORD 'ponto_dev';
  ELSE
    ALTER ROLE ponto WITH LOGIN PASSWORD 'ponto_dev';
  END IF;
END $$;

SELECT 'CREATE DATABASE ponto OWNER ponto'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ponto')\gexec

SELECT 'CREATE DATABASE ponto_test OWNER ponto'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ponto_test')\gexec
