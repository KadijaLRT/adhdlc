import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Heading, Subheading } from '@/shared/components/Heading';
import { useProStore } from './proStore';
import { APP_STORE_URL, FREE_AI_PER_DAY, PRIVACY_POLICY_URL, PRO_BENEFITS, TERMS_OF_USE_URL } from './proConfig';
import { describeProProblem, remainingFreeToday } from './proLogic';
import type { ProOffer } from './purchases/types';

const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

const OFFER_TEXT: Record<ProOffer['kind'], { title: string; period: string; badge?: string }> = {
  yearly: { title: 'Yearly', period: '/ year', badge: 'Best value' },
  monthly: { title: 'Monthly', period: '/ month' },
  lifetime: { title: 'Lifetime', period: 'one time' },
};

function openUrl(url: string) {
  if (url) Linking.openURL(url).catch((error) => console.error('ProScreen: openURL failed', error));
}

export default function ProScreen() {
  const isPro = useProStore((s) => s.isPro);
  const proToken = useProStore((s) => s.proToken);
  const freeUsage = useProStore((s) => s.freeUsage);
  const purchasesAvailable = useProStore((s) => s.purchasesAvailable);
  const offers = useProStore((s) => s.offers);
  const offersLoading = useProStore((s) => s.offersLoading);
  const loadOffers = useProStore((s) => s.loadOffers);
  const buy = useProStore((s) => s.buy);
  const restore = useProStore((s) => s.restore);

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!isPro) loadOffers();
  }, [isPro, loadOffers]);

  const remaining = remainingFreeToday({ proToken, isPro, lastVerifiedAt: null, freeUsage }, new Date(), FREE_AI_PER_DAY);

  const report = (result: { ok: true } | { ok: false; reason: string }, successText: string) => {
    if (result.ok) {
      setMessage({ tone: 'success', text: successText });
      return;
    }
    const text = describeProProblem(result.reason);
    setMessage(text ? { tone: 'error', text } : null); // cancelling shows nothing
  };

  const handleBuy = async (offer: ProOffer) => {
    setBusy(offer.id);
    setMessage(null);
    report(await buy(offer), 'Pro is on. Thank you for supporting the app! 💛');
    setBusy(null);
  };

  const handleRestore = async () => {
    setBusy('restore');
    setMessage(null);
    report(await restore(), 'Your Pro purchase is restored. 💛');
    setBusy(null);
  };

  const hasSubscriptionOffer = offers.some((o) => o.kind !== 'lifetime');

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">{isPro ? 'You have Aviva Pro ✨' : 'Aviva Pro'}</Heading>
        <Text className="text-slate-500 text-sm mb-6">
          {isPro
            ? 'Unlimited AI help is on.'
            : `Everything in the app is free. Pro removes the daily AI limit. You have ${remaining} of ${FREE_AI_PER_DAY} free AI requests left today.`}
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 mb-6 surf3d">
          {PRO_BENEFITS.map((b, i) => (
            <View key={b.title} className={`flex-row gap-3 py-2.5 ${i > 0 ? 'border-t border-stone-100 dark:border-slate-800' : ''}`}>
              <Text className="text-base">{b.emoji}</Text>
              <View className="flex-1">
                <Text className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{b.title}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">{b.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {message && (
          <View className={`rounded-xl p-3 mb-4 border ${message.tone === 'error' ? 'bg-amber-50 border-amber-400 dark:bg-amber-500/10' : 'bg-emerald-50 border-emerald-400 dark:bg-emerald-500/10'}`}>
            <Text className={`text-sm ${message.tone === 'error' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{message.text}</Text>
          </View>
        )}

        {!purchasesAvailable && !isPro && (
          <View className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-6 surf3d">
            <Text className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-1">📱 Get Pro in the iPhone app</Text>
            <Text className="text-slate-500 text-xs mb-3">
              Pro is sold through the App Store. Download the iPhone app, then tap You {'>'} Get Aviva Pro.
            </Text>
            {!!APP_STORE_URL && (
              <Pressable onPress={() => openUrl(APP_STORE_URL)} className="bg-indigo-600 rounded-full py-3 active:bg-indigo-500 btn3d btn3d-p">
                <Text className="text-white text-center font-semibold">Open the App Store</Text>
              </Pressable>
            )}
          </View>
        )}

        {purchasesAvailable && !isPro && (
          <>
            <Subheading className="mb-3">Choose a plan</Subheading>
            {offersLoading && <ActivityIndicator className="my-4" />}
            {!offersLoading && offers.length === 0 && (
              <Text className="text-slate-500 text-sm mb-4">Plans couldn't load from the App Store. Check your connection and reopen this screen.</Text>
            )}
            <View className="gap-2 mb-3">
              {offers.map((offer) => {
                const text = OFFER_TEXT[offer.kind];
                return (
                  <Pressable
                    key={offer.id}
                    onPress={() => handleBuy(offer)}
                    disabled={!!busy}
                    accessibilityRole="button"
                    accessibilityLabel={`${text.title}, ${offer.priceLabel} ${text.period}`}
                    className={`rounded-xl p-4 flex-row items-center justify-between ${offer.kind === 'yearly' ? 'bg-indigo-600 btn3d btn3d-p' : 'bg-white dark:bg-slate-900 surf3d surf3d-tap'}`}
                  >
                    <View>
                      <Text className={`font-semibold text-sm ${offer.kind === 'yearly' ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                        {text.title}{text.badge ? `  ·  ${text.badge}` : ''}
                      </Text>
                      <Text className={`text-xs mt-0.5 ${offer.kind === 'yearly' ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {offer.priceLabel} {text.period}
                      </Text>
                    </View>
                    {busy === offer.id
                      ? <ActivityIndicator color={offer.kind === 'yearly' ? '#fff' : undefined} />
                      : <Text className={offer.kind === 'yearly' ? 'text-white' : 'text-slate-600'}>→</Text>}
                  </Pressable>
                );
              })}
            </View>

            {hasSubscriptionOffer && (
              <Text className="text-slate-500 text-[11px] mb-3">
                Payment is charged to your Apple ID. Subscriptions renew automatically unless cancelled at least 24 hours
                before the end of the current period, and your account is charged for renewal within 24 hours before the
                period ends. Manage or cancel any time in Settings {'>'} Apple ID {'>'} Subscriptions. Lifetime is a one-time
                purchase that never renews.
              </Text>
            )}
          </>
        )}

        {purchasesAvailable && (
          <Pressable onPress={handleRestore} disabled={!!busy} className="py-3">
            {busy === 'restore'
              ? <ActivityIndicator />
              : <Text className="text-indigo-600 dark:text-indigo-400 text-center text-sm font-medium">Restore Purchases</Text>}
          </Pressable>
        )}

        {isPro && purchasesAvailable && (
          <Pressable onPress={() => openUrl(MANAGE_SUBSCRIPTIONS_URL)} className="py-3">
            <Text className="text-slate-500 text-center text-sm">Manage subscription</Text>
          </Pressable>
        )}

        <View className="flex-row justify-center gap-6 mt-2 mb-8">
          <Pressable onPress={() => openUrl(TERMS_OF_USE_URL)}>
            <Text className="text-slate-500 text-xs underline">Terms of Use</Text>
          </Pressable>
          {!!PRIVACY_POLICY_URL && (
            <Pressable onPress={() => openUrl(PRIVACY_POLICY_URL)}>
              <Text className="text-slate-500 text-xs underline">Privacy Policy</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
