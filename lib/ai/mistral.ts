/**
 * Mistral AI API helper.
 * Defaults to 'mistral-small-latest' (or process.env.MISTRAL_MODEL) to ensure
 * compatibility across all subscription tiers (including standard/free tiers).
 */

export const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export function getMistralModel(overrideModel?: string): string {
    return overrideModel || process.env.MISTRAL_MODEL || 'mistral-small-latest';
}

export interface MistralMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface MistralOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonResponse?: boolean;
}

/**
 * Execute fetch request to Mistral API with tier fallback.
 * If configured model returns 403 tier_not_allowed, automatically retries with mistral-small-latest.
 */
export async function mistralFetch(
    apiKey: string,
    payload: Record<string, unknown>
): Promise<Response> {
    const modelToUse = (payload.model as string) || getMistralModel();
    const body = { ...payload, model: modelToUse };

    let response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok && response.status === 403 && modelToUse !== 'mistral-small-latest') {
        try {
            const errorData = await response.clone().json();
            if (errorData?.type === 'tier_not_allowed' || errorData?.code === '1910' || errorData?.code === 1910) {
                console.warn(`Mistral model "${modelToUse}" restricted by tier. Falling back to "mistral-small-latest"...`);
                body.model = 'mistral-small-latest';
                response = await fetch(MISTRAL_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(body),
                });
            }
        } catch {
            // Ignore clone/json parsing errors
        }
    }

    return response;
}
