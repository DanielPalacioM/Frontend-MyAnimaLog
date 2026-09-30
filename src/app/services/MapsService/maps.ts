import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from 'src/environments/environment';

export interface VetPlace {
  id: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  distanceMeters: number | null;
  place: google.maps.places.Place;
}

export interface VetDetails {
  phone: string | null;
  rating: number | null;
  ratingCount: number;
  openNow: boolean | undefined;
  hoursToday: string | null;
  website: string | null;
}

// La búsqueda solo pide campos básicos (más baratos). Teléfono, horario y
// calificación se piden al tocar una veterinaria.
const SEARCH_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'businessStatus'];
const DETAIL_FIELDS = [
  'nationalPhoneNumber', 'rating', 'userRatingCount',
  'regularOpeningHours', 'utcOffsetMinutes', 'websiteURI'
];

@Injectable({ providedIn: 'root' })
export class MapsService {

  private configured = false;

  private configure(): void {
    if (this.configured) return;
    setOptions({
      key: environment.googleMaps.apiKey,
      v: 'weekly',
      language: 'es',
      region: 'CO',
    });
    this.configured = true;
  }

  get mapId(): string {
    return environment.googleMaps.mapId;
  }

  async loadMapLibraries() {
    this.configure();
    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
    ]);
    return { Map, AdvancedMarkerElement };
  }

  /** Veterinarias abiertas al público cerca de `center`, ordenadas por distancia a `origin`. */
  async searchVets(
    center: google.maps.LatLngLiteral,
    radiusMeters: number,
    origin: google.maps.LatLngLiteral | null
  ): Promise<VetPlace[]> {
    this.configure();
    const { Place } = await importLibrary('places');

    const { places } = await Place.searchNearby({
      fields: SEARCH_FIELDS,
      locationRestriction: { center, radius: radiusMeters },
      includedPrimaryTypes: ['veterinary_care'],
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
    });

    return places
      .filter(p => p.location && p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map(p => {
        const location = p.location!.toJSON();
        return {
          id: p.id,
          name: p.displayName || 'Veterinaria',
          address: p.formattedAddress || '',
          location,
          distanceMeters: origin ? this.distanceMeters(origin, location) : null,
          place: p,
        };
      })
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }

  async getVetDetails(vet: VetPlace): Promise<VetDetails> {
    const { place } = await vet.place.fetchFields({ fields: DETAIL_FIELDS });

    let openNow: boolean | undefined;
    try {
      openNow = await place.isOpen();
    } catch {
      openNow = undefined;
    }

    // weekdayDescriptions empieza en lunes; getDay() empieza en domingo.
    const todayIndex = (new Date().getDay() + 6) % 7;
    const hoursToday = place.regularOpeningHours?.weekdayDescriptions?.[todayIndex] || null;

    return {
      phone: place.nationalPhoneNumber || null,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? 0,
      openNow,
      hoursToday,
      website: place.websiteURI || null,
    };
  }

  /** Abre la ruta en Google Maps (app o web). No consume cuota de la API. */
  directionsUrl(vet: VetPlace): string {
    const params = new URLSearchParams({
      api: '1',
      destination: `${vet.location.lat},${vet.location.lng}`,
      destination_place_id: vet.id,
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  /** Distancia en línea recta (fórmula de haversine). */
  distanceMeters(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
    const R = 6371000;
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  formatDistance(meters: number | null): string {
    if (meters === null) return '';
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  }
}
