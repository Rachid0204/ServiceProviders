import type { LucideIcon } from 'lucide-react';
import {
  Droplets,
  Zap,
  Paintbrush,
  GraduationCap,
  Sparkles,
  Wind,
  Hammer,
  KeyRound,
  PlugZap,
  Trees,
  Truck,
  BrickWall,
} from 'lucide-react';
import type { LanguageCode, ServiceCategory } from './marketplace';

export interface TradeMeta {
  icon: LucideIcon;
  shortFr: string;
  shortAr: string;
}

export const TRADE_META: Record<ServiceCategory, TradeMeta> = {
  Plomberie: {
    icon: Droplets,
    shortFr: 'Plomberie',
    shortAr: 'الترصيص',
  },
  Électricité: {
    icon: Zap,
    shortFr: 'Électricité',
    shortAr: 'الكهرباء',
  },
  Peinture: {
    icon: Paintbrush,
    shortFr: 'Peinture',
    shortAr: 'الصباغة',
  },
  'Soutien Scolaire': {
    icon: GraduationCap,
    shortFr: 'Soutien scolaire',
    shortAr: 'الدعم المدرسي',
  },
  Ménage: {
    icon: Sparkles,
    shortFr: 'Ménage',
    shortAr: 'التنظيف',
  },
  Climatisation: {
    icon: Wind,
    shortFr: 'Climatisation',
    shortAr: 'التكييف',
  },
  Menuiserie: {
    icon: Hammer,
    shortFr: 'Menuiserie',
    shortAr: 'النجارة',
  },
  Serrurerie: {
    icon: KeyRound,
    shortFr: 'Serrurerie',
    shortAr: 'الأقفال والحدادة',
  },
  Électroménager: {
    icon: PlugZap,
    shortFr: 'Électroménager',
    shortAr: 'الأجهزة المنزلية',
  },
  Jardinage: {
    icon: Trees,
    shortFr: 'Jardinage',
    shortAr: 'البستنة',
  },
  Déménagement: {
    icon: Truck,
    shortFr: 'Déménagement',
    shortAr: 'نقل الأثاث',
  },
  Maçonnerie: {
    icon: BrickWall,
    shortFr: 'Maçonnerie',
    shortAr: 'البناء والزليج',
  },
};

export function getTradeShortLabel(category: ServiceCategory, lang: LanguageCode): string {
  const meta = TRADE_META[category];
  return lang === 'ar' ? meta.shortAr : meta.shortFr;
}

export function formatMaalemCount(count: number, lang: LanguageCode): string {
  const safeCount = Math.max(0, Math.floor(count));
  if (lang === 'ar') {
    if (safeCount === 1) return 'معلم واحد';
    if (safeCount === 2) return 'معلمان';
    if (safeCount >= 3 && safeCount <= 10) return `${safeCount} معلمين`;
    return `${safeCount} معلم`;
  }
  return safeCount === 1 ? '1 Maâlem' : `${safeCount} Maâlems`;
}

export function formatProviderResultsLabel(
  count: number,
  lang: LanguageCode,
  verifiedOnly = false
): string {
  const safeCount = Math.max(0, Math.floor(count));
  if (lang === 'ar') {
    if (verifiedOnly) {
      if (safeCount === 1) return 'معلم موثق واحد';
      if (safeCount === 2) return 'معلمان موثقان';
      if (safeCount >= 3 && safeCount <= 10) return `${safeCount} معلمين موثقين`;
      return `${safeCount} معلم موثق`;
    }
    if (safeCount === 1) return 'مقدم خدمة متاح';
    if (safeCount === 2) return 'مقدما خدمة متاحان';
    if (safeCount >= 3 && safeCount <= 10) return `${safeCount} مقدمي خدمة متاحين`;
    return `${safeCount} مقدم خدمة متاح`;
  }
  if (verifiedOnly) {
    return safeCount === 1 ? '1 prestataire vérifié' : `${safeCount} prestataires vérifiés`;
  }
  return safeCount === 1 ? '1 prestataire disponible' : `${safeCount} prestataires disponibles`;
}
