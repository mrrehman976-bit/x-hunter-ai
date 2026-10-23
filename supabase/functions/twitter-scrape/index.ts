import { corsHeaders, twitterHeaders, safeJson, statusErrorMsg } from '../_shared/cors.ts';

interface Lead {
  handle: string;
  displayName: string;
  followers: number;
  bio: string;
}

// ─── Strategy 1: REST adaptive search ────────────────────────────────────────

async function searchAdaptive(
  authToken: string,
  ct0: string,
  keywords: string,
  limit: number,
): Promise<{ leads: Lead[]; status: number; error?: string; details?: string }> {
  const params = new URLSearchParams({
    q: keywords,
    count: String(Math.min(limit, 100)),
    query_source: 'typed_query',
    pc: '1',
    spelling_correction: '0',
    include_ext_is_blue_verified: '1',
    include_ext_verified_type: '1',
    include_ext_profile_image_shape: '1',
  });

  const url = `https://x.com/i/api/2/search/adaptive.json?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: twitterHeaders(authToken, ct0, `https://x.com/search?q=${encodeURIComponent(keywords)}`),
  });

  if (!response.ok) {
    const { rawText } = await safeJson(response);
    return { leads: [], status: response.status, error: statusErrorMsg('Twitter Search', response.status), details: rawText.slice(0, 500) };
  }

  const { data, parseError } = await safeJson(response);
  if (!data) {
    return { leads: [], status: 200, error: parseError || 'Failed to parse search response' };
  }

  const leads: Lead[] = [];
  const globalObjects = (data.global_objects as Record<string, unknown>) || {};
  const users = (globalObjects.users as Record<string, Record<string, unknown>>) || {};
  const tweets = (globalObjects.tweets as Record<string, Record<string, unknown>>) || {};

  const tweetUsers = new Set<string>();
  for (const tweetId of Object.keys(tweets)) {
    const tweet = tweets[tweetId];
    const userId = (tweet?.user_id_str as string) || (tweet?.user_id as string);
    if (userId) tweetUsers.add(String(userId));
  }

  const userIds = tweetUsers.size > 0 ? Array.from(tweetUsers) : Object.keys(users);

  for (const userId of userIds) {
    const user = users[userId];
    if (!user) continue;
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

// ─── Strategy 2: GraphQL SearchTimeline (fallback) ───────────────────────────

async function searchGraphQL(
  authToken: string,
  ct0: string,
  keywords: string,
  limit: number,
): Promise<{ leads: Lead[]; status: number; error?: string; details?: string }> {
  const queryIds = [
    'Pt4P9xX3hUSxBGm0ZcXqYw',
    'nK1dwXoVQk1xQ3AyEcKUWw',
    'lZ0GCEoodCDTr5W3WNY4bg',
  ];

  const variables = JSON.stringify({
    rawQuery: keywords,
    count: Math.min(limit, 50),
    querySource: 'typed_query',
    product: 'Top',
  });

  const features = JSON.stringify({
    rweb_tipsters_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    tweetypie_tweet_migration_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo_enabled: false,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    interactive_text_enabled: true,
    responsive_web_text_conversations_enabled: false,
    longform_notetweets_rich_text_read_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  });

  for (const queryId of queryIds) {
    const url = `https://x.com/i/api/graphql/${queryId}/SearchTimeline?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: twitterHeaders(authToken, ct0, `https://x.com/search?q=${encodeURIComponent(keywords)}`),
    });

    if (response.status === 404) continue;

    if (!response.ok) {
      const { rawText } = await safeJson(response);
      return { leads: [], status: response.status, error: statusErrorMsg('Twitter GraphQL Search', response.status), details: rawText.slice(0, 500) };
    }

    const { data, parseError } = await safeJson(response);
    if (!data) {
      return { leads: [], status: 200, error: parseError || 'Failed to parse GraphQL search response' };
    }

    const leads: Lead[] = [];

    try {
      const dataRoot = (data.data as Record<string, unknown>) || {};
      const searchByRawQuery = (dataRoot.search_by_raw_query as Record<string, unknown>) || {};
      const searchTimeline = (searchByRawQuery.search_timeline as Record<string, unknown>) || {};
      const timeline = (searchTimeline.timeline as Record<string, unknown>) || {};
      const instructions = (timeline.instructions as Array<Record<string, unknown>>) || [];

      const entries: Array<Record<string, unknown>> = [];
      for (const instruction of instructions) {
        const instType = instruction.type as string;
        if (instType === 'TimelineAddEntries') {
          const instEntries = instruction.entries as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(instEntries)) entries.push(...instEntries);
        }
      }

      for (const entry of entries) {
        const content = entry.content as Record<string, unknown> | undefined;
        const itemContent = content?.itemContent as Record<string, unknown> | undefined;
        const item = itemContent?.item as Record<string, unknown> | undefined;
        const userResults = item?.user_results as Record<string, unknown> | undefined;
        const result = userResults?.result as Record<string, unknown> | undefined;
        const legacy = result?.legacy as Record<string, unknown> | undefined;

        if (legacy?.screen_name) {
          leads.push({
            handle: `@${legacy.screen_name}`,
            displayName: (legacy.name as string) || (legacy.screen_name as string),
            followers: (legacy.followers_count as number) || 0,
            bio: (legacy.description as string) || '',
          });
          if (leads.length >= limit) break;
        }
      }
    } catch {
      // parsing failed — return what we have
    }

    return { leads, status: 200 };
  }

  return { leads: [], status: 404, error: 'All GraphQL SearchTimeline query IDs returned 404.' };
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

    let result = await searchAdaptive(auth_token, ct0, keywords, limit);

    if (result.leads.length === 0 && result.status !== 200) {
      const gqlResult = await searchGraphQL(auth_token, ct0, keywords, limit);
      if (gqlResult.leads.length > 0) {
        result = gqlResult;
      } else if (gqlResult.error && !result.error) {
        result = gqlResult;
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
