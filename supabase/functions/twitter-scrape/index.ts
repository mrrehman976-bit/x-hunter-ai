import { corsHeaders, twitterHeaders, safeJson, statusErrorMsg } from '../_shared/cors.ts';

interface Lead {
  handle: string;
  displayName: string;
  followers: number;
  bio: string;
}

interface SearchResult {
  leads: Lead[];
  status: number;
  error?: string;
  details?: string;
}

// REST-only: no GraphQL calls. Uses adaptive.json (primary) + users/search.json (fallback).

async function searchAdaptive(
  authToken: string,
  ct0: string,
  keywords: string,
  limit: number,
): Promise<SearchResult> {
  const url = `https://x.com/i/api/2/search/adaptive.json?q=${encodeURIComponent(keywords)}&count=20&search_mode=user`;

  const response = await fetch(url, {
    method: 'GET',
    headers: twitterHeaders(authToken, ct0, 'https://x.com/search'),
  });

  if (!response.ok) {
    const { rawText } = await safeJson(response);
    return { leads: [], status: response.status, error: statusErrorMsg('Twitter Search', response.status), details: rawText.slice(0, 500) };
  }

  const { data, parseError, rawText } = await safeJson(response);
  if (!data) {
    return { leads: [], status: 200, error: parseError || 'Empty response body', details: rawText.slice(0, 500) };
  }

  const leads: Lead[] = [];
  const globalObjects = (data.global_objects as Record<string, unknown>) || {};
  const users = (globalObjects.users as Record<string, Record<string, unknown>>) || {};

  for (const userId of Object.keys(users)) {
    const user = users[userId];
    const screenName = user.screen_name as string;
    if (!screenName) continue;
    leads.push({
      handle: `@${screenName}`,
      displayName: (user.name as string) || screenName,
      followers: (user.followers_count as number) || 0,
      bio: (user.description as string) || '',
    });
    if (leads.length >= limit) break;
  }

  return { leads, status: 200 };
}

// ─── Strategy 2: REST users/search.json (fallback) ───────────────────────────

async function searchUsers(
  authToken: string,
  ct0: string,
  keywords: string,
  limit: number,
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: keywords,
    count: String(Math.min(limit, 20)),
    include_entities: 'true',
  });

  const url = `https://x.com/i/api/1.1/users/search.json?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: twitterHeaders(authToken, ct0, 'https://x.com/search'),
  });

  if (!response.ok) {
    const { rawText } = await safeJson(response);
    return { leads: [], status: response.status, error: statusErrorMsg('Twitter Users Search', response.status), details: rawText.slice(0, 500) };
  }

  const { data, parseError, rawText } = await safeJson(response);
  if (!data) {
    return { leads: [], status: 200, error: parseError || 'Empty response body', details: rawText.slice(0, 500) };
  }

  const leads: Lead[] = [];

  // users/search.json returns an array of user objects
  const usersArray = Array.isArray(data) ? data : (data.users as Array<Record<string, unknown>>) || [];

  for (const user of usersArray) {
    const screenName = user.screen_name as string;
    if (!screenName) continue;
    leads.push({
      handle: `@${screenName}`,
      displayName: (user.name as string) || screenName,
      followers: (user.followers_count as number) || 0,
      bio: (user.description as string) || '',
    });
    if (leads.length >= limit) break;
  }

  return { leads, status: 200 };
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { auth_token, ct0, keywords, max_leads } = body;

    if (!auth_token || !ct0) {
      return new Response(
        JSON.stringify({ error: 'Missing auth_token or ct0 (CSRF token). Both are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!keywords) {
      return new Response(
        JSON.stringify({ error: 'Missing keywords parameter.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const limit = Math.min(max_leads || 25, 50);

    // Strategy 1: REST adaptive search with search_mode=user
    let result = await searchAdaptive(auth_token, ct0, keywords, limit);

    // Strategy 2: Fallback to users/search.json if adaptive returned no leads
    if (result.leads.length === 0) {
      const usersResult = await searchUsers(auth_token, ct0, keywords, limit);
      if (usersResult.leads.length > 0) {
        result = usersResult;
      } else if (usersResult.error && !result.error) {
        result = usersResult;
      }
    }

    if (result.error && result.leads.length === 0) {
      return new Response(
        JSON.stringify({ error: result.error, status: result.status, details: result.details }),
        { status: result.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ leads: result.leads, count: result.leads.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Server error: ${(err as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
