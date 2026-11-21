import type { LanguageCode, MoroccanCity, ServiceCategory } from '../utils/marketplace';

export interface Translations {
  brandName: string;
  brandArabic: string;
  navProviders: string;
  navHowItWorks: string;
  navMyRequests: string;
  navOnboarding: string;
  navAdmin: string;
  ctaBecomeProvider: string;
  ctaProfile: string;
  langSwitchLabel: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  trustMetric1Value: string;
  trustMetric1Label: string;
  trustMetric2Value: string;
  trustMetric2Label: string;
  trustMetric3Value: string;
  trustMetric3Label: string;
  trustMetric4Value: string;
  trustMetric4Label: string;
  searchPlaceholder: string;
  quartierFilterPlaceholder: string;
  maxPriceLabel: string;
  filterAllCities: string;
  filterAllCategories: string;
  filterVerifiedOnly: string;
  filterAvailableNow: string;
  nearMeToggle: string;
  nearMeActiveBadge: string;
  nearMeLocating: string;
  viewModeSplit: string;
  viewModeGrid: string;
  viewModeMap: string;
  distanceAwayUnit: string;
  availableNowText: string;
  busyScheduledText: string;
  resultsShowing: string;
  resetFilters: string;
  emptyResultsTitle: string;
  emptyResultsDesc: string;
  verifiedCinLabel: string;
  hourlyRateLabel: string;
  calloutFeeLabel: string;
  freeCallout: string;
  experienceYears: string;
  jobsCompleted: string;
  reviewsLabel: string;
  responseTime: string;
  minutesUnit: string;
  bookProviderBtn: string;
  viewDetailsBtn: string;
  whatsappContactBtn: string;
  detailModalCredentialsTitle: string;
  detailModalCinLabel: string;
  detailModalDiplomaLabel: string;
  detailModalPortfolioTitle: string;
  detailModalReviewsTitle: string;
  detailModalLocationTitle: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  roleClientLabel: string;
  roleClientDesc: string;
  roleProviderLabel: string;
  roleProviderDesc: string;
  googleSignInBtn: string;
  signOutBtn: string;
  signedInAs: string;
  firestoreSyncBadge: string;
  localPreviewNotice: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  phoneLabel: string;
  phoneHint: string;
  cityLabel: string;
  neighborhoodLabel: string;
  neighborhoodPlaceholder: string;
  languagePrefLabel: string;
  specialtyLabel: string;
  hourlyRateInputLabel: string;
  bioLabel: string;
  bioPlaceholder: string;
  verifiedStatusLabel: string;
  verifiedPendingText: string;
  verifiedActiveText: string;
  saveProfileBtn: string;
  savingProfileBtn: string;
  profileSavedSuccess: string;
  bookingModalTitle: string;
  bookingModalSubtitle: string;
  serviceTypeLabel: string;
  preferredDateLabel: string;
  preferredTimeSlotLabel: string;
  addressPinLabel: string;
  addressPinPlaceholder: string;
  useGpsPinBtn: string;
  requestDescriptionLabel: string;
  requestDescriptionPlaceholder: string;
  problemPhotoLabel: string;
  problemPhotoHint: string;
  attachSamplePhotoBtn: string;
  removePhotoBtn: string;
  paymentMethodLabel: string;
  paymentCashLabel: string;
  paymentCashDesc: string;
  paymentCmiLabel: string;
  paymentCmiDesc: string;
  estimatedTotalLabel: string;
  submitRequestBtn: string;
  submittingRequestBtn: string;
  requestSubmittedTitle: string;
  requestSubmittedDesc: string;
  myRequestsSectionTitle: string;
  myRequestsSectionSubtitle: string;
  clientDashboardTab: string;
  providerDashboardTab: string;
  providerAvailabilityLabel: string;
  providerAcceptBtn: string;
  providerDeclineBtn: string;
  providerStartJobBtn: string;
  providerCompleteJobBtn: string;
  noRequestsYet: string;
  statusPending: string;
  statusAccepted: string;
  statusInProgress: string;
  statusCompleted: string;
  statusReviewed: string;
  statusCancelled: string;
  cancelRequestBtn: string;
  openChatBtn: string;
  chatDrawerTitle: string;
  chatDrawerSubtitle: string;
  chatInputPlaceholder: string;
  chatSendBtn: string;
  chatAttachPhotoBtn: string;
  chatEmptyState: string;
  leaveReviewBtn: string;
  reviewModalTitle: string;
  reviewRatingLabel: string;
  reviewCommentLabel: string;
  reviewCommentPlaceholder: string;
  submitReviewBtn: string;
  reviewSubmittedBadge: string;
  howItWorksTitle: string;
  howItWorksStep1Title: string;
  howItWorksStep1Desc: string;
  howItWorksStep2Title: string;
  howItWorksStep2Desc: string;
  howItWorksStep3Title: string;
  howItWorksStep3Desc: string;
  footerTagline: string;
  footerRights: string;
  closeBtn: string;
  cities: Record<MoroccanCity, string>;
  categories: Record<ServiceCategory, string>;
}

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  fr: {
    brandName: "Moul L'Khedma",
    brandArabic: 'مول الخدمة',
    navProviders: 'Maâlems Vérifiés',
    navHowItWorks: 'Garanties',
    navMyRequests: 'Mes Demandes',
    navOnboarding: 'Espace Profil',
    navAdmin: 'Administration',
    ctaBecomeProvider: 'Inscription Client / Maâlem',
    ctaProfile: 'Mon Profil',
    langSwitchLabel: 'العربية',
    heroKicker: 'Réseau National d’Artisans & Prestataires Vérifiés au Maroc',
    heroTitle: 'Trouvez un Maâlem de confiance dans votre quartier, au tarif clair en Dirhams.',
    heroSubtitle:
      'Plomberie, Électricité, Peinture, Soutien Scolaire, Ménage et Climatisation. Identité CIN contrôlée, géolocalisation par quartier et tarifs affichés en MAD à Casablanca, Rabat et Tanger.',
    heroPrimaryCta: 'Explorer les Maâlems',
    heroSecondaryCta: 'Créer mon compte Client / Maâlem',
    trustMetric1Value: '100% CIN',
    trustMetric1Label: 'Identité et diplômes OFPPT/ISTA vérifiés',
    trustMetric2Value: '8 Maâlems',
    trustMetric2Label: 'Actifs à Casablanca, Rabat et Tanger',
    trustMetric3Value: 'Tarif MAD',
    trustMetric3Label: 'Déplacement et main-d’œuvre affichés en DH',
    trustMetric4Value: '< 25 min',
    trustMetric4Label: 'Délai moyen de confirmation par quartier',
    searchPlaceholder: 'Métier, compétence ou nom du Maâlem...',
    quartierFilterPlaceholder: 'Quartier (ex: Maârif, Agdal, Malabata)...',
    maxPriceLabel: 'Tarif max/h',
    filterAllCities: 'Toutes les villes',
    filterAllCategories: 'Tous les métiers',
    filterVerifiedOnly: 'CIN Vérifiée',
    filterAvailableNow: 'Disponible maintenant',
    nearMeToggle: 'Près de moi (قريب مني)',
    nearMeActiveBadge: 'Trié par distance GPS',
    nearMeLocating: 'Localisation...',
    viewModeSplit: 'Liste + Carte',
    viewModeGrid: 'Grille uniquement',
    viewModeMap: 'Carte plein écran',
    distanceAwayUnit: 'km',
    availableNowText: 'Disponible maintenant',
    busyScheduledText: 'Sur rendez-vous',
    resultsShowing: 'prestataires vérifiés trouvés',
    resetFilters: 'Réinitialiser les filtres',
    emptyResultsTitle: 'Aucun Maâlem ne correspond à ces critères',
    emptyResultsDesc:
      'Essayez d’augmenter le budget horaire maximum ou réinitialisez les filtres pour voir tous nos artisans vérifiés.',
    verifiedCinLabel: 'CIN Vérifiée',
    hourlyRateLabel: 'Tarif horaire',
    calloutFeeLabel: 'Visite fixe',
    freeCallout: 'Gratuite',
    experienceYears: 'ans d’exp.',
    jobsCompleted: 'missions',
    reviewsLabel: 'avis clients',
    responseTime: 'Réponse ~',
    minutesUnit: 'min',
    bookProviderBtn: 'Réserver',
    viewDetailsBtn: 'Fiche & Avis',
    whatsappContactBtn: 'Contacter sur WhatsApp',
    detailModalCredentialsTitle: 'Identité & Qualifications Vérifiées',
    detailModalCinLabel: 'Carte Nationale d’Identité (CIN)',
    detailModalDiplomaLabel: 'Diplôme / Certification Professionnelle',
    detailModalPortfolioTitle: 'Galerie de Réalisations & Chantiers',
    detailModalReviewsTitle: 'Avis Clients Vérifiés',
    detailModalLocationTitle: 'Secteur d’intervention & Géolocalisation',
    onboardingTitle: 'Inscription & Profil Moul L’Khedma',
    onboardingSubtitle:
      'Choisissez votre rôle (Client ou Maâlem / Prestataire). Votre profil est synchronisé avec Firestore (users/{uid} et providers/{uid}) sur le projet serviceproviders-530c4.',
    roleClientLabel: 'Client (Particulier / Entreprise)',
    roleClientDesc: 'Je cherche un artisan ou prestataire qualifié dans mon quartier.',
    roleProviderLabel: 'Maâlem / Prestataire de Service',
    roleProviderDesc: 'Je publie mon profil dans providers/{uid} et reçois des demandes.',
    googleSignInBtn: 'Connexion sécurisée avec Google (Firebase Auth)',
    signOutBtn: 'Se déconnecter',
    signedInAs: 'Connecté via Firebase :',
    firestoreSyncBadge: 'Synchronisé avec Firestore users/{uid}',
    localPreviewNotice:
      'Vous pouvez configurer et valider votre profil immédiatement, ou vous connecter avec Google pour synchroniser en temps réel sur Firestore.',
    fullNameLabel: 'Nom complet',
    fullNamePlaceholder: 'Ex: Youssef El Amrani',
    phoneLabel: 'Téléphone marocain (+212)',
    phoneHint: 'Format requis : +2126XXXXXXXX ou 06XXXXXXXX',
    cityLabel: 'Ville',
    neighborhoodLabel: 'Quartier / Secteur',
    neighborhoodPlaceholder: 'Ex: Maârif, Agdal, Malabata...',
    languagePrefLabel: 'Langue préférée de l’interface',
    specialtyLabel: 'Catégorie métier (providers/{uid})',
    hourlyRateInputLabel: 'Tarif horaire (hourlyRateMAD en DH)',
    bioLabel: 'Présentation & références métier',
    bioPlaceholder: 'Décrivez votre expérience, diplômes ISTA ou spécialités techniques...',
    verifiedStatusLabel: 'Statut du badge de confiance',
    verifiedPendingText: 'En attente de vérification CIN (attribué après contrôle du dossier)',
    verifiedActiveText: 'Badge Vérifié Actif',
    saveProfileBtn: 'Enregistrer mon profil',
    savingProfileBtn: 'Enregistrement...',
    profileSavedSuccess: 'Profil enregistré et validé avec succès.',
    bookingModalTitle: 'Réserver une intervention',
    bookingModalSubtitle:
      'Sélectionnez le type de prestation, le créneau horaire, votre adresse exacte et le mode de règlement souhaité.',
    serviceTypeLabel: 'Type d’intervention souhaité',
    preferredDateLabel: 'Date d’intervention souhaitée',
    preferredTimeSlotLabel: 'Créneau horaire préféré',
    addressPinLabel: 'Adresse complète & Point de repère (Pin)',
    addressPinPlaceholder: 'Ex: Rue Normandie, Résidence Al Yassamine Imm B Appt 8 (près Pharmacie)',
    useGpsPinBtn: 'Insérer coord. GPS',
    requestDescriptionLabel: 'Description détaillée du problème',
    requestDescriptionPlaceholder:
      'Ex: Fuite sous évier de cuisine et remplacement du groupe de sécurité du chauffe-eau...',
    problemPhotoLabel: 'Photo du problème (optionnel)',
    problemPhotoHint: 'Ajoutez une photo pour aider le Maâlem à préparer les pièces et outils.',
    attachSamplePhotoBtn: 'Joindre photo chantier témoin',
    removePhotoBtn: 'Retirer la photo',
    paymentMethodLabel: 'Mode de paiement',
    paymentCashLabel: 'Paiement à la fin des travaux (الدفع عند الخدمة)',
    paymentCashDesc: 'Règlement direct en espèces ou virement après réception et validation des travaux.',
    paymentCmiLabel: 'Carte Bancaire / Séquestre CMI en ligne',
    paymentCmiDesc: 'Montant bloqué sur compte séquestre CMI et libéré uniquement après votre confirmation.',
    estimatedTotalLabel: 'Estimation déplacement + 1h de main-d’œuvre',
    submitRequestBtn: 'Confirmer la réservation',
    submittingRequestBtn: 'Enregistrement...',
    requestSubmittedTitle: 'Réservation enregistrée avec succès',
    requestSubmittedDesc:
      'Votre demande est active dans « Mes Demandes ». Vous pouvez discuter en direct avec le Maâlem ou le contacter sur WhatsApp.',
    myRequestsSectionTitle: 'Suivi des Réservations & Espace Maâlem',
    myRequestsSectionSubtitle:
      'Suivez le cycle complet de vos interventions (En attente → Confirmée → En cours → Terminée → Évaluée), discutez en temps réel et gérez vos demandes.',
    clientDashboardTab: 'Mes Demandes (Client)',
    providerDashboardTab: 'Espace Maâlem (Prestataire)',
    providerAvailabilityLabel: 'Statut de disponibilité immédiate (isAvailableNow)',
    providerAcceptBtn: 'Accepter la demande',
    providerDeclineBtn: 'Refuser',
    providerStartJobBtn: 'Démarrer l’intervention',
    providerCompleteJobBtn: 'Marquer comme terminée',
    noRequestsYet:
      'Aucune réservation en cours. Sélectionnez un Maâlem ci-dessus pour réserver.',
    statusPending: 'En attente (pending)',
    statusAccepted: 'Acceptée (accepted)',
    statusInProgress: 'En cours (in_progress)',
    statusCompleted: 'Terminée (completed)',
    statusReviewed: 'Évaluée (reviewed)',
    statusCancelled: 'Annulée (cancelled)',
    cancelRequestBtn: 'Annuler',
    openChatBtn: 'Messagerie en direct',
    chatDrawerTitle: 'Messagerie Temps Réel — Moul L’Khedma',
    chatDrawerSubtitle: 'Synchronisée avec Firestore chats/{bookingId}/messages',
    chatInputPlaceholder: 'Écrivez un message au Maâlem / Client (adresse, heure d’arrivée, photo)...',
    chatSendBtn: 'Envoyer',
    chatAttachPhotoBtn: 'Joindre photo',
    chatEmptyState: 'Aucun message pour le moment. Envoyez un message pour coordonner l’arrivée.',
    leaveReviewBtn: 'Noter le Maâlem (1–5 ★)',
    reviewModalTitle: 'Évaluer l’intervention du Maâlem',
    reviewRatingLabel: 'Note globale sur 5 étoiles',
    reviewCommentLabel: 'Votre commentaire sur la ponctualité et la qualité du travail',
    reviewCommentPlaceholder:
      'Ex: Travail très propre, Maâlem ponctuel et tarif respecté à la lettre...',
    submitReviewBtn: 'Publier l’avis & mettre à jour la note',
    reviewSubmittedBadge: 'Avis client publié',
    howItWorksTitle: 'Pourquoi les foyers et entreprises marocaines choisissent Moul L’Khedma',
    howItWorksStep1Title: '01. Vérification CIN & Références Métier',
    howItWorksStep1Desc:
      'Chaque Maâlem présente sa Carte Nationale d’Identité, ses diplômes (ISTA/OFPPT) ou références de chantiers vérifiées avant d’obtenir le badge de confiance.',
    howItWorksStep2Title: '02. Tarification Claire en Dirhams (DH)',
    howItWorksStep2Desc:
      'Les frais de visite fixe (fixedVisitFeeMAD) et le tarif horaire (hourlyRateMAD) sont affichés avant toute demande.',
    howItWorksStep3Title: '03. Géolocalisation & Proximité par Quartier',
    howItWorksStep3Desc:
      'Activez « Près de moi » pour visualiser sur la carte interactive OpenStreetMap la distance exacte en km jusqu’au Maâlem le plus proche.',
    footerTagline:
      'Plateforme marocaine de mise en relation avec des artisans et prestataires de services vérifiés.',
    footerRights: '© 2026 Moul L’Khedma (مول الخدمة). Tous droits réservés — Maroc.',
    closeBtn: 'Fermer',
    cities: {
      Casablanca: 'Casablanca',
      Rabat: 'Rabat',
      Tangier: 'Tanger',
      Marrakech: 'Marrakech',
      Fes: 'Fès',
      Agadir: 'Agadir',
    },
    categories: {
      Plomberie: 'Plomberie',
      Électricité: 'Électricité',
      Peinture: 'Peinture',
      'Soutien Scolaire': 'Soutien Scolaire',
      Ménage: 'Ménage',
      Climatisation: 'Climatisation',
    },
  },
  ar: {
    brandName: 'مول الخدمة',
    brandArabic: "Moul L'Khedma",
    navProviders: 'المعلمين المعتمدين',
    navHowItWorks: 'ضمانات الثقة',
    navMyRequests: 'طلباتي',
    navOnboarding: 'حسابي المهني / الزبون',
    navAdmin: 'لوحة الإدارة',
    ctaBecomeProvider: 'تسجيل زبون / معلم',
    ctaProfile: 'ملفي الشخصي',
    langSwitchLabel: 'Français',
    heroKicker: 'الشبكة المغربية للحرفيين ومقدمي الخدمات الموثوقين',
    heroTitle: 'اعثر على معلم كفء وموثوق في حيك السكني بأثمنة واضحة بالدرهم.',
    heroSubtitle:
      'الترصيص الصحي، الكهرباء، الصباغة، الدعم المدرسي، التنظيف والتكييف. تحقق صارم من البطاقة الوطنية، تحديد الموقع الجغرافي حسب الحي، وأثمنة واضحة بالدرهم في الدار البيضاء، الرباط وطنجة.',
    heroPrimaryCta: 'تصفح لائحة المعلمين',
    heroSecondaryCta: 'إنشاء حساب زبون أو معلم',
    trustMetric1Value: '100% بطاقة وطنية',
    trustMetric1Label: 'تحقق من الهوية ودبلومات التكوين المهني',
    trustMetric2Value: '8 معلمين',
    trustMetric2Label: 'متاحون في الدار البيضاء، الرباط وطنجة',
    trustMetric3Value: 'أثمنة بالدرهم',
    trustMetric3Label: 'تحديد واجب الزيارة والتعريفة بالساعة مسبقاً',
    trustMetric4Value: '< 25 دقيقة',
    trustMetric4Label: 'معدل سرعة التجاوب حسب الحي',
    searchPlaceholder: 'ابحث عن حرفة، مهارة أو اسم المعلم...',
    quartierFilterPlaceholder: 'الحي (مثال: المعاريف، أكدال، مالاباطا)...',
    maxPriceLabel: 'الحد الأقصى/ساعة',
    filterAllCities: 'جميع المدن',
    filterAllCategories: 'جميع التخصصات',
    filterVerifiedOnly: 'بطاقة وطنية موثقة (CIN)',
    filterAvailableNow: 'متاح الآن للتدخل',
    nearMeToggle: 'قريب مني (Near Me)',
    nearMeActiveBadge: 'مرتب حسب المسافة الجغرافية',
    nearMeLocating: 'جاري تحديد الموقع...',
    viewModeSplit: 'قائمة + خريطة',
    viewModeGrid: 'شبكة البطاقات',
    viewModeMap: 'الخريطة الكاملة',
    distanceAwayUnit: 'كلم',
    availableNowText: 'متاح الآن',
    busyScheduledText: 'حسب موعد مسبق',
    resultsShowing: 'معلم ومقدم خدمة متاح',
    resetFilters: 'إعادة ضبط البحث',
    emptyResultsTitle: 'لا يوجد معلم يطابق معايير البحث الحالية',
    emptyResultsDesc: 'جرب رفع الحد الأقصى للتعريفة بالساعة أو إعادة ضبط الفلاتر لعرض جميع الحرفيين.',
    verifiedCinLabel: 'بطاقة CIN موثقة',
    hourlyRateLabel: 'التعريفة بالساعة',
    calloutFeeLabel: 'واجب الزيارة',
    freeCallout: 'مجاني',
    experienceYears: 'سنة خبرة',
    jobsCompleted: 'خدمة منجزة',
    reviewsLabel: 'تقييم',
    responseTime: 'استجابة ~',
    minutesUnit: 'دقيقة',
    bookProviderBtn: 'طلب تدخل',
    viewDetailsBtn: 'الملف والتقييمات',
    whatsappContactBtn: 'تواصل عبر واتساب',
    detailModalCredentialsTitle: 'الهوية والشواهد المهنية الموثقة',
    detailModalCinLabel: 'رقم البطاقة الوطنية للتعريف (CIN)',
    detailModalDiplomaLabel: 'الدبلوم / الشهادة المهنية المصدقة',
    detailModalPortfolioTitle: 'معرض الأعمال والأوراش المنجزة',
    detailModalReviewsTitle: 'تقييمات وآراء الزبناء الموثقة',
    detailModalLocationTitle: 'منطقة التدخل والموقع الجغرافي',
    onboardingTitle: 'التسجيل وإعداد الحساب — مول الخدمة',
    onboardingSubtitle:
      'اختر نوع حسابك (زبون أو معلم / مقدم خدمة). يتم حفظ بياناتك في Firestore ضمن المسار users/{uid} و providers/{uid}.',
    roleClientLabel: 'زبون (فرد أو مقاولة)',
    roleClientDesc: 'أبحث عن معلم أو مقدم خدمة محترف وموثوق في مدينتي.',
    roleProviderLabel: 'معلم / مقدم خدمة (Prestataire)',
    roleProviderDesc: 'أرغب في نشر ملفي المهني في providers/{uid} واستقبال الطلبات.',
    googleSignInBtn: 'تسجيل الدخول الآمن عبر Google (Firebase Auth)',
    signOutBtn: 'تسجيل الخروج',
    signedInAs: 'متصل عبر Firebase :',
    firestoreSyncBadge: 'متزامن مع Firestore users/{uid}',
    localPreviewNotice:
      'يمكنك تعبئة وحفظ ملفك الشخصي الآن، أو تسجيل الدخول عبر Google لمزامنته مباشرة مع Firestore.',
    fullNameLabel: 'الاسم الكامل',
    fullNamePlaceholder: 'مثال: يوسف العمراني',
    phoneLabel: 'رقم الهاتف المغربي (+212)',
    phoneHint: 'الصيغة المطلوبة: +2126XXXXXXXX أو 06XXXXXXXX',
    cityLabel: 'المدينة',
    neighborhoodLabel: 'الحي السكني / المنطقة',
    neighborhoodPlaceholder: 'مثال: المعاريف، أكدال، مالاباطا...',
    languagePrefLabel: 'لغة التصفح المفضلة',
    specialtyLabel: 'التخصص المهني الرئيسي (providers/{uid})',
    hourlyRateInputLabel: 'التعريفة بالساعة (بالدرهم المغربي د.م.)',
    bioLabel: 'نبذة مهنية والشواهد أو الخبرات',
    bioPlaceholder: 'اذكر سنوات الخبرة، دبلوم مكتب التكوين المهني OFPPT/ISTA والتخصصات الدقيقة...',
    verifiedStatusLabel: 'حالة شارة الثقة والتوثيق',
    verifiedPendingText: 'في انتظار التحقق من البطاقة الوطنية (تمنح بعد مراجعة الملف)',
    verifiedActiveText: 'شارة التوثيق مفعلة',
    saveProfileBtn: 'حفظ البيانات الشخصية',
    savingProfileBtn: 'جاري الحفظ...',
    profileSavedSuccess: 'تم حفظ وتأكيد ملفك الشخصي بنجاح.',
    bookingModalTitle: 'حجز موعد تدخل معلم',
    bookingModalSubtitle:
      'حدد نوع الخدمة، الفترة الزمنية المفضلة، العنوان الدقيق، وطريقة الدفع المناسبة لك.',
    serviceTypeLabel: 'نوع الخدمة الدقيقة المطلوبة',
    preferredDateLabel: 'التاريخ المفضل للتدخل',
    preferredTimeSlotLabel: 'الفترة الزمنية المفضلة',
    addressPinLabel: 'العنوان الكامل ونقطة الالتقاء (Address / Pin)',
    addressPinPlaceholder: 'مثال: زنقة نورماندي، إقامة الياسمين عمارة B شقة 8 (قرب الصيدلية)',
    useGpsPinBtn: 'إدراج إحداثيات GPS',
    requestDescriptionLabel: 'وصف تفصيلي للعطب أو الخدمة المطلوبة',
    requestDescriptionPlaceholder:
      'مثال: إصلاح تسرب مياه تحت حوض المطبخ وفحص سخان الماء الكهربائي...',
    problemPhotoLabel: 'صورة للعطب أو الموقع (اختياري)',
    problemPhotoHint: 'أرفق صورة لمساعدة المعلم على إحضار القطع والأدوات المناسبة.',
    attachSamplePhotoBtn: 'إرفاق صورة نموذجية للعطب',
    removePhotoBtn: 'إزالة الصورة',
    paymentMethodLabel: 'طريقة الدفع',
    paymentCashLabel: 'الدفع عند الخدمة (Cash on Completion)',
    paymentCashDesc: 'الأداء نقداً أو عبر تحويل بنكي مباشرة بعد إتمام الخدمة والتحقق من جودتها.',
    paymentCmiLabel: 'بطاقة بنكية / ضمان CMI الإلكتروني (Escrow)',
    paymentCmiDesc: 'يتم تأمين المبلغ عبر بوابة CMI ولا يصرف للمعلم إلا بعد تأكيدك لإنجاز العمل.',
    estimatedTotalLabel: 'تقدير أولي (واجب الزيارة + ساعة عمل)',
    submitRequestBtn: 'تأكيد وإرسال الحجز',
    submittingRequestBtn: 'جاري الحفظ...',
    requestSubmittedTitle: 'تم تسجيل طلب الحجز بنجاح',
    requestSubmittedDesc:
      'طلبك مفعل الآن في قسم « طلباتي ». يمكنك التواصل الفوري عبر الدردشة المباشرة أو عبر واتساب.',
    myRequestsSectionTitle: 'تتبع الطلبات ولوحة تحكم المعلم',
    myRequestsSectionSubtitle:
      'تابع مراحل التدخل (في الانتظار ← مقبول ← قيد الإنجاز ← مكتمل ← تم التقييم)، وتواصل مباشرة مع المعلم أو الزبون.',
    clientDashboardTab: 'طلباتي (فضاء الزبون)',
    providerDashboardTab: 'لوحة المعلم (إدارة الطلبات)',
    providerAvailabilityLabel: 'حالة التوفر الفوري لاستقبال الطلبات (isAvailableNow)',
    providerAcceptBtn: 'قبول الطلب',
    providerDeclineBtn: 'رفض',
    providerStartJobBtn: 'بدء إنجاز العمل',
    providerCompleteJobBtn: 'تحديد كمكتمل',
    noRequestsYet:
      'لا توجد طلبات مسجلة حالياً. اختر معلماً من اللائحة أعلاه لإرسال طلبك الأول.',
    statusPending: 'في انتظار التأكيد (pending)',
    statusAccepted: 'مقبول من المعلم (accepted)',
    statusInProgress: 'قيد الإنجاز (in_progress)',
    statusCompleted: 'مكتمل (completed)',
    statusReviewed: 'تم التقييم (reviewed)',
    statusCancelled: 'ملغى (cancelled)',
    cancelRequestBtn: 'إلغاء الطلب',
    openChatBtn: 'المحادثة المباشرة',
    chatDrawerTitle: 'المحادثة الفورية — مول الخدمة',
    chatDrawerSubtitle: 'متزامنة في الوقت الفعلي مع Firestore chats/{bookingId}/messages',
    chatInputPlaceholder: 'اكتب رسالة للمعلم / الزبون (تفاصيل العنوان، موعد الوصول، صورة)...',
    chatSendBtn: 'إرسال',
    chatAttachPhotoBtn: 'إرفاق صورة',
    chatEmptyState: 'لا توجد رسائل بعد. أرسل رسالة لتنسيق تفاصيل التدخل.',
    leaveReviewBtn: 'تقييم المعلم (1–5 ★)',
    reviewModalTitle: 'تقييم جودة خدمة المعلم',
    reviewRatingLabel: 'التقييم العام من 5 نجوم',
    reviewCommentLabel: 'تعليقك حول الالتزام بالموعد وجودة الإنجاز',
    reviewCommentPlaceholder: 'مثال: عمل متقن ونظيف، المعلم احترم الموعد والتسعيرة المتفق عليها...',
    submitReviewBtn: 'نشر التقييم وتحديث المعدل',
    reviewSubmittedBadge: 'تم نشر التقييم',
    howItWorksTitle: 'لماذا تختار الأسر والمقاولات المغربية منصة مول الخدمة',
    howItWorksStep1Title: '01. التحقق من البطاقة الوطنية والكفاءة الحرفية',
    howItWorksStep1Desc:
      'يخضع كل معلم لعملية التحقق من الهوية الوطنية وشواهد التكوين المهني (OFPPT/ISTA) أو المراجع المهنية قبل الحصول على شارة الثقة.',
    howItWorksStep2Title: '02. تسعير شفاف بالدرهم المغربي (د.م.)',
    howItWorksStep2Desc:
      'يتم عرض واجب الزيارة الثابت والتعريفة بالساعة بالدرهم بوضوح قبل إرسال الطلب لتفادي أي مفاجآت.',
    howItWorksStep3Title: '03. تحديد الموقع الجغرافي والمسافة بالكيلومتر',
    howItWorksStep3Desc:
      'فعل خاصية « قريب مني » لمعاينة المعلمين المتاحين على الخريطة التفاعلية وحساب المسافة التقريبية بالكيلومتر.',
    footerTagline: 'المنصة المغربية الموثوقة لربط الزبناء بأمهر الحرفيين ومقدمي الخدمات المحلية.',
    footerRights: '© 2026 مول الخدمة (Moul L’Khedma). جميع الحقوق محفوظة — المملكة المغربية.',
    closeBtn: 'إغلاق',
    cities: {
      Casablanca: 'الدار البيضاء',
      Rabat: 'الرباط',
      Tangier: 'طنجة',
      Marrakech: 'مراكش',
      Fes: 'فاس',
      Agadir: 'أكادير',
    },
    categories: {
      Plomberie: 'الترصيص الصحي (Plomberie)',
      Électricité: 'الكهرباء (Électricité)',
      Peinture: 'الصباغة والديكور (Peinture)',
      'Soutien Scolaire': 'الدعم المدرسي (Soutien Scolaire)',
      Ménage: 'التنظيف الشامل (Ménage)',
      Climatisation: 'التكييف والتبريد (Climatisation)',
    },
  },
};
