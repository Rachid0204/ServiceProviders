import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  formatMadCurrency,
  type LanguageCode,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

interface ProviderMapProps {
  providers: VettedProvider[];
  lang: LanguageCode;
  t: Translations;
  userCoords: { lat: number; lng: number; label?: string } | null;
  selectedProviderId?: string | null;
  onSelectProvider: (provider: VettedProvider) => void;
  onBookProvider: (provider: VettedProvider) => void;
}

export const ProviderMap: React.FC<ProviderMapProps> = ({
  providers,
  lang,
  t,
  userCoords,
  selectedProviderId,
  onSelectProvider,
  onBookProvider,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [33.75, -7.1], // Central Morocco coastal axis (Casablanca - Rabat - Tangier)
      zoom: 7,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers and bounds when providers, language, or userCoords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const boundsPoints: L.LatLngExpression[] = [];

    // Render User / Client Geolocation Marker if active
    if (userCoords) {
      boundsPoints.push([userCoords.lat, userCoords.lng]);
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#0f172a;color:#ffffff;border:3px solid #10b981;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:11px;font-weight:700;">GPS</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon });
      userMarker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;padding:2px;">
          <strong>${lang === 'ar' ? 'موقعي الحالي' : 'Votre position'}</strong><br/>
          <span>${userCoords.label || `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`}</span>
        </div>`
      );
      userMarker.addTo(layerGroup);
    }

    // Render Provider Markers
    providers.forEach((provider) => {
      const { lat, lng } = provider.location;
      boundsPoints.push([lat, lng]);

      const isSelected = selectedProviderId === provider.id;
      const bgColor = isSelected
        ? '#0f172a'
        : provider.isAvailableNow
        ? '#047857'
        : '#b45309';

      const priceLabel = formatMadCurrency(provider.hourlyRateMAD, lang);
      const markerIcon = L.divIcon({
        className: 'custom-provider-marker',
        html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;background:${bgColor};color:#ffffff;font-weight:700;font-size:11px;white-space:nowrap;box-shadow:0 3px 10px rgba(15,23,42,0.28);border:2px solid #ffffff;">
          <span>${priceLabel}</span>
        </div>`,
        iconSize: [76, 28],
        iconAnchor: [38, 14],
      });

      const marker = L.marker([lat, lng], { icon: markerIcon });
      const displayName = lang === 'ar' ? provider.fullNameAr : provider.fullNameFr;
      const displayQuartier =
        lang === 'ar'
          ? provider.location.quartierAr || provider.location.quartier
          : provider.location.quartier;
      const distanceText =
        provider.distanceKm != null
          ? `<div style="color:#047857;font-weight:600;margin-top:2px;">${provider.distanceKm} ${t.distanceAwayUnit}</div>`
          : '';

      const popupContainer = document.createElement('div');
      popupContainer.style.minWidth = '190px';
      popupContainer.style.fontFamily = 'inherit';
      popupContainer.innerHTML = `
        <div style="font-size:13px;font-weight:700;color:#0f172a;">${displayName}</div>
        <div style="font-size:11px;color:#475569;margin-top:2px;">
          ${t.categories[provider.category]} · ${t.cities[provider.location.city]} (${displayQuartier})
        </div>
        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-top:4px;">
          ${priceLabel}/h · ★ ${provider.ratingAvg.toFixed(1)} (${provider.reviewCount})
        </div>
        ${distanceText}
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button type="button" data-action="details" style="flex:1;padding:5px 8px;font-size:11px;font-weight:600;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;">
            ${t.viewDetailsBtn}
          </button>
          <button type="button" data-action="book" style="flex:1;padding:5px 8px;font-size:11px;font-weight:600;background:#047857;color:#ffffff;border:none;border-radius:6px;cursor:pointer;">
            ${t.bookProviderBtn}
          </button>
        </div>
      `;

      const detailsBtn = popupContainer.querySelector('[data-action="details"]');
      const bookBtn = popupContainer.querySelector('[data-action="book"]');
      detailsBtn?.addEventListener('click', () => onSelectProvider(provider));
      bookBtn?.addEventListener('click', () => onBookProvider(provider));

      marker.bindPopup(popupContainer);
      marker.addTo(layerGroup);
    });

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 13);
    } else if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
    }
  }, [providers, lang, t, userCoords, selectedProviderId, onSelectProvider, onBookProvider]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col h-full min-h-[420px]">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
        <div className="font-semibold text-slate-800">
          {lang === 'ar'
            ? 'خريطة المعلمين التفاعلية (OpenStreetMap)'
            : 'Carte Interactive des Maâlems (OpenStreetMap)'}
        </div>
        <div className="text-slate-500 tabular-nums">
          {providers.length} {lang === 'ar' ? 'مواقع على الخريطة' : 'positions affichées'}
        </div>
      </div>
      <div
        ref={mapContainerRef}
        data-testid="provider-leaflet-map"
        className="w-full flex-1 min-h-[380px] z-10"
      />
    </div>
  );
};
