import { corsHeaders, twitterHeaders, safeJson, statusErrorMsg } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { auth_token, ct0, screen_names } = body;

    if (!auth_token || !ct0) {
      return new Response(
        JSON.stringify({ error: 'Missing auth_token or ct0 (CSRF token).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!screen_names || !Array.isArray(screen_names) || screen_names.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing screen_names array.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const queryId = '4jXfQll1gWjHjyRqzZBFkA';
    const variables = JSON.stringify({ count: 50, includeGroups: true });
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

    const url = `https://x.com/i/api/graphql/${queryId}/DMInbox?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: twitterHeaders(auth_token, ct0, 'https://x.com/messages'),
    });

    if (!response.ok) {
      const { rawText } = await safeJson(response);
      return new Response(
        JSON.stringify({ error: statusErrorMsg('Twitter Inbox', response.status), status: response.status, details: rawText.slice(0, 500) }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data, parseError } = await safeJson(response);
    if (!data) {
      return new Response(
        JSON.stringify({ error: parseError || 'Failed to parse inbox response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const replies: Array<{
      screen_name: string;
      text: string;
      message_id: string;
      created_at: string;
    }> = [];

    try {
      const dataRoot = (data.data as Record<string, unknown>) || {};
      const viewer = (dataRoot.viewer as Record<string, unknown>) || {};
      const dmInbox = (viewer.dm_inbox as Record<string, unknown>) || {};
      const inboxTimeline = (dmInbox.inbox_timeline as Record<string, unknown>) || {};
      const timeline = (inboxTimeline.timeline as Record<string, unknown>) || {};
      const instructions = (timeline.instructions as Array<Record<string, unknown>>) || [];

      const entries: Array<Record<string, unknown>> = [];
      for (const instruction of instructions) {
        const instType = instruction.type as string;
        if (instType === 'TimelineAddEntries') {
          const instEntries = instruction.entries as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(instEntries)) entries.push(...instEntries);
        }
      }

      const users = (dmInbox.users as Record<string, Record<string, unknown>>) || {};

      const normalizeName = (name: string): string => (name.startsWith('@') ? name : `@${name}`);

      for (const entry of entries) {
        const content = entry.content as Record<string, unknown> | undefined;
        const itemContent = content?.itemContent as Record<string, unknown> | undefined;
        if (!itemContent) continue;

        const message = itemContent.message as Record<string, unknown> | undefined;
        const messageData = message?.message_data as Record<string, unknown> | undefined;
        if (!messageData?.text) continue;

        const senderId = message?.sender_id as string;
        const userInfo = users[senderId];
        const screenName = userInfo?.screen_name as string | undefined;

        if (screenName) {
          const matchName = normalizeName(screenName);
          if (screen_names.includes(matchName) || screen_names.includes(screenName)) {
            replies.push({
              screen_name: matchName,
              text: messageData.text as string,
              message_id: (messageData.id as string) || '',
              created_at: (messageData.time as string) || new Date().toISOString(),
            });
          }
        }
      }
    } catch (parseErr) {
      return new Response(
        JSON.stringify({
          replies: [],
          count: 0,
          error: `Failed to parse DM inbox structure: ${(parseErr as Error).message}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ replies, count: replies.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Server error: ${(err as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
