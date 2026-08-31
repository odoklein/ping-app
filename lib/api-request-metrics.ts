import { prisma } from "@/lib/prisma";

const MAX_ENDPOINT_LENGTH = 500;
const MAX_METHOD_LENGTH = 10;
const MAX_PROVIDER_LENGTH = 80;

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.pathname.substring(0, MAX_ENDPOINT_LENGTH);
  } catch {
    return endpoint.substring(0, MAX_ENDPOINT_LENGTH);
  }
}

export async function logExternalApiCallMetric(
  provider: string,
  endpoint: string,
  method: string,
  statusCode: number,
): Promise<void> {
  const date = startOfUtcDay();
  const normalizedProvider = provider.substring(0, MAX_PROVIDER_LENGTH);
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const normalizedMethod = method.substring(0, MAX_METHOD_LENGTH);
  const now = new Date();

  try {
    await prisma.apiRequestDailyMetric.upsert({
      where: {
        date_provider_endpoint_method_statusCode: {
          date,
          provider: normalizedProvider,
          endpoint: normalizedEndpoint,
          method: normalizedMethod,
          statusCode,
        },
      },
      create: {
        date,
        provider: normalizedProvider,
        endpoint: normalizedEndpoint,
        method: normalizedMethod,
        statusCode,
        count: 1,
        lastSeenAt: now,
      },
      update: {
        count: { increment: 1 },
        lastSeenAt: now,
      },
    });
  } catch (error) {
    console.error("Failed to log external API call metric:", error);
  }
}

export async function getTodayExternalApiCallSummary() {
  const today = startOfUtcDay();

  const rows = await prisma.apiRequestDailyMetric.findMany({
    where: { date: today },
    orderBy: { count: "desc" },
  });

  const totalCalls = rows.reduce((sum, row) => sum + row.count, 0);
  const failedCalls = rows
    .filter((row) => row.statusCode >= 400)
    .reduce((sum, row) => sum + row.count, 0);

  const endpointTotals = new Map<string, { provider: string; endpoint: string; method: string; count: number }>();
  for (const row of rows) {
    const key = `${row.provider} ${row.method} ${row.endpoint}`;
    const existing = endpointTotals.get(key);
    if (existing) {
      existing.count += row.count;
    } else {
      endpointTotals.set(key, {
        provider: row.provider,
        endpoint: row.endpoint,
        method: row.method,
        count: row.count,
      });
    }
  }

  return {
    date: today.toISOString().slice(0, 10),
    totalCalls,
    failedCalls,
    topEndpoints: Array.from(endpointTotals.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    failedRequests: rows
      .filter((row) => row.statusCode >= 400)
      .slice(0, 5)
      .map((row) => ({
        provider: row.provider,
        endpoint: row.endpoint,
        method: row.method,
        statusCode: row.statusCode,
        count: row.count,
      })),
  };
}
