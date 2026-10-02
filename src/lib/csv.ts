const FORMULA = /^[=+\-@\t\r]/;

const cell = (value: string | number) => {
  const text = String(value);
  const safe = FORMULA.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

export const toCsv = (header: string[], rows: (string | number)[][]) =>
  `\uFEFF${[header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
