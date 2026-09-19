import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MedicalHistoryService } from 'src/app/services/MedicalHistoryService/medical-history';
import { PetService } from 'src/app/services/PetService/pet';
import {
  Visit,
  Treatment,
  LabResult,
  Surgery
} from 'src/app/models/medical-history.model';

export type MHTab = 'consultas' | 'tratamientos' | 'lab' | 'cirugias';

@Component({
  selector: 'app-medical-history',
  templateUrl: './medical-history.page.html',
  styleUrls: ['./medical-history.page.scss'],
  standalone: false
})
export class MedicalHistoryPage implements OnInit {

  activeTab: MHTab = 'consultas';
  petId: string = '';

  petName = '';
  petBreed = '';
  petAvatar: string | null = null;

  consultations: Visit[] = [];
  treatments: Treatment[] = [];
  labTests: LabResult[] = [];
  surgeries: Surgery[] = [];

  loading = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private medicalHistoryService: MedicalHistoryService,
    private petService: PetService
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';

    const tabParam =
      this.route.snapshot.queryParamMap.get('tab') as MHTab;

    if (
      tabParam &&
      ['consultas', 'tratamientos', 'lab', 'cirugias'].includes(tabParam)
    ) {
      this.activeTab = tabParam;
    }

    if (this.petId) {
      this.loadPetInfo();
    }
  }

  ionViewWillEnter() {
    if (this.petId) {
      this.loadAll();
    }
  }

  private loadPetInfo() {
    this.petService.getPetById(this.petId).subscribe({
      next: (pet) => {
        this.petName = pet.name;
        this.petBreed = pet.breed;
        this.petAvatar = pet.imageUrl;
      },
      error: (err) => {
        console.error('❌ Error cargando datos de mascota:', err);
      }
    });
  }

  private loadAll() {
    this.loading = true;

    this.medicalHistoryService.getVisitsByPet(this.petId).subscribe({
      next: (visits) => {

        console.log('📋 VISITAS DEVUELTAS:', visits);

        visits.forEach((visit) => {
          console.log('📌 VISIT ID:', visit.id);
        });

        this.consultations = visits;

        this.loadTreatmentsAndLabsForVisits(visits);
      },

      error: (err) => {
        console.error('❌ Error cargando consultas:', err);

        this.consultations = [];
        this.treatments = [];
        this.labTests = [];
      }
    });

    this.medicalHistoryService.getSurgeriesByPet(this.petId).subscribe({
      next: (surgeries) => {
        this.surgeries = surgeries;
        this.loading = false;
      },

      error: (err) => {
        console.error('❌ Error cargando cirugías:', err);

        this.surgeries = [];
        this.loading = false;
      }
    });
  }

  private loadTreatmentsAndLabsForVisits(visits: Visit[]) {

    if (visits.length === 0) {
      this.treatments = [];
      this.labTests = [];
      return;
    }

    const allTreatments: Treatment[] = [];
    const allLabs: LabResult[] = [];

    let completed = 0;

    const totalCalls = visits.length * 2;

    const checkDone = () => {
      completed++;

      if (completed === totalCalls) {

        this.treatments = allTreatments;
        this.labTests = allLabs;

        console.log(
          '🧪 LABORATORIOS FINALES:',
          this.labTests
        );
      }
    };

    visits.forEach((visit) => {

      // ==========================
      // TRATAMIENTOS
      // ==========================

      this.medicalHistoryService
        .getTreatmentForVisit(visit.id)
        .subscribe({

          next: (treatmentsForVisit) => {

            if (treatmentsForVisit.length === 0) {
              checkDone();
              return;
            }

            let treatmentsCompleted = 0;

            treatmentsForVisit.forEach((summary) => {

              this.medicalHistoryService
                .getTreatmentById(summary.id)
                .subscribe({

                  next: (fullTreatment) => {

                    allTreatments.push(fullTreatment);

                    treatmentsCompleted++;

                    if (
                      treatmentsCompleted ===
                      treatmentsForVisit.length
                    ) {
                      checkDone();
                    }
                  },

                  error: (err) => {

                    console.error(
                      `❌ Error cargando detalle del tratamiento ${summary.id}:`,
                      err
                    );

                    allTreatments.push(summary);

                    treatmentsCompleted++;

                    if (
                      treatmentsCompleted ===
                      treatmentsForVisit.length
                    ) {
                      checkDone();
                    }
                  }

                });
            });
          },

          error: (err) => {

            if (err.status !== 404) {
              console.error(
                `❌ Error cargando tratamiento de la consulta ${visit.id}:`,
                err
              );
            }

            checkDone();
          }

        });


      // ==========================
      // LABORATORIOS
      // ==========================

      console.log(
        '🔎 BUSCANDO LABS PARA VISIT ID:',
        visit.id
      );

      this.medicalHistoryService.getLabResultsByVisit(visit.id).subscribe({
  next: (labs) => {
    console.log(`🧪 Labs para visita ${visit.id}:`, labs);
    allLabs.push(...labs);
    checkDone();
  },

          error: (err) => {
    const noEncontrado = err.status === 404 ||
      (err.status === 500 && (
        err.error?.error?.includes('No se encontró') ||
        err.error?.erro?.includes('No se encontró')
      ));
    if (!noEncontrado) {
      console.error(`❌ Error cargando labs de la consulta ${visit.id}:`, err);
    }
    checkDone();
  }
});

    });
  }

  setTab(tab: MHTab) {
    this.activeTab = tab;
  }

  goToAddConsultation() {
    this.router.navigate([
      '/add-consultation',
      this.petId
    ]);
  }

  goToAddTreatment() {
    this.router.navigate([
      '/add-treatment',
      this.petId
    ]);
  }

  /*
   * Ahora recibe el ID de la consulta
   */
  goToAddLab() {
  this.router.navigate(['/add-lab', this.petId]);
}

  goToAddSurgery() {
    this.router.navigate([
      '/add-surgery',
      this.petId
    ]);
  }

  goBack() {
    this.location.back();
  }
}