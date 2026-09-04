import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const router = useRouter();
  const handleContinue = () => {
    // Bug fix: impactAsync returns a Promise and was called with
    // neither await nor a .catch() — on a device without a vibration
    // motor, or certain platform edge cases, this can reject, becoming
    // an unhandled promise rejection (a red-screen warning in dev,
    // silent console noise in production). The haptic is a nice-to-have
    // that should never be able to affect navigation either way, so
    // this just swallows a failure rather than leaving it unhandled.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router?.push?.('/onboarding/calibration');
  };
  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/*
        Bug fix: this was the only onboarding screen with no
        ScrollView — every other screen in the flow scrolls, so a
        Continue button can never be pushed off-screen no matter the
        device height or system text-size setting. This one used a
        fixed flex-1/justify-center layout instead, meaning on a short
        device, or with "Large Text"/accessibility font scaling on (the
        very first thing someone might hit if they've enabled it before
        ever opening the app), the button could end up below the fold
        with literally no way to scroll to it — stuck on the very first
        screen of onboarding with zero way forward.
      */}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="w-full max-w-md self-center px-6 pt-safe pb-safe">
          <Text accessibilityRole="header" className="text-slate-100 text-3xl font-semibold mb-3">
            Hi, I'm your coach 👋
          </Text>
          <Text className="text-slate-400 text-lg leading-7 mb-2">
            About 2 minutes to set up. No wrong answers. You can change anything later.
          </Text>
          <Text className="text-slate-500 text-sm mb-10">
            The more you share, the more personalized everything gets. But you can skip anything.
          </Text>
          <Pressable onPress={handleContinue} accessibilityRole="button" accessibilityLabel="Continue"
            className="bg-indigo-600 rounded-full py-4 active:bg-indigo-500">
            <Text className="text-white text-lg text-center font-semibold">Let's begin</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
