import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useAppStore, selectColorway, selectButtonLook } from '@/store/index';
import { Heading } from '@/shared/components/Heading';
import { BUTTON_LOOKS, COLORWAYS, type ButtonLook, type ColorwayId } from '@/theme/colorways';

// RN-web turns dataSet into data-* attributes, which the settings previews use
// to show a specific look next to the others.
const lookScope = (look: ButtonLook) => ({ dataSet: { look } }) as object;

function SamplePreview() {
  return (
    <View>
      <View className="flex-row flex-wrap gap-3 mb-4">
        <Pressable accessibilityRole="button" className="bg-indigo-600 rounded-xl px-5 py-3 btn3d btn3d-p">
          <Text className="text-white text-sm font-semibold">Start focus</Text>
        </Pressable>
        <Pressable accessibilityRole="button" className="bg-emerald-500 rounded-xl px-5 py-3 btn3d btn3d-s">
          <Text className="text-white text-sm font-semibold">Add task</Text>
        </Pressable>
        <Pressable accessibilityRole="button" className="bg-amber-500 rounded-xl px-5 py-3 btn3d btn3d-a">
          <Text className="text-white text-sm font-semibold">Celebrate</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-1.5 px-4">
          <Text className="text-indigo-700 dark:text-indigo-300 text-xs">Selected</Text>
        </View>
        <View className="flex-1 h-3 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
          <View className="h-3 w-3/5 rounded-full bg-indigo-500" />
        </View>
        <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">See all</Text>
      </View>
    </View>
  );
}

export default function AppearanceScreen() {
  const colorway = useAppStore(selectColorway);
  const buttonLook = useAppStore(selectButtonLook);
  const setColorway = useAppStore((s) => s.setColorway);
  const setButtonLook = useAppStore((s) => s.setButtonLook);
  const isWeb = Platform.OS === 'web';

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
      <View className="w-full max-w-md self-center">
        <Heading className="mb-1 mt-2">Colors and buttons</Heading>
        <Text className="text-slate-500 text-sm mb-6">Pick the colors and the button feel that are easiest on you. Changes apply instantly and are saved on this device.</Text>

        <View className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-4 mb-6">
          <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">Preview</Text>
          <SamplePreview />
          {!isWeb && (
            <Text className="text-slate-500 text-xs mt-3">The raised and glossy button looks show in the web app. On phones your colors apply and buttons stay flat for now.</Text>
          )}
        </View>

        <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-3">Colors</Text>
        <View className="gap-2 mb-6" accessibilityRole="radiogroup">
          {COLORWAYS.map((c) => {
            const selected = colorway === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => { void setColorway(c.id as ColorwayId); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={c.label}
                className={selected
                  ? 'bg-indigo-600/10 border-2 border-indigo-400 rounded-2xl p-4 flex-row items-center justify-between'
                  : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4 flex-row items-center justify-between'}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-slate-800 dark:text-slate-200 text-sm font-medium">{c.label}</Text>
                  <View className="flex-row gap-2 mt-2">
                    {(['p', 's', 'a'] as const).map((role) => (
                      <View key={role} style={{ backgroundColor: c.roles[role].face, borderColor: c.roles[role].edge }} className="w-7 h-7 rounded-full border-2" />
                    ))}
                  </View>
                </View>
                <Text className={selected ? 'text-indigo-600 dark:text-indigo-300 text-lg' : 'text-transparent text-lg'}>✓</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-slate-900 dark:text-slate-100 text-base font-semibold mb-1">Button feel</Text>
        {!isWeb && <Text className="text-slate-500 text-xs mb-3">Your choice is saved and will show in the web app.</Text>}
        <View className="gap-2 mb-6" accessibilityRole="radiogroup">
          {BUTTON_LOOKS.map((look) => {
            const selected = buttonLook === look.id;
            return (
              <Pressable
                key={look.id}
                onPress={() => { void setButtonLook(look.id); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${look.label}. ${look.hint}`}
                className={selected
                  ? 'bg-indigo-600/10 border-2 border-indigo-400 rounded-2xl p-4'
                  : 'bg-white dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4'}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-800 dark:text-slate-200 text-sm font-medium">{look.label}</Text>
                    <Text className="text-slate-500 text-xs">{look.hint}</Text>
                  </View>
                  <Text className={selected ? 'text-indigo-600 dark:text-indigo-300 text-lg' : 'text-transparent text-lg'}>✓</Text>
                </View>
                <View {...lookScope(look.id)} pointerEvents="none" className="flex-row gap-3 pb-1">
                  <View className="bg-indigo-600 rounded-xl px-4 py-2 btn3d btn3d-p"><Text className="text-white text-xs font-semibold">Primary</Text></View>
                  <View className="bg-emerald-500 rounded-xl px-4 py-2 btn3d btn3d-s"><Text className="text-white text-xs font-semibold">Secondary</Text></View>
                  <View className="bg-amber-500 rounded-xl px-4 py-2 btn3d btn3d-a"><Text className="text-white text-xs font-semibold">Accent</Text></View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-slate-500 text-xs mb-8">Light or dark mode is in Accessibility.</Text>
      </View>
    </ScrollView>
  );
}
