'use server';

import { createClient } from '@stashinn/lib/supabase/server';

export async function pingUrls(urls: string[]) {
  const results = await Promise.all(
    urls.map(async (url) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, { signal: controller.signal, method: 'GET' });
        clearTimeout(timeoutId);

        const latency = Date.now() - start;
        return {
          url,
          status: response.ok ? 'up' : 'down',
          statusCode: response.status,
          latency
        };
      } catch (error) {
        return {
          url,
          status: 'down',
          statusCode: 0,
          latency: Date.now() - start
        };
      }
    })
  );

  return results;
}

export async function pingSupabase() {
  const supabase = await createClient();
  
  // Ping DB
  const dbStart = Date.now();
  let dbStatus = 'down';
  try {
    const { error } = await supabase.from('system_config').select('key').limit(1);
    if (!error) dbStatus = 'up';
  } catch (e) {}
  const dbLatency = Date.now() - dbStart;

  // Ping Auth
  const authStart = Date.now();
  let authStatus = 'down';
  try {
    const { error } = await supabase.auth.getSession();
    if (!error) authStatus = 'up';
  } catch (e) {}
  const authLatency = Date.now() - authStart;

  return {
    db: { status: dbStatus, latency: dbLatency },
    auth: { status: authStatus, latency: authLatency }
  };
}

export async function getConfiguredUrls() {
  const supabase = await createClient();
  const { data: config } = await supabase.from('system_config').select('key, value').in('key', ['prod_urls', 'preview_urls']);
  
  const map: any = {};
  config?.forEach(row => {
    map[row.key] = row.value;
  });

  return {
    prodUrls: Array.isArray(map.prod_urls) ? map.prod_urls : [
      'https://stashinn.in/',
      'https://partner.stashinn.in/',
      'https://admin.stashinn.in/'
    ],
    previewUrls: Array.isArray(map.preview_urls) ? map.preview_urls : [
      'https://dev.stashinn.in/',
      'https://partner-dev.stashinn.in/',
      'https://admin-dev.stashinn.in/',
      'https://preprod.stashinn.in/',
      'https://partner-preprod.stashinn.in/',
      'https://admin-preprod.stashinn.in/'
    ]
  };
}
