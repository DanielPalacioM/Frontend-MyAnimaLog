import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { LinkedVet, VetError } from 'src/app/models/veterinary.model';
import { PetService } from 'src/app/services/PetService/pet';
import { PetRef, VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';

type VetState = 'loading' | 'empty' | 'list' | 'error';

/**
 * Pestaña "Vet" del dueño. Sin clínicas: el estado vacío de Figma (2031:225) con "Tengo un código" y
 * "Buscar clínicas". Con clínicas: "Mis veterinarias" (2032:227). Se recarga cada vez que se entra,
 * así al volver de vincularse la lista ya trae la clínica nueva.
 */
@Component({
  selector: 'app-vet',
  templateUrl: './vet.page.html',
  styleUrls: ['./vet.page.scss'],
  standalone: false
})
export class VetPage {
  state: VetState = 'loading';
  vets: LinkedVet[] = [];
  /** veterinaryId → mascotas mías que esa clínica ve. Llega después de la lista. */
  sharing: Map<string, PetRef[]> | null = null;

  constructor(
    private router: Router,
    private vetService: VeterinaryService,
    private petService: PetService
  ) {}

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.state = 'loading';
    this.sharing = null;
    this.vetService.getLinked().subscribe({
      next: vets => {
        this.vets = vets;
        this.state = vets.length ? 'list' : 'empty';
        if (vets.length) this.loadSharing();
      },
      error: (err: VetError) => {
        console.error('❌ No se pudieron cargar las clínicas vinculadas', err);
        this.state = 'error';
      }
    });
  }

  private loadSharing(): void {
    this.petService.getPets().pipe(
      switchMap(pets => this.vetService.loadSharing(pets.map(p => ({ id: p.id, name: p.name }))))
    ).subscribe({
      next: map => (this.sharing = map),
      error: err => console.error('❌ No se pudo cruzar mascotas y clínicas', err)
    });
  }

  /** "Ve a Juan" / "Ve a Milor y Juan" / "Sin mascotas compartidas". */
  seesLabel(v: LinkedVet): string {
    const pets = this.sharing?.get(v.veterinaryId);
    if (!pets) {
      if (!v.sharedPetsCount) return 'Sin mascotas compartidas';
      return v.sharedPetsCount === 1 ? 'Ve 1 mascota' : `Ve ${v.sharedPetsCount} mascotas`;
    }
    if (!pets.length) return 'Sin mascotas compartidas';
    const names = pets.map(p => p.name);
    return 'Ve a ' + (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1]);
  }

  goBack(): void { this.router.navigate(['/home']); }
  onHaveCode(): void { this.router.navigate(['/vet/link']); }
  onSearch(): void { this.router.navigate(['/maps']); }
  openVet(v: LinkedVet): void { this.router.navigate(['/vet/detail', v.veterinaryId]); }
}
