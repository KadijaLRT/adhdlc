import * as ImagePicker from 'expo-image-picker';

// Comfortably under api/groq.js's MAX_IMAGE_DATA_URL_LENGTH (7,000,000
// chars ≈ 5MB of raw image data, before base64's ~33% size overhead).
// quality: 0.6 keeps a photographed page of text easily legible while
// controlling file size — legibility for OCR-style reading needs far
// less fidelity than a photo meant to be visually admired.
const IMAGE_QUALITY = 0.6;

export interface PickedSyllabusImage {
  dataUrl: string;
  width: number;
  height: number;
}

async function toResult(asset: ImagePicker.ImagePickerAsset): Promise<PickedSyllabusImage | null> {
  if (!asset.base64) return null;
  return {
    dataUrl: `data:image/jpeg;base64,${asset.base64}`,
    width: asset.width,
    height: asset.height,
  };
}

/** Pick an existing screenshot/photo from the library. */
export async function pickSyllabusImageFromLibrary(): Promise<PickedSyllabusImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('PERMISSION_DENIED');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: IMAGE_QUALITY,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return toResult(result.assets[0]);
}

/** Take a new photo of a syllabus directly (native only — no camera in a browser tab). */
export async function captureSyllabusPhoto(): Promise<PickedSyllabusImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('PERMISSION_DENIED');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: IMAGE_QUALITY,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return toResult(result.assets[0]);
}
