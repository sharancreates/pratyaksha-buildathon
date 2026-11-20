export interface CachedToken {
  token: string;
  expiresAt: number;
  audience: string;
}

let cachedIdToken: CachedToken | null = null;

export function resetTokenCache(): void {
  cachedIdToken = null;
}

export function getCachedToken(): CachedToken | null {
  return cachedIdToken;
}

/**
 * Fetch Google IAM ID Token for invoking Cloud Run service-to-service endpoints.
 * Interrogates GCP instance metadata server if target audience is HTTPS and running on GCP.
 */
export async function getGcpIdToken(
  targetAudience: string,
  metadataHost: string = 'http://metadata.google.internal'
): Promise<string | null> {
  // If target audience is empty or not https (e.g. localhost), no IAM token needed
  if (!targetAudience || !targetAudience.startsWith('https://')) {
    return null;
  }

  const now = Date.now();
  if (
    cachedIdToken &&
    cachedIdToken.audience === targetAudience &&
    cachedIdToken.expiresAt > now + 60000
  ) {
    return cachedIdToken.token;
  }

  try {
    const metadataUrl = `${metadataHost}/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(
      targetAudience
    )}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      const token = text.trim();
      if (token) {
        cachedIdToken = {
          token,
          expiresAt: now + 50 * 60 * 1000, // 50 minute TTL
          audience: targetAudience,
        };
        return token;
      }
    }
  } catch (_err) {
    // Graceful fallback when outside GCP (local dev, docker compose, tests)
  }

  return null;
}
