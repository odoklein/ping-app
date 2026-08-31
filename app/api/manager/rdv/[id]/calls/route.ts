import { NextRequest, NextResponse } from "next/server";
import { requireRole, withErrorHandler, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import { parseAlloCallsListResponse } from "@/lib/call-enrichment/allo-response";

const DEFAULT_COUNTRY = (process.env.PHONE_DEFAULT_COUNTRY ?? "FR") as Parameters<typeof isValidPhoneNumber>[1];
const BASE_URL = "https://api.withallo.com";
const GAP_MS = Math.max(0, parseInt(process.env.CALL_ENRICHMENT_ALLO_LINE_GAP_MS ?? "400", 10));
const RETRIES_429 = Math.max(0, parseInt(process.env.CALL_ENRICHMENT_ALLO_429_RETRIES ?? "6", 10));

type PhoneSourceKey = "contact" | "company" | "meeting";

interface PhoneSourceInfo {
  key: PhoneSourceKey;
  label: string;
  rawPhone: string;
  normalizedPhone: string;
  variants: string[];
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    if (isValidPhoneNumber(raw, DEFAULT_COUNTRY)) return parsePhoneNumber(raw, DEFAULT_COUNTRY).format("E.164");
    return null;
  } catch {
    return null;
  }
}

function extractPhoneCandidates(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  const chunks = text.match(/(?:\+|00)?\d(?:[\d\s()./-]{6,}\d)?/g) ?? [];
  if (chunks.length === 0) return [text];
  const candidates = new Set<string>();
  for (const chunk of chunks) {
    const cleaned = chunk.replace(/[^\d+]/g, "");
    if (!cleaned) continue;
    candidates.add(cleaned);
    if (cleaned.startsWith("00")) candidates.add(`+${cleaned.slice(2)}`);
    const d = cleaned.replace(/\D/g, "");
    if (d.length === 10 && d.startsWith("0")) { candidates.add(d); candidates.add(`+33${d.slice(1)}`); }
    if (d.length === 11 && d.startsWith("33")) candidates.add(`+${d}`);
  }
  return [...candidates];
}

function buildPhoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  const base = normalized ?? raw.replace(/[\s()./-]/g, "");
  const variants = new Set<string>([base]);
  if (base.startsWith("+33")) variants.add("0" + base.slice(3));
  if (base.startsWith("+")) variants.add(base.slice(1));
  // Also add candidates from raw (handles unformatted numbers like "01 23 45 67 89")
  for (const c of extractPhoneCandidates(raw)) {
    variants.add(c);
    const n = normalizePhone(c);
    if (n) {
      variants.add(n);
      if (n.startsWith("+33")) variants.add("0" + n.slice(3));
      if (n.startsWith("+")) variants.add(n.slice(1));
    }
  }
  return [...variants].filter(Boolean);
}

