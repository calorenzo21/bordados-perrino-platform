import { env } from '@/config/env';
import webpush from 'web-push';

import { createAdminClient } from '@/lib/supabase/server';

webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const supabase = await createAdminClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subscriptions?.length) return;

  const expiredIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'statusCode' in err &&
          (err.statusCode === 410 || err.statusCode === 404)
        ) {
          // Endpoint expired — schedule for cleanup
          expiredIds.push(sub.id);
        } else {
          console.error('[Push] sendNotification failed for endpoint', sub.endpoint, err);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds);
  }
}

export async function sendPushToClient(clientId: string, payload: PushPayload): Promise<void> {
  const supabase = await createAdminClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single();

  if (error || !client?.user_id) return;

  await sendPushToUser(client.user_id, payload);
}
