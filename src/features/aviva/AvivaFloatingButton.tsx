import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import BrainDumpSheet from './BrainDumpSheet';

export default function AvivaFloatingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Positioned well above the tab bar and made smaller than
          before — it was overlapping bottom-of-screen content
          (primary buttons, list items) on several screens. */}
      <Pressable onPress={() => setOpen(true)}
        className="absolute bottom-24 right-4 bg-indigo-600 rounded-full w-12 h-12 items-center justify-center shadow-lg active:bg-indigo-500 z-50 btn3d btn3d-p">
        <Text className="text-lg">✨</Text>
      </Pressable>
      <BrainDumpSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
