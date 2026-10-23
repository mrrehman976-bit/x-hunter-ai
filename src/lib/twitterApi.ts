import type { Lead } from '@/types/lead';

// ─── Twitter API client (direct fetch to edge functions) ─────────────────────
// We use direct fetch() instead of supabase.functions.invoke() to avoid
// FunctionsFetchError issues with the SDK's internal request handling.

export interface ScrapeResult {
  leads: Array<{
    handle: string;
    displayName: string;
    followers: number;
    bio: string;
  }>;
  count: number;
  error?: string;
  raw_response?: unknown;
}

export interface DmResult {
  success: boolean;
  message_id?: string;
  recipient?: string;
  recipient_id?: string;
  error?: string;
  raw_response?: unknown;
}

export interface InboxReply {
  screen_name: string;
  text: string;
  message_id: string;
  created_at: string;
}

export interface InboxResult {
  replies: InboxReply[];
  count: number;
  error?: string;
  raw_response?: unknown;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callEdgeFunction<T>(
  slug: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${slug}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { error: `Network error calling edge function "${slug}": ${(err as Error).message}` } as T;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unable to read response body');
    let errorMsg = `Edge function "${slug}" returned HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) errorMsg = errorJson.error;
      if (errorJson.details) errorMsg += ` — ${errorJson.details}`;
    } catch {
      if (errorText) errorMsg += ` — ${errorText.slice(0, 300)}`;
    }
    return { error: errorMsg, raw_response: { status: response.status, body: errorText.slice(0, 500) } } as T;
  }

  const data = await response.json().catch(() => ({}));
  return data as T;
}

export async function scrapeTwitterLeads(
  authToken: string,
  ct0: string,
  keywords: string,
  maxLeads: number,
): Promise<ScrapeResult> {
  try {
    const result = await callEdgeFunction<ScrapeResult>('twitter-scrape', {
      auth_token: authToken,
      ct0,
      keywords,
      max_leads: maxLeads,
    });

    if (result.error) {
      return { leads: [], count: 0, error: result.error, raw_response: result.raw_response };
    }

    if (!result.leads) {
      return { leads: [], count: 0, error: 'No leads data returned from edge function.' };
    }

    return result;
  } catch (err) {
    return { leads: [], count: 0, error: `Unexpected error: ${(err as Error).message}` };
  }
}

export async function sendTwitterDm(
  authToken: string,
  ct0: string,
  recipientScreenName: string,
  text: string,
): Promise<DmResult> {
  try {
    const result = await callEdgeFunction<DmResult>('twitter-dm', {
      auth_token: authToken,
      ct0,
      recipient_screen_name: recipientScreenName,
      text,
    });

    if (result.error) {
      return { success: false, error: result.error, raw_response: result.raw_response };
    }

    return result;
  } catch (err) {
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

export async function scanTwitterInbox(
  authToken: string,
  ct0: string,
  screenNames: string[],
): Promise<InboxResult> {
  try {
    const result = await callEdgeFunction<InboxResult>('twitter-inbox', {
      auth_token: authToken,
      ct0,
      screen_names: screenNames,
    });

    if (result.error) {
      return { replies: [], count: 0, error: result.error, raw_response: result.raw_response };
    }

    if (!result.replies) {
      return { replies: [], count: 0, error: 'No replies data returned from edge function.' };
    }

    return result;
  } catch (err) {
    return { replies: [], count: 0, error: `Unexpected error: ${(err as Error).message}` };
  }
}

export function detectReplyIntent(text: string): 'interested' | 'query' | 'pricing' | 'objection' {
  const lower = text.toLowerCase();
  if (lower.match(/pric(e|ing)|cost|how much|plan/)) return 'pricing';
  if (lower.match(/interested|love it|sounds great|tell me more|more detail/)) return 'interested';
  if (lower.match(/not now|too busy|already use|not interested|maybe later/)) return 'objection';
  return 'query';
}

export function extractTwitterTokens(credentials: {
  authMethod: string;
  cookieToken: string;
  ct0Token: string;
  accessToken: string;
}): { authToken: string; ct0: string } | null {
  if (credentials.authMethod === 'cookie') {
    const cookie = credentials.cookieToken || '';
    let ct0 = credentials.ct0Token?.trim() ?? '';

    if (!ct0 && cookie) {
      const ct0Match = cookie.match(/ct0=([^;]+)/);
      ct0 = ct0Match?.[1] ?? '';
    }

    let authToken = '';
    if (cookie) {
      const authMatch = cookie.match(/auth_token=([^;]+)/);
      authToken = authMatch?.[1] ?? cookie.trim();
    }

    if (authToken && ct0) return { authToken, ct0 };
    return null;
  }
  return null;
}

export type { Lead };
