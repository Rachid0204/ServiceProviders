import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB (matches storage.rules)

export interface PhotoUploadResult {
  url: string;
  uploadedToStorage: boolean;
}

/**
 * Validates an image file against storage.rules constraints (image/* and <= 5 MB).
 */
export function validateImageFile(
  file: { type: string; size: number },
  lang: 'fr' | 'ar'
): { valid: boolean; error?: string } {
  if (!file.type || !file.type.startsWith('image/')) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'يرجى اختيار ملف صورة صالح (JPG أو PNG أو WebP).'
          : 'Veuillez sélectionner un fichier image valide (JPG, PNG ou WebP).',
    };
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      valid: false,
      error:
        lang === 'ar'
          ? 'حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميغابايت).'
          : 'La taille de l’image dépasse la limite maximale autorisée (5 Mo).',
    };
  }
  return { valid: true };
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-64);
  return cleaned || `photo_${Date.now()}.jpg`;
}

/**
 * Uploads a booking or chat image to Firebase Storage when authenticated,
 * returning an HTTPS download URL (< 2048 chars, compliant with firestore.rules).
 * Falls back to a lightweight local object URL when previewing without Firebase Auth.
 */
export async function uploadMarketplacePhoto(params: {
  file: File;
  scope: 'bookings' | 'chats' | 'providers' | 'jobPosts';
  entityId: string;
  userId: string | null;
  lang: 'fr' | 'ar';
}): Promise<PhotoUploadResult> {
  const check = validateImageFile(params.file, params.lang);
  if (!check.valid) {
    throw new Error(check.error);
  }

  if (!params.userId) {
    return {
      url: URL.createObjectURL(params.file),
      uploadedToStorage: false,
    };
  }

  const safeName = `${Date.now()}_${sanitizeFileName(params.file.name)}`;
  const storagePath =
    params.scope === 'providers'
      ? `providers/${params.userId}/portfolio/${safeName}`
      : `${params.scope}/${params.entityId}/${params.userId}/${safeName}`;

  const fileRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(fileRef, params.file, {
    contentType: params.file.type,
  });
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    url: downloadUrl,
    uploadedToStorage: true,
  };
}

/**
 * Safely revokes an ephemeral preview blob URL created when uploading without Firebase Auth.
 */
export function revokePreviewObjectUrl(url: string | undefined): void {
  if (url && url.startsWith('blob:') && typeof URL !== 'undefined') {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore already-revoked URLs
    }
  }
}
