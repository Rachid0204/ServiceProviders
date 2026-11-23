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
  routeLoadingLabel: string;
  notFoundBadge: string;
  notFoundTitle: string;
  notFoundDesc: string;
  backHomeBtn: string;
  browseServicesBtn: string;
  unauthorizedBadge: string;
  unauthorizedTitle: string;
  unauthorizedDesc: string;
  goToDashboardBtn: string;
  servicesCatalogTitle: string;
  servicesCatalogSubtitle: string;
  allServicesTab: string;
  providerNotFoundTitle: string;
  providerNotFoundDesc: string;
  backToServicesBtn: string;
  loginPageTitle: string;
  loginPageSubtitle: string;
  registerPageTitle: string;
  registerPageSubtitle: string;
  sortByLabel: string;
  sortRecommended: string;
  sortRatingDesc: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortExperienceDesc: string;
  sortDistanceAsc: string;
  favoritesOnlyLabel: string;
  saveFavoriteLabel: string;
  removeFavoriteLabel: string;
  paginationPrev: string;
  paginationNext: string;
  paginationPageOf: string;
  categoriesExplorerTitle: string;
  categoriesExplorerSubtitle: string;
  termsPageTitle: string;
  privacyPageTitle: string;
  termsConsentLabel: string;
  termsConsentRequiredError: string;
  providerServicesTab: string;
  providerCalendarTab: string;
  providerVerificationTab: string;
  timelineTitle: string;
  quoteCompareTitle: string;
  laborCostLabel: string;
  materialsCostLabel: string;
  quoteValidUntilLabel: string;
  quoteExpiredBadge: string;
  rejectQuoteBtn: string;
  availabilityTitle: string;
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
    onboardingTitle: 'Mon Compte & Profil Moul L’Khedma',
    onboardingSubtitle:
      'Complétez vos informations personnelles et choisissez votre espace (Client, Maâlem ou les deux) pour réserver ou recevoir des missions.',
    roleClientLabel: 'Client (Particulier / Entreprise)',
    roleClientDesc: 'Je cherche un artisan ou prestataire qualifié dans mon quartier.',
    roleProviderLabel: 'Maâlem / Prestataire de Service',
    roleProviderDesc: 'Je publie mon profil professionnel et je reçois des demandes dans ma ville.',
    googleSignInBtn: 'Continuer avec Google',
    signOutBtn: 'Se déconnecter',
    signedInAs: 'Connecté en tant que :',
    firestoreSyncBadge: 'Compte synchronisé et sécurisé',
    localPreviewNotice:
      'Connectez-vous avec Google ou votre adresse e-mail pour gérer votre profil, vos réservations et votre espace Maâlem.',
    fullNameLabel: 'Nom complet',
    fullNamePlaceholder: 'Ex: Youssef El Amrani',
    phoneLabel: 'Téléphone marocain (+212)',
    phoneHint: 'Format requis : +2126XXXXXXXX ou 06XXXXXXXX',
    cityLabel: 'Ville',
    neighborhoodLabel: 'Quartier / Secteur',
    neighborhoodPlaceholder: 'Ex: Maârif, Agdal, Malabata...',
    languagePrefLabel: 'Langue préférée de l’interface',
    specialtyLabel: 'Métier / Spécialité principale',
    hourlyRateInputLabel: 'Tarif horaire (en DH)',
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
    addressPinLabel: 'Adresse complète & Point de repère',
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
      'Votre demande est active dans « Mes Réservations ». Vous pouvez discuter en direct avec le Maâlem ou le contacter sur WhatsApp.',
    myRequestsSectionTitle: 'Mes Réservations',
    myRequestsSectionSubtitle:
      'Suivez l’avancement de vos interventions, échangez en direct avec votre Maâlem et gérez vos paiements en toute sérénité.',
    clientDashboardTab: 'Mes Réservations',
    providerDashboardTab: 'Espace Maâlem',
    providerAvailabilityLabel: 'Disponibilité immédiate',
    providerAcceptBtn: 'Accepter la demande',
    providerDeclineBtn: 'Refuser',
    providerStartJobBtn: 'Démarrer l’intervention',
    providerCompleteJobBtn: 'Marquer comme terminée',
    noRequestsYet:
      'Aucune réservation pour le moment. Explorez les Maâlems vérifiés pour planifier votre première intervention.',
    statusPending: 'En attente',
    statusAccepted: 'Confirmée',
    statusInProgress: 'En cours',
    statusCompleted: 'Terminée',
    statusReviewed: 'Évaluée',
    statusCancelled: 'Annulée',
    cancelRequestBtn: 'Annuler',
    openChatBtn: 'Messagerie',
    chatDrawerTitle: 'Messagerie — Moul L’Khedma',
    chatDrawerSubtitle: 'Échange sécurisé en temps réel avec votre interlocuteur',
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
      'Les frais de visite fixe et le tarif horaire sont affichés clairement en Dirhams avant toute demande, sans frais cachés.',
    howItWorksStep3Title: '03. Géolocalisation & Proximité par Quartier',
    howItWorksStep3Desc:
      'Activez « Près de moi » pour visualiser sur la carte interactive la distance exacte en km jusqu’au Maâlem le plus proche.',
    footerTagline:
      'Plateforme marocaine de mise en relation avec des artisans et prestataires de services vérifiés.',
    footerRights: '© 2026 Moul L’Khedma (مول الخدمة). Tous droits réservés — Maroc.',
    closeBtn: 'Fermer',
    routeLoadingLabel: 'Chargement de la page...',
    notFoundBadge: 'Erreur 404',
    notFoundTitle: 'Page introuvable',
    notFoundDesc:
      'La page que vous recherchez n’existe pas ou a été déplacée. Revenez à l’accueil ou explorez nos métiers vérifiés.',
    backHomeBtn: 'Retour à l’accueil',
    browseServicesBtn: 'Explorer les services',
    unauthorizedBadge: 'Accès restreint (403)',
    unauthorizedTitle: 'Accès non autorisé',
    unauthorizedDesc:
      'Votre compte actuel ne dispose pas des autorisations nécessaires pour consulter cet espace.',
    goToDashboardBtn: 'Aller vers mon espace',
    servicesCatalogTitle: 'Annuaire des Services & Maâlems au Maroc',
    servicesCatalogSubtitle:
      'Filtrez par métier, ville, quartier ou disponibilité immédiate pour trouver le bon prestataire vérifié.',
    allServicesTab: 'Tous les services',
    providerNotFoundTitle: 'Fiche prestataire introuvable',
    providerNotFoundDesc:
      'Ce profil Maâlem n’existe pas ou n’est plus disponible dans l’annuaire public.',
    backToServicesBtn: 'Retour à l’annuaire',
    loginPageTitle: 'Connexion à Moul L’Khedma',
    loginPageSubtitle:
      'Accédez à votre espace Client, Maâlem ou Administration en toute sécurité.',
    registerPageTitle: 'Créer un compte Moul L’Khedma',
    registerPageSubtitle:
      'Rejoignez gratuitement la plateforme en tant que Client, Maâlem vérifié ou compte double.',
    sortByLabel: 'Trier par',
    sortRecommended: 'Recommandés',
    sortRatingDesc: 'Meilleure note',
    sortPriceAsc: 'Tarif croissant',
    sortPriceDesc: 'Tarif décroissant',
    sortExperienceDesc: 'Plus expérimentés',
    sortDistanceAsc: 'Plus proches',
    favoritesOnlyLabel: 'Mes favoris',
    saveFavoriteLabel: 'Ajouter aux favoris',
    removeFavoriteLabel: 'Retirer des favoris',
    paginationPrev: 'Précédent',
    paginationNext: 'Suivant',
    paginationPageOf: 'Page',
    categoriesExplorerTitle: '12 Métiers & Services Vérifiés au Maroc',
    categoriesExplorerSubtitle:
      'Choisissez une spécialité pour découvrir les Maâlems qualifiés dans votre ville.',
    termsPageTitle: 'Conditions Générales d’Utilisation (CGU)',
    privacyPageTitle: 'Politique de Confidentialité & Protection des Données (Loi 09-08)',
    termsConsentLabel:
      'J’accepte les Conditions Générales d’Utilisation et la Politique de Confidentialité (Loi 09-08 / CNDP).',
    termsConsentRequiredError:
      'Veuillez accepter les Conditions d’Utilisation et la Politique de Confidentialité avant de créer votre compte.',
    providerServicesTab: 'Mes Services',
    providerCalendarTab: 'Mon Agenda',
    providerVerificationTab: 'Vérification CIN',
    timelineTitle: 'Suivi & Historique de l’intervention',
    quoteCompareTitle: 'Comparateur de devis reçus',
    laborCostLabel: 'Main-d’œuvre (DH)',
    materialsCostLabel: 'Matériel & pièces (DH)',
    quoteValidUntilLabel: 'Valide jusqu’au',
    quoteExpiredBadge: 'Devis expiré',
    rejectQuoteBtn: 'Refuser',
    availabilityTitle: 'Horaires & Disponibilités hebdomadaires',
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
      Menuiserie: 'Menuiserie & Aluminium',
      Serrurerie: 'Serrurerie & Ferronnerie',
      Électroménager: 'Réparation Électroménager',
      Jardinage: 'Jardinage & Espaces Verts',
      Déménagement: 'Déménagement & Transport',
      Maçonnerie: 'Maçonnerie, Carrelage & Plâtre',
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
    onboardingTitle: 'حسابي وملفي الشخصي — مول الخدمة',
    onboardingSubtitle:
      'أكمل بياناتك الشخصية واختر نوع حسابك (زبون، معلم، أو كليهما) لحجز الخدمات أو استقبال الطلبات في مدينتك.',
    roleClientLabel: 'زبون (فرد أو مقاولة)',
    roleClientDesc: 'أبحث عن معلم أو مقدم خدمة محترف وموثوق في مدينتي.',
    roleProviderLabel: 'معلم / مقدم خدمة',
    roleProviderDesc: 'أنشر ملفي المهني وأستقبل طلبات التدخل في مدينتي وحيي السكني.',
    googleSignInBtn: 'المتابعة عبر Google',
    signOutBtn: 'تسجيل الخروج',
    signedInAs: 'متصل بحساب :',
    firestoreSyncBadge: 'حساب موثق ومتزامن بأمان',
    localPreviewNotice:
      'سجّل الدخول عبر Google أو بريدك الإلكتروني لإدارة ملفك الشخصي وحجوزاتك وفضاء المعلم.',
    fullNameLabel: 'الاسم الكامل',
    fullNamePlaceholder: 'مثال: يوسف العمراني',
    phoneLabel: 'رقم الهاتف المغربي (+212)',
    phoneHint: 'الصيغة المطلوبة: +2126XXXXXXXX أو 06XXXXXXXX',
    cityLabel: 'المدينة',
    neighborhoodLabel: 'الحي السكني / المنطقة',
    neighborhoodPlaceholder: 'مثال: المعاريف، أكدال، مالاباطا...',
    languagePrefLabel: 'لغة التصفح المفضلة',
    specialtyLabel: 'التخصص المهني الرئيسي',
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
    addressPinLabel: 'العنوان الكامل ونقطة الالتقاء',
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
    paymentCashLabel: 'الدفع عند الخدمة',
    paymentCashDesc: 'الأداء نقداً أو عبر تحويل بنكي مباشرة بعد إتمام الخدمة والتحقق من جودتها.',
    paymentCmiLabel: 'بطاقة بنكية / ضمان CMI الإلكتروني',
    paymentCmiDesc: 'يتم تأمين المبلغ عبر بوابة CMI ولا يصرف للمعلم إلا بعد تأكيدك لإنجاز العمل.',
    estimatedTotalLabel: 'تقدير أولي (واجب الزيارة + ساعة عمل)',
    submitRequestBtn: 'تأكيد وإرسال الحجز',
    submittingRequestBtn: 'جاري الحفظ...',
    requestSubmittedTitle: 'تم تسجيل طلب الحجز بنجاح',
    requestSubmittedDesc:
      'طلبك مفعل الآن في قسم « طلباتي ». يمكنك التواصل الفوري عبر الدردشة المباشرة أو عبر واتساب.',
    myRequestsSectionTitle: 'طلباتي وحجوزاتي',
    myRequestsSectionSubtitle:
      'تابع مراحل تدخل المعلم، تواصل معه مباشرة وأدر مدفوعاتك بكل أمان وشفافية.',
    clientDashboardTab: 'طلباتي',
    providerDashboardTab: 'فضاء المعلم',
    providerAvailabilityLabel: 'التوفر الفوري للتدخل',
    providerAcceptBtn: 'قبول الطلب',
    providerDeclineBtn: 'رفض',
    providerStartJobBtn: 'بدء إنجاز العمل',
    providerCompleteJobBtn: 'تحديد كمكتمل',
    noRequestsYet:
      'لا توجد طلبات مسجلة حالياً. تصفح لائحة المعلمين الموثوقين لحجز أول خدمة لك.',
    statusPending: 'في انتظار التأكيد',
    statusAccepted: 'مقبول',
    statusInProgress: 'قيد الإنجاز',
    statusCompleted: 'مكتمل',
    statusReviewed: 'تم التقييم',
    statusCancelled: 'ملغى',
    cancelRequestBtn: 'إلغاء الطلب',
    openChatBtn: 'المحادثة',
    chatDrawerTitle: 'المحادثة الفورية — مول الخدمة',
    chatDrawerSubtitle: 'تواصل فوري وآمن لتنسيق تفاصيل التدخل',
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
    routeLoadingLabel: 'جاري تحميل الصفحة...',
    notFoundBadge: 'خطأ 404',
    notFoundTitle: 'الصفحة غير موجودة',
    notFoundDesc:
      'الصفحة التي تبحث عنها غير متوفرة أو تم نقلها. يمكنك العودة إلى الصفحة الرئيسية أو تصفح الخدمات المتاحة.',
    backHomeBtn: 'العودة إلى الرئيسية',
    browseServicesBtn: 'تصفح الخدمات',
    unauthorizedBadge: 'وصول مقيد (403)',
    unauthorizedTitle: 'غير مصرح لك بالدخول',
    unauthorizedDesc:
      'حسابك الحالي لا يتوفر على الصلاحيات اللازمة للوصول إلى هذا الفضاء.',
    goToDashboardBtn: 'الانتقال إلى فضائي',
    servicesCatalogTitle: 'دليل الخدمات والمعلمين المعتمدين في المغرب',
    servicesCatalogSubtitle:
      'قم بالتصفية حسب المهنة، المدينة، الحي أو التوفر الفوري للعثور على المعلم المناسب.',
    allServicesTab: 'جميع الخدمات',
    providerNotFoundTitle: 'ملف المعلم غير موجود',
    providerNotFoundDesc:
      'هذا الملف المهني غير موجود حالياً أو لم يعد متاحاً في الدليل العام.',
    backToServicesBtn: 'العودة إلى دليل الخدمات',
    loginPageTitle: 'تسجيل الدخول إلى مول الخدمة',
    loginPageSubtitle: 'ادخل بأمان إلى فضاء الزبون، فضاء المعلم أو لوحة الإدارة.',
    registerPageTitle: 'إنشاء حساب جديد على مول الخدمة',
    registerPageSubtitle: 'انضم مجاناً كزبون، معلم محترف أو حساب مزدوج.',
    sortByLabel: 'الترتيب حسب',
    sortRecommended: 'الموصى بهم',
    sortRatingDesc: 'الأعلى تقييماً',
    sortPriceAsc: 'الأقل سعراً',
    sortPriceDesc: 'الأعلى سعراً',
    sortExperienceDesc: 'الأكثر خبرة',
    sortDistanceAsc: 'الأقرب مسافة',
    favoritesOnlyLabel: 'المفضلة',
    saveFavoriteLabel: 'حفظ في المفضلة',
    removeFavoriteLabel: 'إزالة من المفضلة',
    paginationPrev: 'السابق',
    paginationNext: 'التالي',
    paginationPageOf: 'صفحة',
    categoriesExplorerTitle: '12 تخصصاً ومهنة معتمدة في المغرب',
    categoriesExplorerSubtitle:
      'اختر التخصص المطلوب لاكتشاف المعلمين والحرفيين المؤهلين في مدينتك.',
    termsPageTitle: 'شروط الاستخدام العامة',
    privacyPageTitle: 'سياسة الخصوصية وحماية المعطيات الشخصية (القانون 09-08)',
    termsConsentLabel:
      'أوافق على شروط الاستخدام العامة وسياسة الخصوصية وحماية المعطيات الشخصية (القانون 09-08 / CNDP).',
    termsConsentRequiredError:
      'يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية قبل إنشاء الحساب.',
    providerServicesTab: 'خدماتي',
    providerCalendarTab: 'جدول المواعيد',
    providerVerificationTab: 'توثيق البطاقة الوطنية',
    timelineTitle: 'تتبع مراحل وتاريخ التدخل',
    quoteCompareTitle: 'مقارنة عروض الأثمنة المستلمة',
    laborCostLabel: 'اليد العاملة (د.م.)',
    materialsCostLabel: 'المواد وقطع الغيار (د.م.)',
    quoteValidUntilLabel: 'صالح إلى غاية',
    quoteExpiredBadge: 'عرض منتهي الصلاحية',
    rejectQuoteBtn: 'رفض العرض',
    availabilityTitle: 'أوقات العمل والأيام المتاحة أسبوعياً',
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
      Menuiserie: 'النجارة والألمنيوم (Menuiserie)',
      Serrurerie: 'فتح الأقفال والحدادة (Serrurerie)',
      Électroménager: 'إصلاح الأجهزة المنزلية (Électroménager)',
      Jardinage: 'البستنة وتنسيق الحدائق (Jardinage)',
      Déménagement: 'النقل والرحيل (Déménagement)',
      Maçonnerie: 'البناء والزليج والجبص (Maçonnerie)',
    },
  },
};