async function fetchAlloCallsForVariant(
  apiKey: string,
  alloNumber: string,
  contactPhone: string,
): Promise<unknown[]> {
  const url = new URL(`${BASE_URL}/v1/api/calls`);
  url.searchParams.set("allo_number", alloNumber);
  url.searchParams.set("contact_number", contactPhone);
  url.searchParams.set("size", "50");
  url.searchParams.set("page", "0");

  for (let attempt = 0; attempt <= RETRIES_429; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      next: { revalidate: 0 },
    });
    if (res.status === 429 && attempt < RETRIES_429) {
      await sleep(Math.min(750 * 2 ** attempt, 30_000));
      continue;
    }
    if (!res.ok) return [];
    const data = await res.json();
    const { rawCalls } = parseAlloCallsListResponse(data);
    return rawCalls;
  }
  return [];
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireRole(["MANAGER"], request);
  const { id } = await params;

  const action = await prisma.action.findUnique({
    where: { id, result: { in: ["MEETING_BOOKED", "MEETING_CANCELLED"] } },
    select: {
      id: true,
      meetingPhone: true,
      contact: { select: { firstName: true, lastName: true, phone: true } },
      company: { select: { name: true, phone: true } },
    },
  });

  if (!action) return errorResponse("RDV introuvable", 404);

  const apiKey = process.env.ALLO_API_KEY;
  if (!apiKey) return errorResponse("ALLO_API_KEY non configuré", 503);

  const alloNumbers = (process.env.ALLO_NUMBERS ?? "").split(",").map((n) => n.trim()).filter(Boolean);
  if (!alloNumbers.length) return errorResponse("ALLO_NUMBERS non configuré", 503);

  // Build unique phone sources (deduplicated by normalized phone)
  const seenNormalized = new Set<string>();
  const phoneSources: PhoneSourceInfo[] = [];

  const candidateSources: Array<{ key: PhoneSourceKey; raw: string | null | undefined; label: string }> = [
    {
      key: "contact",
      raw: action.contact?.phone,
      label: [action.contact?.firstName, action.contact?.lastName].filter(Boolean).join(" ").trim() || "Contact",
    },
    {
      key: "company",
      raw: action.company?.phone,
      label: action.company?.name || "Société",
    },
    {
      key: "meeting",
      raw: action.meetingPhone,
      label: "Téléphone RDV",
    },
  ];

  for (const { key, raw, label } of candidateSources) {
    if (!raw?.trim()) continue;
    const normalized = normalizePhone(raw) ?? raw.replace(/[\s()./-]/g, "");
    if (!normalized || seenNormalized.has(normalized)) continue;
    seenNormalized.add(normalized);
    phoneSources.push({
      key,
      label,
      rawPhone: raw,
      normalizedPhone: normalized,
      variants: buildPhoneVariants(raw),
    });
  }

  if (!phoneSources.length) {
    return NextResponse.json({
      success: true,
      data: { calls: [], phoneSources: [], alloLineCount: alloNumbers.length, totalCalls: 0 },
    });
  }

  // Fetch calls for each phone source × allo line × variant (serial to avoid 429)
  const callMap = new Map<string, { call: unknown; sources: PhoneSourceKey[] }>();

  for (const source of phoneSources) {
    for (let li = 0; li < alloNumbers.length; li++) {
      const alloNumber = alloNumbers[li]!;
      for (let vi = 0; vi < source.variants.length; vi++) {
        const variant = source.variants[vi]!;
        const rawCalls = await fetchAlloCallsForVariant(apiKey, alloNumber, variant);
        for (const call of rawCalls) {
          const c = call as Record<string, unknown>;
          const callId = c.id != null ? String(c.id) : "";
          if (!callId) continue;
          if (!callMap.has(callId)) callMap.set(callId, { call, sources: [] });
          const entry = callMap.get(callId)!;
          if (!entry.sources.includes(source.key)) entry.sources.push(source.key);
        }
        if (vi < source.variants.length - 1 && GAP_MS > 0) await sleep(GAP_MS);
      }
      if (li < alloNumbers.length - 1 && GAP_MS > 0) await sleep(GAP_MS);
    }
  }

  const calls = [...callMap.entries()]
    .map(([, { call, sources }]) => ({ ...(call as Record<string, unknown>), _matchedSources: sources }))
    .sort((a: any, b: any) => {
      const ta = new Date(a.start_time ?? a.created_at ?? 0).getTime();
      const tb = new Date(b.start_time ?? b.created_at ?? 0).getTime();
      return tb - ta;
    });

  return NextResponse.json({
    success: true,
    data: {
      calls,
      phoneSources: phoneSources.map((s) => ({
        key: s.key,
        label: s.label,
        phone: s.normalizedPhone,
        rawPhone: s.rawPhone,
        callCount: [...callMap.values()].filter(({ sources }) => sources.includes(s.key)).length,
      })),
      alloLineCount: alloNumbers.length,
      totalCalls: callMap.size,
    },
  });
});
