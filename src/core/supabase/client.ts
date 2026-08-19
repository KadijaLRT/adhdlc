import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

/**
 * Lazily constructs the Supabase client on first real use, rather than
 * at module-import time. This matters because Expo Router's static web
 * export prerenders every route in Node.js (no `window`), and eagerly
 * creating a client wired to AsyncStorage would try to touch
 * `window.localStorage` during that prerender pass and crash the build.
 * AsyncStorage itself is imported lazily too, for the same reason.
 */
async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('supabase: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing. Check .env.');
  }

  // require() here (not `await import()`) is deliberate: it sidesteps a
  // tsc quirk under this project's `module: "preserve"` setting, while
  // keeping the exact same laziness — this only executes when the line
  // actually runs, not at module-import time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  cachedClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web: clicking the magic-link email opens the web app with
        // auth tokens in the URL, and this tells supabase-js to read
        // them and finish signing in automatically. Native: no URL for
        // the SDK to read here — completeNativeSessionFromUrl below
        // (wired to a Linking listener in the root layout) handles it
        // instead, so this stays off on native to avoid double-handling.
        detectSessionInUrl: Platform.OS === 'web',
      },
    }
  );
  return cachedClient;
}

/**
 * Sends a passwordless sign-in link to the given email. No password to
 * create or forget — this is purely a backup/restore mechanism, never
 * required to use the app. Returns a plain error string (or null) so
 * the UI can show it without needing to know Supabase's error shape.
 */
export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  try {
    const supabase = await getSupabaseClient();
    // Web: comes back to the same page, and detectSessionInUrl (set
    // above) finishes the sign-in automatically. Native: comes back
    // through the app's own URL scheme (registered in app.json),
    // caught by completeNativeSessionFromUrl below via the
    // Linking listener wired up in the root layout.
    const redirectTo = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.location.origin : undefined)
      : Linking.createURL('/');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message || null };
  } catch (error) {
    console.error('supabase: sign-in request failed', error);
    return { error: 'Something went wrong sending that link. Try again in a moment.' };
  }
}

/**
 * Native counterpart to web's detectSessionInUrl. Supabase's magic-link
 * email points back at the app's own URL scheme; when the OS hands
 * that URL to the app (cold start or already running), this pulls the
 * access/refresh tokens out of it and finishes the sign-in manually.
 * Called from a Linking listener in the root layout — safe to call
 * with any URL, including ones with no auth tokens (it just no-ops).
 */
export async function completeNativeSessionFromUrl(url: string | null): Promise<boolean> {
  try {
    if (!url || Platform.OS === 'web') return false;

    // Supabase's magic-link redirect puts the tokens in the URL
    // fragment (#access_token=...), which Linking.parse's queryParams
    // doesn't cover (that's just the ? query string) — so both are
    // checked, fragment first since that's where Supabase actually
    // puts them.
    const fragment = url.split('#')[1];
    const fragmentParams = fragment ? Object.fromEntries(new URLSearchParams(fragment)) : {};
    const { queryParams } = Linking.parse(url);

    const accessToken = fragmentParams.access_token || (queryParams?.access_token as string) || null;
    const refreshToken = fragmentParams.refresh_token || (queryParams?.refresh_token as string) || null;
    if (!accessToken || !refreshToken) return false;

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) {
      console.error('supabase: native session completion failed', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('supabase: native session completion failed', error);
    return false;
  }
}

/**
 * Fires `onSignedIn` any time Supabase reports a session appearing —
 * covers every real path a session can show up through: web's
 * automatic detectSessionInUrl finishing after the magic-link redirect
 * lands, native's completeNativeSessionFromUrl calling setSession
 * explicitly, or a token silently refreshing on an app relaunch. This
 * is what was actually missing before: syncProfileIfSignedIn existed
 * and correctly no-ops with no session, but nothing ever *re-called*
 * it once a session showed up after the point it was first tried
 * during onboarding (before the magic link had been clicked at all).
 * Returns an unsubscribe function; safe to call multiple times, each
 * call sets up its own independent listener.
 */
export async function subscribeToAuthChanges(onSignedIn: () => void): Promise<() => void> {
  try {
    const supabase = await getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        onSignedIn();
      }
    });
    return () => data.subscription.unsubscribe();
  } catch (error) {
    console.error('supabase: failed to subscribe to auth changes', error);
    return () => {};
  }
}

/** Whether there's currently a signed-in Supabase session on this device. */
export async function hasCloudSession(): Promise<boolean> {
  try {
    // Only actually skip during web's server-side prerender pass (no
    // `window` there). On native, `window` is never defined — that's
    // normal, not a signal to skip.
    if (Platform.OS === 'web' && typeof window === 'undefined') return false;
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return !!data?.session?.user?.id;
  } catch (error) {
    console.error('supabase: session check failed', error);
    return false;
  }
}

/**
 * Pulls the profile back down from Supabase if the person is signed in
 * and has a saved row — the other half of syncProfileIfSignedIn below.
 * This is what actually protects against local storage getting wiped
 * (e.g. iOS's 7-day inactive-storage eviction): sign in once, and a
 * fresh/emptied device can restore instead of falling through to
 * onboarding. Returns the full profile object (every onboarding
 * answer, not just the original four fields) if `profile_data` was
 * saved; falls back to reconstructing just those four fields from the
 * older typed columns for anyone who synced before this existed.
 * Returns null for "nothing to restore," never throws.
 */
export async function restoreProfileFromCloud(): Promise<Record<string, unknown> | null> {
  try {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    const supabase = await getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return null;

    if (data.profile_data && typeof data.profile_data === 'object') {
      return data.profile_data as Record<string, unknown>;
    }

    // Older sync predates profile_data — reconstruct what we can.
    return {
      timezone: data.timezone || 'UTC',
      energyBaseline: data.energy_baseline || 'medium',
      stressThreshold: data.stress_threshold || 'medium',
      biggestHurdle: data.biggest_hurdle || '',
    };
  } catch (error) {
    console.error('supabase: profile restore failed', error);
    return null;
  }
}

/**
 * Best-effort cloud profile sync. The app never requires an account:
 * this checks for an existing session and returns quietly (no error
 * noise) if there isn't one. Local storage is always the source of
 * truth; this is purely an optional upgrade path. Syncs the entire
 * profile object (modules selected, symptoms, fitness/nutrition
 * preferences, coaching style — everything from onboarding) via
 * profile_data, not just the original four fields; those four also
 * still get their own typed columns for simple querying.
 */
export async function syncProfileIfSignedIn(profile: Record<string, unknown> & {
  timezone?: string; energyBaseline?: string; stressThreshold?: string; biggestHurdle?: string;
}): Promise<void> {
  try {
    // Only actually skip during web's server-side prerender pass — not
    // on native, where `window` is never defined at all.
    if (Platform.OS === 'web' && typeof window === 'undefined') return;

    const supabase = await getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return; // no account yet — expected, not an error

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        timezone: profile?.timezone || 'UTC',
        energy_baseline: profile?.energyBaseline || 'medium',
        stress_threshold: profile?.stressThreshold || 'medium',
        biggest_hurdle: profile?.biggestHurdle || '',
        profile_data: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) console.error('supabase: profile sync failed', error);
  } catch (error) {
    console.error('supabase: unexpected sync error', error);
  }
}
