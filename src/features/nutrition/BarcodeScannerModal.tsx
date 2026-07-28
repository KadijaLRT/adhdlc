import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { lookupBarcodeProduct } from '@/core/nutrition/openFoodFactsApi';
import type { FoodItem } from '@/content/foodDatabase';
import { useSafeTopInset, useSafeBottomInset } from '@/shared/hooks/useSafeTopInset';

/**
 * Scans a product barcode and looks it up via Open Food Facts. Common
 * grocery barcode formats only (EAN-13/8, UPC-A/E) — QR codes and
 * other non-product formats aren't relevant here and are ignored.
 */
export default function BarcodeScannerModal({
  onFound, onClose,
}: {
  onFound: (item: FoodItem) => void; onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const topInset = useSafeTopInset();
  const bottomInset = useSafeBottomInset();
  const [scanning, setScanning] = useState(true);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleScanned = async (result: BarcodeScanningResult) => {
    if (!scanning) return;
    setScanning(false);
    setLooking(true);
    setNotFound(false);
    const item = await lookupBarcodeProduct(result.data);
    setLooking(false);
    if (item) {
      onFound(item);
    } else {
      setNotFound(true);
      // Give a moment to read the "not found" message, then let them try again.
      setTimeout(() => { setScanning(true); }, 1800);
    }
  };

  if (!permission) {
    return (
      <View className="absolute inset-0 bg-black items-center justify-center">
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="absolute inset-0 bg-black/90 items-center justify-center px-8">
        <Text className="text-white text-base text-center mb-4">
          Camera access is needed to scan a barcode. Nothing is recorded or stored — it only reads the barcode itself.
        </Text>
        <Pressable onPress={requestPermission} className="bg-indigo-600 rounded-full py-3 px-6 mb-3 active:bg-indigo-500">
          <Text className="text-white font-semibold">Allow camera access</Text>
        </Pressable>
        <Pressable onPress={onClose} className="py-2">
          <Text className="text-slate-400 text-sm">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="absolute inset-0 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanning ? handleScanned : undefined}
      />
      <View className="absolute inset-0 items-center justify-center pointer-events-none">
        <View className="w-64 h-40 border-2 border-white/70 rounded-2xl" />
      </View>
      <View className="absolute top-0 left-0 right-0 px-4 pb-3 bg-black/50" style={{ paddingTop: topInset }}>
        <Text className="text-white text-center text-sm">Point the camera at a product barcode</Text>
      </View>
      {(looking || notFound) && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pt-4 bg-black/70 items-center" style={{ paddingBottom: bottomInset }}>
          {looking ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#fff" size="small" />
              <Text className="text-white text-sm">Looking it up…</Text>
            </View>
          ) : (
            <Text className="text-amber-400 text-sm">Couldn't find that product — try again or add it manually.</Text>
          )}
        </View>
      )}
      <Pressable onPress={onClose} className="absolute bottom-0 left-0 right-0 px-4 pt-3 items-center" style={{ paddingBottom: bottomInset }}>
        <Text className="text-slate-300 text-sm">Cancel</Text>
      </Pressable>
    </View>
  );
}
