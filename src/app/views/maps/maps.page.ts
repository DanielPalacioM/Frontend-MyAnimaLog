import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MapsService, VetDetails, VetPlace } from 'src/app/services/MapsService/maps';
import { TutorialService, TutorialStep } from 'src/app/services/TutorialService/tutorial';

// Si el usuario no da permiso de ubicación, el mapa arranca aquí.
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 10.391, lng: -75.479 };
const SEARCH_RADIUS_METERS = 5000;
const DEFAULT_ZOOM = 14;

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

  tourOpen = false;
  tourSteps: TutorialStep[] = [];

  private map?: google.maps.Map;
  private MarkerCtor?: typeof google.maps.marker.AdvancedMarkerElement;
  private markers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
  private userMarker?: google.maps.marker.AdvancedMarkerElement;
  private userPosition: google.maps.LatLngLiteral | null = null;
  private listeners: google.maps.MapsEventListener[] = [];

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

  async recenter() {
    const position = await this.getUserPosition();
    if (!position || !this.map) return;
    this.locationDenied = false;
    this.userPosition = position;
    if (this.userMarker) this.userMarker.position = position;
    else this.drawUserMarker(position);
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

  // ---------- Selección y detalle ----------

  async selectVet(vet: VetPlace) {
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

  openDirections(vet: VetPlace): void {
    window.open(this.maps.directionsUrl(vet), '_blank');
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
