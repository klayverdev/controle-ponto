# Controle de Ponto

Next.js 15 · TypeScript · Prisma · PostgreSQL · Zod · Tailwind.

## Executar

```bash
cp .env.example .env            # preencher PIN_PEPPER, SESSION_SECRET (>= 32 caracteres) e ADMIN_INITIAL_PASSWORD (>= 12)
docker compose up -d db
npm ci && npx prisma migrate deploy && npx prisma db seed
npm run dev
```

O seed (desenvolvimento) imprime o token de um terminal; ative-o em `/ativar`. Em `NODE_ENV=production` o seed cria somente o `admin`.
No primeiro login o administrador troca a senha e ativa o MFA em `/admin/seguranca`.

## Testes

`npm test` (unitários + integração; exige PostgreSQL em `DATABASE_URL`, banco descartável) · `npm run test:e2e` (`E2E_KIOSK_TOKEN`, `E2E_PIN`) · `npm run verify:integrity`.

## Decisões de segurança

- Identificação por PIN: `pinLookup` (HMAC-SHA256 + `PIN_PEPPER`) localiza; `pinHash` (Argon2id) confirma; verificação fictícia equaliza o tempo. Inativos têm ambos os campos anulados. PIN único global, gerado pelo sistema e exibido uma vez. Trocar `PIN_PEPPER` ou `PIN_LENGTH` exige redefinir todos os PINs.
- `KIOSK_REQUIRE_EMPLOYEE_CODE=true` exige matrícula + PIN (recomendado). No modo só-PIN a proteção depende de terminais autorizados, rate limit e PIN de 6+ dígitos.
- Somente terminais cadastrados (`/admin/terminais`) registram ponto; token de 256 bits, guardado como SHA-256, cookie httpOnly/Secure/SameSite=Strict.
- Rate limit em PostgreSQL (`RateLimitEvent`): bloqueio progressivo por IP e terminal; alerta global em `AuditLog`.
- Registro em transação com `pg_advisory_xact_lock` por funcionário; `TimeRecord` e `AuditLog` imutáveis por trigger; correção = cancelar + recriar; cadeia de hash verificável.
- Admin: Argon2id, MFA TOTP obrigatório para ADMIN, sessão no banco (hash), cookie `__Host-`, CSRF por token em toda mutação, RBAC em `lib/permissions`.
- Sem `TRUST_PROXY=true` atrás de proxy reverso o IP vira `local`. Configure o proxy para anexar o IP real em `X-Forwarded-For`.

## Deploy

HTTPS + HSTS no proxy · role de aplicação sem superuser e sem DDL (migrations com role separada) · TLS no banco · backup criptografado com teste de restauração · NTP no servidor · rotação de `SESSION_SECRET` (invalida sessões e exige refazer MFA) · `npm audit` no CI.

```sql
CREATE ROLE ponto_app LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE ponto TO ponto_app;
GRANT USAGE ON SCHEMA public TO ponto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ponto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ponto_app;
```

## Aviso legal

Validar a adequação à Portaria MTP nº 671/2021 e à LGPD com assessoria jurídica/contábil antes de usar em produção.
