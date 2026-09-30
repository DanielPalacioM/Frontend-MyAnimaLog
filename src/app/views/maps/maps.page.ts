import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MapsService, RouteMode, VetDetails, VetPlace, VetRoute, VetSuggestion } from 'src/app/services/MapsService/maps';
import { TutorialService, TutorialStep } from 'src/app/services/TutorialService/tutorial';

// Si el usuario no da permiso de ubicación, el mapa arranca aquí.
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 10.391, lng: -75.479 };
const SEARCH_RADIUS_METERS = 5000;
const DEFAULT_ZOOM = 14;
const FOCUS_ZOOM = 16;
const SUGGEST_DEBOUNCE_MS = 300;
const ROUTE_COLOR = '#4037BE';

// Pin con huella, en los colores de la app. Se crea como HTML porque
// AdvancedMarkerElement acepta cualquier elemento como contenido.
const PAW_SVG = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <ellipse cx="6" cy="9" rx="2" ry="2.6"/>
    <ellipse cx="10" cy="5.5" rx="2" ry="2.6"/>
    <ellipse cx="14" cy="5.5" rx="2" ry="2.6"/>
    <ellipse cx="18" cy="9" rx="2" ry="2.6"/>
    <path d="M12 11c-3 0-6 3.6-6 6.2 0 1.7 1.3 2.8 3 2.8 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-1.1 3-2.8C18 14.6 15 11 12 11z"/>
  </svg>`;

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
  standalone: false
})
export class MapsPage implements AfterViewInit, OnDestroy {

  @ViewChild('mapEl') mapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sheetEl') sheetRef?: ElementRef<HTMLDivElement>;

  status: 'loading' | 'ready' | 'error' = 'loading';
  searching = false;
  searchError = false;
  locationDenied = false;

  vets: VetPlace[] = [];
  selected: VetPlace | null = null;
  details: VetDetails | null = null;
  detailsLoading = false;

  sheetExpanded = false;
  showSearchHere = false;

  // Buscador por nombre
  query = '';
  searchFocused = false;
  localMatches: VetPlace[] = [];
  suggestions: VetSuggestion[] = [];
  suggestLoading = false;

  // Ruta dentro del mapa
  route: VetRoute | null = null;
  routeMode: RouteMode = 'DRIVING';
  routeLoading = false;
  routeError: string | null = null;
  readonly routeModes: { mode: RouteMode; label: string }[] = [
    { mode: 'DRIVING', label: 'Carro' },
    { mode: 'TWO_WHEELER', label: 'Moto' },
    { mode: 'WALKING', label: 'A pie' },
  ];

  tourOpen = false;
  tourSteps: TutorialStep[] = [];

  private map?: google.maps.Map;
  private MarkerCtor?: typeof google.maps.marker.AdvancedMarkerElement;
  private markers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
  private userMarker?: google.maps.marker.AdvancedMarkerElement;
  private userPosition: google.maps.LatLngLiteral | null = null;
  private listeners: google.maps.MapsEventListener[] = [];
  private routeLines: google.maps.Polyline[] = [];
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  private suggestTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private zone: NgZone,
    public maps: MapsService,
    private tutorialService: TutorialService
  ) {}

  async ngAfterViewInit() {
    try {
      const [position, libs] = await Promise.all([
        this.getUserPosition(),
        this.maps.loadMapLibraries(),
      ]);
      this.userPosition = position;
      this.MarkerCtor = libs.AdvancedMarkerElement;

      this.map = new libs.Map(this.mapRef.nativeElement, {
        center: position || DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        mapId: this.maps.mapId,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });

      // Cuando el usuario mueve el mapa se ofrece buscar en la nueva zona.
      this.listeners.push(
        this.map.addListener('dragend', () => this.zone.run(() => this.showSearchHere = true))
      );

      if (position) this.drawUserMarker(position);

      this.status = 'ready';
      await this.search(position || DEFAULT_CENTER);
      this.maybeStartTutorial();
    } catch (err) {
      console.error('❌ Error cargando Google Maps:', err);
      this.zone.run(() => this.status = 'error');
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.suggestTimer);
    this.clearRouteLines();
    this.listeners.forEach(l => l.remove());
    this.markers.forEach(m => m.map = null);
    if (this.userMarker) this.userMarker.map = null;
  }

  // ---------- Ubicación ----------

  private getUserPosition(): Promise<google.maps.LatLngLiteral | null> {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        this.locationDenied = true;
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          this.locationDenied = true;
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  private drawUserMarker(position: google.maps.LatLngLiteral): void {
    if (!this.map || !this.MarkerCtor) return;
    const dot = document.createElement('div');
    dot.className = 'user-dot';
    this.userMarker = new this.MarkerCtor({ map: this.map, position, content: dot, zIndex: 1 });
  }

  /** Pide la ubicación de nuevo y actualiza el punto azul. */
  private async refreshUserPosition(): Promise<google.maps.LatLngLiteral | null> {
    const position = await this.getUserPosition();
    if (!position) return null;
    this.zone.run(() => this.locationDenied = false);
    this.userPosition = position;
    if (this.userMarker) this.userMarker.position = position;
    else this.drawUserMarker(position);
    return position;
  }

  async recenter() {
    const position = await this.refreshUserPosition();
    if (!position || !this.map) return;
    this.map.panTo(position);
    this.map.setZoom(DEFAULT_ZOOM);
    this.search(position);
  }

  // ---------- Búsqueda ----------

  searchHere(): void {
    const center = this.map?.getCenter()?.toJSON();
    if (center) this.search(center);
  }

  async search(center: google.maps.LatLngLiteral) {
    this.zone.run(() => {
      this.searching = true;
      this.searchError = false;
      this.showSearchHere = false;
      this.closeDetail();
    });

    try {
      const vets = await this.maps.searchVets(center, SEARCH_RADIUS_METERS, this.userPosition);
      this.zone.run(() => {
        this.vets = vets;
        this.drawVetMarkers();
      });
    } catch (err) {
      console.error('❌ Error buscando veterinarias:', err);
      this.zone.run(() => {
        this.vets = [];
        this.drawVetMarkers();
        this.searchError = true;
      });
    } finally {
      this.zone.run(() => this.searching = false);
    }
  }

  private drawVetMarkers(): void {
    this.markers.forEach(m => m.map = null);
    this.markers.clear();
    if (!this.map || !this.MarkerCtor) return;

    for (const vet of this.vets) {
      const pin = document.createElement('div');
      pin.className = 'vet-pin';
      pin.innerHTML = PAW_SVG;

      const marker = new this.MarkerCtor({
        map: this.map,
        position: vet.location,
        content: pin,
        title: vet.name,
        gmpClickable: true,
      });
      marker.addListener('click', () => this.zone.run(() => this.selectVet(vet)));
      this.markers.set(vet.id, marker);
    }
  }

  private addVet(vet: VetPlace): VetPlace {
    const existing = this.vets.find(v => v.id === vet.id);
    if (existing) return existing;
    this.vets = [...this.vets, vet]
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    this.drawVetMarkers();
    return vet;
  }

  // ---------- Buscador por nombre ----------

  get showSuggestions(): boolean {
    return this.searchFocused && this.query.trim().length >= 2;
  }

  onQueryChange(value: string): void {
    this.query = value;
    const input = value.trim();
    const normalized = this.normalize(input);

    // Primero las que ya están en el mapa (gratis, sin llamar a Google).
    this.localMatches = normalized.length >= 2
      ? this.vets.filter(v => this.normalize(v.name).includes(normalized)).slice(0, 5)
      : [];

    clearTimeout(this.suggestTimer);
    if (input.length < 3) {
      this.suggestions = [];
      this.suggestLoading = false;
      return;
    }
    this.suggestLoading = true;
    this.suggestTimer = setTimeout(() => this.fetchSuggestions(input), SUGGEST_DEBOUNCE_MS);
  }

  private async fetchSuggestions(input: string) {
    try {
      this.sessionToken ??= await this.maps.newSessionToken();
      const center = this.map?.getCenter()?.toJSON() || this.userPosition || DEFAULT_CENTER;
      const list = await this.maps.suggestVets(input, center, this.userPosition, this.sessionToken);
      this.zone.run(() => {
        if (input !== this.query.trim()) return; // llegó tarde: el usuario siguió escribiendo
        const shown = new Set(this.localMatches.map(v => v.id));
        this.suggestions = list.filter(s => !shown.has(s.placeId));
        this.suggestLoading = false;
      });
    } catch (err) {
      console.error('❌ Error buscando sugerencias:', err);
      this.zone.run(() => {
        this.suggestions = [];
        this.suggestLoading = false;
      });
    }
  }

  pickLocal(vet: VetPlace): void {
    this.clearSearch();
    this.selectVet(vet);
    this.map?.setZoom(FOCUS_ZOOM);
  }

  async pickSuggestion(suggestion: VetSuggestion) {
    this.clearSearch();
    try {
      const vet = await this.maps.vetFromSuggestion(suggestion, this.userPosition);
      this.sessionToken = undefined; // la sesión termina al elegir
      if (!vet) return;
      this.zone.run(() => {
        this.selectVet(this.addVet(vet));
        this.map?.setZoom(FOCUS_ZOOM);
      });
    } catch (err) {
      console.error('❌ Error abriendo la veterinaria elegida:', err);
    }
  }

  clearSearch(): void {
    clearTimeout(this.suggestTimer);
    this.query = '';
    this.localMatches = [];
    this.suggestions = [];
    this.suggestLoading = false;
    this.searchFocused = false;
  }

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ---------- Selección y detalle ----------

  async selectVet(vet: VetPlace) {
    if (this.selected?.id !== vet.id) this.clearRoute();
    this.highlightMarker(vet.id);
    this.selected = vet;
    this.details = null;
    this.detailsLoading = true;
    this.map?.panTo(vet.location);

    try {
      const details = await this.maps.getVetDetails(vet);
      // El usuario pudo haber tocado otra veterinaria mientras cargaba.
      this.zone.run(() => {
        if (this.selected?.id === vet.id) this.details = details;
      });
    } catch (err) {
      console.error('❌ Error cargando detalle de la veterinaria:', err);
    } finally {
      this.zone.run(() => {
        if (this.selected?.id === vet.id) this.detailsLoading = false;
      });
    }
  }

  closeDetail(): void {
    this.clearRoute();
    this.selected = null;
    this.details = null;
    this.highlightMarker(null);
  }

  private highlightMarker(id: string | null): void {
    this.markers.forEach((marker, markerId) => {
      const el = marker.content as HTMLElement;
      const active = markerId === id;
      el.classList.toggle('selected', active);
      marker.zIndex = active ? 10 : null;
    });
  }

  toggleSheet(): void {
    this.sheetExpanded = !this.sheetExpanded;
  }

  distanceLabel(vet: VetPlace): string {
    return this.maps.formatDistance(vet.distanceMeters);
  }

  stars(rating: number): number[] {
    return [1, 2, 3, 4, 5].map(i => Math.max(0, Math.min(1, rating - i + 1)));
  }

  // ---------- Acciones ----------

  bookAppointment(vet: VetPlace): void {
    this.router.navigate(['/calendar/add-event'], {
      queryParams: {
        type: 'VET_APPOINTMENT',
        title: `Cita en ${vet.name}`,
        location: vet.address ? `${vet.name} · ${vet.address}` : vet.name,
      }
    });
  }

  // ---------- Ruta ----------

  async showRoute(vet: VetPlace, mode: RouteMode = this.routeMode) {
    this.routeError = null;
    this.routeMode = mode;

    const origin = this.userPosition || await this.refreshUserPosition();
    if (!origin) {
      this.zone.run(() => this.routeError = 'Activa tu ubicación para trazar la ruta.');
      return;
    }

    this.zone.run(() => this.routeLoading = true);
    try {
      const route = await this.maps.computeRoute(origin, vet.location, mode);
      this.zone.run(() => {
        if (this.selected?.id !== vet.id) return; // cambió de veterinaria mientras calculaba
        if (!route) {
          this.clearRouteLines();
          this.route = null;
          this.routeError = 'No encontramos una ruta hasta esta veterinaria.';
          return;
        }
        this.route = route;
        this.drawRoute(route);
      });
    } catch (err) {
      console.error('❌ Error calculando la ruta:', err);
      this.zone.run(() => this.routeError = 'No pudimos calcular la ruta. Inténtalo de nuevo.');
    } finally {
      this.zone.run(() => this.routeLoading = false);
    }
  }

  changeRouteMode(mode: RouteMode): void {
    if (this.selected && mode !== this.routeMode) this.showRoute(this.selected, mode);
  }

  clearRoute(): void {
    this.clearRouteLines();
    this.route = null;
    this.routeError = null;
    this.routeLoading = false;
  }

  private drawRoute(route: VetRoute): void {
    if (!this.map) return;
    this.clearRouteLines();

    // Borde blanco debajo para que la línea morada resalte sobre cualquier calle.
    const outline = new google.maps.Polyline({
      path: route.path, map: this.map, strokeColor: '#FFFFFF', strokeOpacity: 1, strokeWeight: 10, zIndex: 1,
    });
    const line = new google.maps.Polyline({
      path: route.path, map: this.map, strokeColor: ROUTE_COLOR, strokeOpacity: 1, strokeWeight: 6, zIndex: 2,
    });
    this.routeLines = [outline, line];

    const bounds = new google.maps.LatLngBounds();
    route.path.forEach(point => bounds.extend(point));
    const sheetHeight = this.sheetRef?.nativeElement.offsetHeight ?? 0;
    this.map.fitBounds(bounds, { top: 90, left: 40, right: 40, bottom: sheetHeight + 24 });
  }

  private clearRouteLines(): void {
    this.routeLines.forEach(line => line.setMap(null));
    this.routeLines = [];
  }

  routeSummary(route: VetRoute): string {
    return `${this.maps.formatDuration(route.durationMillis)} · ${this.maps.formatDistance(route.distanceMeters)}`;
  }

  openInGoogleMaps(vet: VetPlace): void {
    window.open(this.maps.directionsUrl(vet, this.routeMode), '_blank');
  }

  call(phone: string): void {
    window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
  }

  openWebsite(url: string): void {
    window.open(url, '_blank');
  }

  goBack(): void {
    this.router.navigateByUrl('/home');
  }

  // ---------- Tutorial ----------

  private maybeStartTutorial(): void {
    if (this.tourOpen || this.tutorialService.hasSeen('maps')) return;
    this.zone.run(() => {
      this.tourSteps = this.tutorialService.getSteps('maps');
      this.tourOpen = true;
    });
  }

  onTourClosed(): void {
    this.tutorialService.markSeen('maps');
    this.tourOpen = false;
  }
}
