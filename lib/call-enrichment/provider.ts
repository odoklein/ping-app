import { AlloProvider } from './allo-provider';
import { OnoffProvider } from './onoff-provider';
import { prisma } from '@/lib/prisma';
import { getGlobalVoipConfig } from '@/app/api/system-config/voip/route';

export interface CallRecord {
  summary?: string;
  transcription?: string;
  recordingUrl?: string;
  duration?: number;
}

export interface CallProviderInput {
  phones: string[];
  alloNumbers: string[];
  sdrId: string;
  windowStart: Date;
  windowEnd: Date;
}

export interface CallProvider {
  fetchMatchingCallRecord(input: CallProviderInput): Promise<CallRecord | null>;
}

export async function getCallProviderForUser(sdrId?: string): Promise<CallProvider> {
  const globalConfig = await getGlobalVoipConfig();

  if (sdrId) {
    const user = await prisma.user.findUnique({
      where: { id: sdrId },
      select: {
        voipProvider: true,
        onoffNumber: true,
        alloPhoneNumber: true,
        ringoverNumber: true,
        preferences: true,
      },
    });

    const prefs = (user?.preferences as Record<string, unknown> | null) ?? {};
    const personalApiKey =
      typeof prefs.voipApiKey === 'string' && prefs.voipApiKey.trim() ? prefs.voipApiKey.trim() : null;

    if (user?.voipProvider === 'ONOFF') {
      const onoffKey = personalApiKey || globalConfig.onoffApiKey;
      if (onoffKey) {
        console.log(`[call-enrichment] provider=Onoff Business (SDR ${sdrId} configured for ONOFF)`);
        return new OnoffProvider(onoffKey);
      }
    }

    if (user?.voipProvider === 'ALLO') {
      const alloKey = personalApiKey || globalConfig.alloApiKey;
      if (alloKey) {
        console.log(`[call-enrichment] provider=Allo (SDR ${sdrId} configured for ALLO)`);
        return new AlloProvider(alloKey);
      }
    }

    if (user?.voipProvider === 'NONE') {
      console.log(`[call-enrichment] provider=NONE (SDR ${sdrId} VoIP disabled)`);
      return {
        fetchMatchingCallRecord: async () => null,
      };
    }
  }

  // Default fallback to global config (Database SystemConfig or .env)
  if (globalConfig.alloApiKey) {
    return new AlloProvider(globalConfig.alloApiKey);
  }

  if (globalConfig.onoffApiKey) {
    return new OnoffProvider(globalConfig.onoffApiKey);
  }

  return {
    fetchMatchingCallRecord: async () => {
      console.warn('[call-enrichment] fetchMatchingCallRecord: NOOP (No active VoIP API key set)');
      return null;
    },
  };
}

export const callProvider: CallProvider = {
  fetchMatchingCallRecord: async (input: CallProviderInput) => {
    const provider = await getCallProviderForUser(input.sdrId);
    return provider.fetchMatchingCallRecord(input);
  },
};
