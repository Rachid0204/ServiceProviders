import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';

export const TermsPage: React.FC = () => {
  const { t, isAr } = useMarketplace();
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        to={ROUTE_PATHS.HOME}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t.backHomeBtn}</span>
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-emerald-700 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.termsPageTitle}</h1>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {isAr ? '1. دور منصة مول الخدمة' : '1. Rôle de la plateforme Moul L’Khedma'}
            </h2>
            <p>
              {isAr
                ? 'تربط منصة مول الخدمة الزبناء في المغرب بالحرفيين ومقدمي الخدمات المستقلين (المعلمين). يتحمل كل طرف مسؤولية دقة المعلومات والالتزام بالمواعيد والأسعار المتفق عليها بالدرهم المغربي.'
                : 'Moul L’Khedma met en relation les particuliers et entreprises au Maroc avec des artisans et prestataires indépendants (Maâlems). Chaque utilisateur s’engage à fournir des informations exactes et à respecter les rendez-vous et devis convenus en Dirhams (MAD).'}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {isAr ? '2. التحقق من الهوية والتقييمات' : '2. Vérification d’identité et avis'}
            </h2>
            <p>
              {isAr
                ? 'تخضع شارة التحقق لمراجعة وثائق الهوية (CIN) والشهادات المهنية من طرف الإدارة. يُمنع نشر التقييمات الوهمية أو المحتوى المسيء.'
                : 'Le badge de vérification CIN est attribué exclusivement après contrôle administratif des pièces justificatives. Les faux avis, la fraude et l’usurpation d’identité entraînent la suspension du compte.'}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {isAr ? '3. الإلغاء والنزاعات' : '3. Annulations et règlement des litiges'}
            </h2>
            <p>
              {isAr
                ? 'يمكن للزبون أو المعلم إلغاء أو إعادة جدولة الطلب وفق السياسة المعلنة. في حالة وجود خلاف، يمكن فتح تذكرة مراجعة لدى فريق الدعم.'
                : 'Les demandes peuvent être annulées ou reprogrammées selon le statut de l’intervention. En cas de différend, les parties peuvent solliciter la médiation du support Moul L’Khedma.'}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
};

export const PrivacyPage: React.FC = () => {
  const { t, isAr } = useMarketplace();
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        to={ROUTE_PATHS.HOME}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t.backHomeBtn}</span>
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.privacyPageTitle}</h1>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {isAr ? '1. الامتثال للقانون المغربي 09-08 (CNDP)' : '1. Conformité à la Loi marocaine 09-08 (CNDP)'}
            </h2>
            <p>
              {isAr
                ? 'تلتزم منصة مول الخدمة بحماية المعطيات ذات الطابع الشخصي وفقاً لأحكام القانون رقم 09-08 الصادر بالمملكة المغربية والمتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي.'
                : 'Moul L’Khedma traite vos données personnelles dans le respect de la Loi n° 09-08 relative à la protection des personnes physiques à l’égard du traitement des données à caractère personnel au Maroc (CNDP).'}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {isAr ? '2. سرية وثائق البطاقة الوطنية (CIN)' : '2. Confidentialité des justificatifs CIN'}
            </h2>
            <p>
              {isAr
                ? 'تُحفظ صور البطاقة الوطنية وشهادات المعلمين في مساحة تخزين خاصة ومحمية، ولا يتم عرضها للعموم أبداً. تُستخدم حصرياً للتحقق من الهوية ومنح شارة الثقة.'
                : 'Les copies de CIN et diplômes des prestataires sont stockées dans un espace privé chiffré strictement réservé au contrôle administratif. Elles ne sont jamais rendues publiques ni vendues à des tiers.'}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {isAr ? '3. حقوق الولوج والتصحيح والحذف' : '3. Droits d’accès, de rectification et de suppression'}
            </h2>
            <p>
              {isAr
                ? 'يمكنك في أي وقت تعديل بياناتك الشخصية أو طلب حذف حسابك مباشرة من صفحة «ملفي الشخصي والأمان».'
                : 'Vous disposez à tout moment d’un droit d’accès, de rectification et de suppression de votre compte et de vos données personnelles depuis votre page « Mon Profil & Sécurité ».'}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
};
