import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import {
  SERVICE_CATEGORIES,
  SERVICE_PRICING_MODELS,
  formatMadCurrency,
  type LanguageCode,
  type ServiceCategory,
  type ServicePricingModel,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import { useProviderServices } from '../../hooks/useProviderServices';

interface ProviderServicesManagerProps {
  providerId: string;
  defaultCategory: ServiceCategory;
  hasProviderProfile: boolean;
  lang: LanguageCode;
  t: Translations;
  onGoToCardSetup?: () => void;
}

export function getPricingModelLabel(model: ServicePricingModel, isAr: boolean): string {
  switch (model) {
    case 'fixed':
      return isAr ? 'سعر محدد (ثابت)' : 'Forfait fixe';
    case 'hourly':
      return isAr ? 'بالساعة' : 'Tarif horaire';
    case 'starting_from':
      return isAr ? 'ابتداءً من' : 'À partir de';
    case 'quote_required':
      return isAr ? 'حسب عرض الثمن' : 'Sur devis';
    case 'callout_plus_work':
      return isAr ? 'التنقل + اليد العاملة' : 'Déplacement + main-d’œuvre';
  }
}

export const ProviderServicesManager: React.FC<ProviderServicesManagerProps> = ({
  providerId,
  defaultCategory,
  hasProviderProfile,
  lang,
  t,
  onGoToCardSetup,
}) => {
  const isAr = lang === 'ar';
  const { services, loading, error, clearError, createService, toggleServiceActive, deleteService } =
    useProviderServices(providerId, lang);

  const [category, setCategory] = useState<ServiceCategory>(defaultCategory);
  const [titleFr, setTitleFr] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [pricingModel, setPricingModel] = useState<ServicePricingModel>('fixed');
  const [priceMad, setPriceMad] = useState<number>(200);
  const [calloutFeeMad, setCalloutFeeMad] = useState<number>(70);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(90);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    clearError();
    setIsSaving(true);
    try {
      const ok = await createService({
        category,
        titleFr,
        titleAr,
        descriptionFr,
        pricingModel,
        priceMad: pricingModel === 'quote_required' ? 0 : priceMad,
        calloutFeeMad,
        estimatedDurationMinutes,
      });
      if (ok) {
        setTitleFr('');
        setTitleAr('');
        setDescriptionFr('');
        setSuccessMsg(
          isAr
            ? 'تم نشر الخدمة بنجاح في ملفك المهني!'
            : 'Service publié avec succès sur votre fiche Maâlem !'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hasProviderProfile && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <span>
            {isAr
              ? 'يرجى حفظ بطاقتك المهنية أولاً قبل نشر خدماتك التفصيلية.'
              : 'Enregistrez d’abord votre Fiche Maâlem avant de publier des services détaillés.'}
          </span>
          {onGoToCardSetup && (
            <button
              type="button"
              onClick={onGoToCardSetup}
              className="px-3.5 py-2 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 shrink-0 cursor-pointer"
            >
              {isAr ? 'إعداد بطاقتي' : 'Compléter ma Fiche'}
            </button>
          )}
        </div>
      )}

      {/* Add New Service Form */}
      <form
        onSubmit={handleCreate}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-bold text-slate-900">
            {isAr ? 'إضافة خدمة جديدة إلى قائمتك' : 'Publier une prestation sur votre catalogue'}
          </h2>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {isAr ? 'الفئة المهنية' : 'Catégorie'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.categories[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {isAr ? 'نموذج التسعير' : 'Modèle de tarification'}
            </label>
            <select
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value as ServicePricingModel)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
            >
              {SERVICE_PRICING_MODELS.map((m) => (
                <option key={m} value={m}>
                  {getPricingModelLabel(m, isAr)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {isAr ? 'عنوان الخدمة (فرنسية / عام)' : 'Intitulé du service'}
            </label>
            <input
              type="text"
              required
              minLength={4}
              maxLength={100}
              value={titleFr}
              onChange={(e) => setTitleFr(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تركيب أو إصلاح سخان الماء'
                  : 'Ex: Installation & détartrage chauffe-eau électrique'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {isAr ? 'العنوان بالعربية (اختياري)' : 'Intitulé en arabe (optionnel)'}
            </label>
            <input
              type="text"
              dir="rtl"
              maxLength={100}
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: تركيب وإصلاح سخان الماء"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 md:col-span-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'السعر (د.م.)' : 'Tarif (MAD)'}
              </label>
              <input
                type="number"
                min={pricingModel === 'quote_required' ? 0 : 30}
                max={100000}
                disabled={pricingModel === 'quote_required'}
                value={pricingModel === 'quote_required' ? 0 : priceMad}
                onChange={(e) => setPriceMad(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'واجب التنقل (د.م.)' : 'Déplacement (MAD)'}
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                value={calloutFeeMad}
                onChange={(e) => setCalloutFeeMad(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'المدة التقديرية (دقيقة)' : 'Durée estimée (min)'}
              </label>
              <input
                type="number"
                min={15}
                max={1440}
                step={15}
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {isAr ? 'وصف تفصيلي لما تشمله الخدمة' : 'Description détaillée de la prestation'}
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={500}
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              placeholder={
                isAr
                  ? 'اشرح مراحل العمل، الضمان، وما إذا كانت قطع الغيار مشمولة أم لا...'
                  : 'Précisez les étapes incluses, le matériel utilisé et les éventuelles garanties...'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving || !hasProviderProfile}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {isSaving
              ? isAr
                ? 'جاري النشر...'
                : 'Publication...'
              : isAr
              ? 'نشر الخدمة'
              : 'Publier ce service'}
          </span>
        </button>
      </form>

      {/* Published Services List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {isAr ? 'الخدمات المنشورة' : 'Vos services publiés'} ({services.length})
          </h3>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">{isAr ? 'جاري التحميل...' : 'Chargement...'}</p>
        ) : services.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
            <Wrench className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-600">
              {isAr
                ? 'لم تنشر أي خدمة مفصلة بعد. أضف خدماتك أعلاه لجذب المزيد من الزبناء!'
                : 'Aucun service détaillé publié pour le moment. Ajoutez vos prestations ci-dessus pour apparaître sur votre profil public.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className={`p-4 rounded-xl border space-y-2.5 ${
                  srv.isActive
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                      {t.categories[srv.category]}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {isAr ? srv.titleAr : srv.titleFr}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void toggleServiceActive(srv);
                      }}
                      title={srv.isActive ? 'Pause' : 'Activer'}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      {srv.isActive ? <Eye className="w-4 h-4 text-emerald-700" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteService(srv.id);
                      }}
                      title={isAr ? 'حذف' : 'Supprimer'}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isAr ? srv.descriptionAr : srv.descriptionFr}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <Tag className="w-3.5 h-3.5" />
                    {srv.pricingModel === 'quote_required'
                      ? getPricingModelLabel('quote_required', isAr)
                      : `${getPricingModelLabel(srv.pricingModel, isAr)} · ${formatMadCurrency(srv.priceMad, lang)}`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    ~{srv.estimatedDurationMinutes} {t.minutesUnit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
