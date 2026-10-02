const TIME_ZONE = "America/Sao_Paulo";
const OFFSET = "-03:00";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function toLocal(date: Date) {
  const p = Object.fromEntries(formatter.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

export const fromLocal = (date: string, time: string) =>
  new Date(`${date}T${time.length === 5 ? `${time}:00` : time}${OFFSET}`);

export const formatDateBr = (ymd: string) => ymd.split("-").reverse().join("/");

export const hhmm = (time: string | null | undefined) => (time ? time.slice(0, 5) : "");

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const monthOf = (ymd: string) => ({ year: Number(ymd.slice(0, 4)), month: Number(ymd.slice(5, 7)) });

export const weekday = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export const ymd = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function monthRange(year: number, month: number) {
  return { from: ymd(year, month, 1), to: ymd(year, month, daysInMonth(year, month)) };
}

const longFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatLongDate = (date: Date) => longFormatter.format(date);
