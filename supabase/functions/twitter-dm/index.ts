import { corsHeaders, twitterHeaders, safeJson, statusErrorMsg } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { auth_token, ct0, recipient_screen_name, text } = body;

    if (!auth_token || !ct0) {
      return new Response(
        JSON.stringify({ error: 'Missing auth_token or ct0 (CSRF token).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!recipient_screen_name || !text) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient_screen_name or text.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cleanName = recipient_screen_name.replace('@', '');

    // Step 1: Resolve screen name → user ID
    const showUrl = `https://x.com/i/api/1.1/users/show.json?screen_name=${encodeURIComponent(cleanName)}`;
    const userIdResponse = await fetch(showUrl, {
      method: 'GET',
      headers: twitterHeaders(auth_token, ct0, `https://x.com/${cleanName}`),
    });

    if (!userIdResponse.ok) {
      const { rawText } = await safeJson(userIdResponse);
      return new Response(
        JSON.stringify({ error: statusErrorMsg('Twitter DM (resolve user)', userIdResponse.status), status: userIdResponse.status, details: rawText.slice(0, 500) }),
        { status: userIdResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: userData, parseError: userParseError } = await safeJson(userIdResponse);
    if (!userData) {
      return new Response(
        JSON.stringify({ error: userParseError || 'Failed to parse user lookup response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const recipientId = userData.id_str as string;
    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: `Could not resolve Twitter user ID for @${recipient_screen_name}.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Step 2: Send the DM
    const dmPayload = {
      event: {
        type: 'message_create',
        message_create: {
          target: { recipient_id: recipientId },
          message_data: { text },
        },
      },
    };

    const dmResponse = await fetch('https://x.com/i/api/1.1/direct_messages/events/new.json', {
      method: 'POST',
      headers: twitterHeaders(auth_token, ct0, 'https://x.com/messages'),
      body: JSON.stringify(dmPayload),
    });

    if (!dmResponse.ok) {
      const { rawText } = await safeJson(dmResponse);
      return new Response(
        JSON.stringify({ error: statusErrorMsg('Twitter DM', dmResponse.status), status: dmResponse.status, details: rawText.slice(0, 500) }),
        { status: dmResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: dmData, parseError: dmParseError } = await safeJson(dmResponse);
    if (!dmData) {
      return new Response(
        JSON.stringify({ error: dmParseError || 'Failed to parse DM send response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const messageId = (dmData.event as Record<string, unknown>)?.id as string | undefined;

    return new Response(
      JSON.stringify({ success: true, message_id: messageId, recipient: recipient_screen_name, recipient_id: recipientId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Server error: ${(err as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
