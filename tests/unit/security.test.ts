import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { redact } from "@/lib/logger";
import { decrypt, encrypt, generatePin, validatePassword, validatePin, verifySecret, hashSecret, pinLookup } from "@/lib/security";
import { formatMinutes, fromLocal, toLocal } from "@/lib/timezone";

describe("PIN", () => {
  it.each(["111111", "123456", "654321", "121212", "010190"])("rejeita %s", (pin) => {
    expect(validatePin(pin)).not.toBeNull();
  });

  it("aceita PIN forte e rejeita formato inválido", () => {
    expect(validatePin("482913")).toBeNull();
    expect(validatePin("4829")).not.toBeNull();
    expect(validatePin("48291a")).not.toBeNull();
  });

  it("gera PINs válidos", () => {
    for (let i = 0; i < 50; i++) expect(validatePin(generatePin())).toBeNull();
  });

  it("hash e lookup são determinísticos apenas no lookup", async () => {
    expect(pinLookup("482913")).toBe(pinLookup("482913"));
    const a = await hashSecret("482913");
    expect(a).not.toBe(await hashSecret("482913"));
    expect(await verifySecret(a, "482913")).toBe(true);
    expect(await verifySecret(a, "000000")).toBe(false);
  });
});

describe("senha", () => {
  it("exige 12 caracteres e rejeita previsíveis", () => {
    expect(validatePassword("curta", "admin")).not.toBeNull();
    expect(validatePassword("admin-admin-admin", "admin")).not.toBeNull();
    expect(validatePassword("T7#kd9Lq!vz2Pw", "admin")).toBeNull();
  });
});

describe("criptografia", () => {
  it("cifra e decifra", () => {
    const c = encrypt("segredo");
    expect(c).not.toContain("segredo");
    expect(decrypt(c)).toBe("segredo");
  });
});

describe("CSV", () => {
  it("neutraliza formula injection e escapa separadores", () => {
    const csv = toCsv(["a"], [["=1+1"], ["+cmd"], ["-1"], ["@x"], ['a;"b"']]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-1");
    expect(csv).toContain("'@x");
    expect(csv).toContain('"a;""b"""');
  });
});

describe("logger", () => {
  it("redige campos sensíveis", () => {
    expect(redact({ pin: "1", user: { passwordHash: "x", name: "ok" } })).toEqual({
      pin: "[REDACTED]",
      user: { passwordHash: "[REDACTED]", name: "ok" },
    });
  });
});

describe("permissões", () => {
  it("restringe supervisor", () => {
    expect(can("SUPERVISOR", "records:write")).toBe(true);
    expect(can("SUPERVISOR", "closing:reopen")).toBe(false);
    expect(can("SUPERVISOR", "users:manage")).toBe(false);
    expect(can("ADMIN", "users:manage")).toBe(true);
  });
});

describe("timezone", () => {
  it("converte para America/Sao_Paulo", () => {
    expect(toLocal(new Date("2026-09-30T11:02:15Z"))).toEqual({ date: "2026-09-30", time: "08:02:15" });
    expect(toLocal(new Date("2026-10-01T02:30:00Z")).date).toBe("2026-09-30");
    expect(fromLocal("2026-09-30", "08:02").toISOString()).toBe("2026-09-30T11:02:00.000Z");
    expect(formatMinutes(510)).toBe("08:30");
  });
});
