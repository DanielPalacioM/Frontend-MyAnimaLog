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

export interface VetSuggestion {
  placeId: string;
  main: string;
  secondary: string;
  distanceMeters: number | null;
  prediction: google.maps.places.PlacePrediction;
}

export type RouteMode = 'DRIVING' | 'TWO_WHEELER' | 'WALKING';

export interface VetRoute {
  path: google.maps.LatLngLiteral[];
  distanceMeters: number;
  durationMillis: number;
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

  newSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
    this.configure();
    return importLibrary('places').then(({ AutocompleteSessionToken }) => new AutocompleteSessionToken());
  }

  /**
   * Sugerencias mientras el usuario escribe, solo veterinarias y priorizando
   * las cercanas. Con el mismo sessionToken Google cobra la búsqueda como una
   * sola sesión al elegir una sugerencia.
   */
  async suggestVets(
    input: string,
    center: google.maps.LatLngLiteral,
    origin: google.maps.LatLngLiteral | null,
    sessionToken: google.maps.places.AutocompleteSessionToken
  ): Promise<VetSuggestion[]> {
    this.configure();
    const { AutocompleteSuggestion } = await importLibrary('places');

    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
      includedPrimaryTypes: ['veterinary_care'],
      locationBias: { center, radius: 20000 },
      origin: origin || undefined,
      includedRegionCodes: ['co'],
      language: 'es',
    });

    return suggestions
      .map(s => s.placePrediction)
      .filter((p): p is google.maps.places.PlacePrediction => !!p)
      .map(p => ({
        placeId: p.placeId,
        main: p.mainText?.text || p.text.text,
        secondary: p.secondaryText?.text || '',
        distanceMeters: p.distanceMeters ?? null,
        prediction: p,
      }));
  }

  /** Convierte una sugerencia elegida en una veterinaria del mapa (cierra la sesión). */
  async vetFromSuggestion(
    suggestion: VetSuggestion,
    origin: google.maps.LatLngLiteral | null
  ): Promise<VetPlace | null> {
    const { place } = await suggestion.prediction.toPlace().fetchFields({ fields: SEARCH_FIELDS });
    if (!place.location) return null;
    const location = place.location.toJSON();
    return {
      id: place.id,
      name: place.displayName || suggestion.main,
      address: place.formattedAddress || suggestion.secondary,
      location,
      distanceMeters: origin ? this.distanceMeters(origin, location) : null,
      place,
    };
  }

  /** Ruta real por calles (Routes API), sin tráfico para mantener el costo bajo. */
  async computeRoute(
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral,
    mode: RouteMode
  ): Promise<VetRoute | null> {
    this.configure();
    const { Route } = await importLibrary('routes');

    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      travelMode: mode,
      fields: ['path', 'distanceMeters', 'durationMillis'],
      language: 'es',
      region: 'co',
    });

    const route = routes?.[0];
    if (!route?.path?.length) return null;
    return {
      path: route.path.map(p => ({ lat: p.lat, lng: p.lng })),
      distanceMeters: route.distanceMeters ?? 0,
      durationMillis: route.durationMillis ?? 0,
    };
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

  /** Navegación paso a paso en la app de Google Maps. No consume cuota de la API. */
  directionsUrl(vet: VetPlace, mode: RouteMode = 'DRIVING'): string {
    const travelmode = mode === 'WALKING' ? 'walking' : mode === 'TWO_WHEELER' ? 'two-wheeler' : 'driving';
    const params = new URLSearchParams({
      api: '1',
      destination: `${vet.location.lat},${vet.location.lng}`,
      destination_place_id: vet.id,
      travelmode,
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

  formatDuration(millis: number): string {
    const minutes = Math.max(1, Math.round(millis / 60000));
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  formatDistance(meters: number | null): string {
    if (meters === null) return '';
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  }
}
