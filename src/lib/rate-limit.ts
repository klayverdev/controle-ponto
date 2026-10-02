import { prisma } from "./db";

const RULES = [
  { windowSec: 60, max: 5, blockSec: 60 },
  { windowSec: 900, max: 10, blockSec: 900 },
];
const WIDEST = Math.max(...RULES.map((r) => r.windowSec));

export async function recordFailure(keys: string[]) {
  await prisma.rateLimitEvent.createMany({ data: keys.map((key) => ({ key })) });
  if (Math.random() < 0.01) {
    await prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 864e5) } } });
  }
}

export async function retryAfter(keys: string[]) {
  const now = Date.now();
  const events = await prisma.rateLimitEvent.findMany({
    where: { key: { in: keys }, createdAt: { gte: new Date(now - WIDEST * 1000) } },
    select: { key: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  let wait = 0;
  for (const key of keys) {
    const times = events.filter((e) => e.key === key).map((e) => e.createdAt.getTime());
    for (const rule of RULES) {
      const inWindow = times.filter((t) => t >= now - rule.windowSec * 1000);
      if (inWindow.length >= rule.max) wait = Math.max(wait, Math.ceil((inWindow[0]! + rule.blockSec * 1000 - now) / 1000));
    }
  }
  return wait;
}

export async function consume(key: string, max: number, windowSec: number) {
  const count = await prisma.rateLimitEvent.count({
    where: { key, createdAt: { gte: new Date(Date.now() - windowSec * 1000) } },
  });
  if (count >= max) return false;
  await prisma.rateLimitEvent.create({ data: { key } });
  return true;
}

export const countSince = (prefix: string, seconds: number) =>
  prisma.rateLimitEvent.count({
    where: { key: { startsWith: prefix }, createdAt: { gte: new Date(Date.now() - seconds * 1000) } },
  });
