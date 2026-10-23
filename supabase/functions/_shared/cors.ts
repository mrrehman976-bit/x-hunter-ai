export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export const BEARER_TOKEN =
  'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export function twitterHeaders(
  authToken: string,
  ct0: string,
  referer = 'https://x.com/home',
): Record<string, string> {
  return {
    authorization: BEARER_TOKEN,
    'x-csrf-token': ct0,
    cookie: `auth_token=${authToken}; ct0=${ct0}`,
    'content-type': 'application/json',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'x-twitter-auth-type': 'OAuth2Session',
    referer,
    accept: '*/*',
    origin: 'https://x.com',
    'sec-ch-ua':
      '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };
}

/**
 * Safely reads a Response body as JSON. Returns null and a descriptive error
 * if the body is empty, HTML, or otherwise unparseable — never throws.
 */
export async function safeJson(
  response: Response,
): Promise<{ data: Record<string, unknown> | null; rawText: string; parseError?: string }> {
  const rawText = await response.text();
  if (!rawText || rawText.trim() === '') {
    return { data: null, rawText: '', parseError: 'Empty response body' };
  }
  try {
    return { data: JSON.parse(rawText) as Record<string, unknown>, rawText };
  } catch {
    const preview = rawText.slice(0, 200).replace(/\n/g, ' ');
    return {
      data: null,
      rawText,
      parseError: `Twitter returned non-JSON response (HTTP ${response.status}). Body preview: ${preview}`,
    };
  }
}

export function statusErrorMsg(prefix: string, status: number): string {
  if (status === 401)
    return `${prefix}: Unauthorized (401) — auth_token or ct0 is invalid/expired.`;
  if (status === 403)
    return `${prefix}: Forbidden (403) — account may be suspended or rate-limited.`;
  if (status === 429)
    return `${prefix}: Rate limited (429) — too many requests. Wait before retrying.`;
  return `${prefix} returned ${status}`;
}
