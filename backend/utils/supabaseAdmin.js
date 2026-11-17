if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role client: backend only. Bypasses RLS, so always filter personal data by the verified user id.
const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

function isSupabaseNetworkError(err) {
  if (!err) return false;
  const msg = String(err.message || err);
  return (
    err.name === 'AuthRetryableFetchError' ||
    err.status === 0 ||
    /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR_/i.test(msg)
  );
}

async function withSupabaseRetry(fn, retries = 1) {
  let result = await fn();
  for (let i = 0; i < retries; i++) {
    if (!result?.error || !isSupabaseNetworkError(result.error)) {
      return result;
    }
    await new Promise((r) => setTimeout(r, 150));
    result = await fn();
  }
  return result;
}

module.exports = { supabaseAdmin, isSupabaseNetworkError, withSupabaseRetry };

