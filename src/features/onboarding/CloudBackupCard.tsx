import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { signInWithMagicLink } from '@/core/supabase/client';

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Purely optional backup step. The app works fully without an account
 * — this exists because local-only storage (especially on iOS) can get
 * cleared by the OS after enough inactivity, and there's currently no
 * way to recover from that without ever having signed in once. Nothing
 * here blocks or gates finishing onboarding.
 */
export default function CloudBackupCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSend = async () => {
    if (!isPlausibleEmail(email)) {
      setStatus('error');
      setErrorMessage('That doesn\'t look like a valid email yet.');
      return;
    }
    setStatus('sending');
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus('error');
      setErrorMessage(error);
    } else {
      setStatus('sent');
    }
  };

  return (
    <View className="bg-indigo-400/10 border-2 border-indigo-400 rounded-2xl p-4 mb-6">
      <Text className="text-indigo-300 font-medium mb-1">🔒 Back Up Your Profile (optional)</Text>
      <Text className="text-slate-400 text-xs mb-3">
        Backs up your onboarding setup — energy baseline, coaching style, and preferences — so a lost phone or cleared browser doesn't mean redoing setup from scratch. Your tasks, logs, and everything else you build up over time stay local to this device only, for now.
      </Text>

      {status === 'sent' ? (
        <View className="bg-emerald-400/10 border border-emerald-400 rounded-xl p-3">
          <Text className="text-emerald-300 text-sm font-medium">Check your email for a sign-in link ✓</Text>
        </View>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={(v) => { setEmail(v); if (status === 'error') setStatus('idle'); }}
            placeholder="you@email.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            className="bg-slate-900 text-slate-100 rounded-xl px-3 py-3 mb-2"
          />
          {status === 'error' && <Text className="text-red-400 text-xs mb-2">{errorMessage}</Text>}
          <Pressable
            onPress={handleSend}
            disabled={status === 'sending'}
            className={status === 'sending' ? 'bg-slate-700 rounded-xl py-2.5 items-center' : 'bg-indigo-500 rounded-xl py-2.5 items-center active:bg-indigo-400'}
          >
            <Text className="text-white text-sm font-semibold">{status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
