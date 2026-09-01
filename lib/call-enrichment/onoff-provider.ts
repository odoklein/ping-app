import type { CallProvider, CallProviderInput, CallRecord } from './provider';
import { ceDebug } from './debug';

const ONOFF_BASE_URL = 'https://api.onoffbusiness.com/v1';

export interface OnoffCall {
  id: string;
  from: string;
  to: string;
  duration: number;
  direction?: 'INBOUND' | 'OUTBOUND';
  status?: string;
  recording_url?: string;
  summary?: string;
  transcription?: string;
  created_at?: string;
  started_at?: string;
}

export class OnoffProvider implements CallProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchMatchingCallRecord(input: CallProviderInput): Promise<CallRecord | null> {
    const { phones, alloNumbers, windowStart, windowEnd } = input;
    const fromIso = windowStart.toISOString();
    const toIso = windowEnd.toISOString();

    ceDebug('onoff lookup starting', { phones, numbers: alloNumbers, fromIso, toIso });

    // Iterate through lines / phone numbers assigned to this SDR
    for (const callerNumber of alloNumbers) {
      try {
        const url = new URL(`${ONOFF_BASE_URL}/call-logs`);
        url.searchParams.set('phone_number', callerNumber);
        url.searchParams.set('from_date', fromIso);
        url.searchParams.set('to_date', toIso);
        url.searchParams.set('limit', '50');

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          console.warn(`[call-enrichment][onoff] HTTP ${res.status} for line ${callerNumber}`);
          continue;
        }

        const data = await res.json();
        const calls: OnoffCall[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.calls)
          ? data.calls
          : [];

        if (calls.length === 0) continue;

        // Find best match matching candidate contact phone
        for (const call of calls) {
          const callFrom = (call.from || '').replace(/[^\d+]/g, '');
          const callTo = (call.to || '').replace(/[^\d+]/g, '');

          const matchesPhone = phones.some((candidate) => {
            const cleanCandidate = candidate.replace(/[^\d+]/g, '');
            return callFrom.includes(cleanCandidate) || callTo.includes(cleanCandidate);
          });

          if (matchesPhone) {
            console.log(`[call-enrichment][onoff] Match found! Call ID: ${call.id}, Duration: ${call.duration}s`);
            return {
              summary: call.summary?.trim() || undefined,
              transcription: call.transcription?.trim() || undefined,
              recordingUrl: call.recording_url?.trim() || undefined,
              duration: typeof call.duration === 'number' && call.duration > 0 ? call.duration : undefined,
            };
          }
        }
      } catch (err) {
        console.error(`[call-enrichment][onoff] Error fetching calls for ${callerNumber}:`, err);
      }
    }

    return null;
  }
}
