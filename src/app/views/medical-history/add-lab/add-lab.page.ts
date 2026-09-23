import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { MedicalHistoryService } from 'src/app/services/MedicalHistoryService/medical-history';
import { PetService } from 'src/app/services/PetService/pet';

import { Visit } from 'src/app/models/medical-history.model';

export interface LabValue {
  label: string;
  value: string;
  normalRange: string;
  isNormal: boolean;
}

@Component({
  selector: 'app-add-lab',
  templateUrl: './add-lab.page.html',
  styleUrls: ['./add-lab.page.scss'],
  standalone: false
})
export class AddLabPage implements OnInit {

  petId: string = '';

  petName = '';
  petAvatar: string | null = null;

  visits: Visit[] = [];

  selectedVisitId: string = '';

  examDate = '';
  notes = '';

  labValues: LabValue[] = [];

  showValueModal = false;

  newValueLabel = '';
  newValueValue = '';
  newValueRange = '';
  newValueIsNormal = true;

  saving = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private medicalHistoryService: MedicalHistoryService,
    private petService: PetService
  ) {}

  ngOnInit() {

    // ==========================
    // PET ID
    // ==========================

    this.petId =
      this.route.snapshot.paramMap.get('petId') || '';

    // ==========================
    // VISIT ID RECIBIDO
    // ==========================

    const visitIdFromQuery =
      this.route.snapshot.queryParamMap.get('visitId');

    console.log(
      '🧪 visitId recibido por URL:',
      visitIdFromQuery
    );

    if (!this.petId) {
      return;
    }

    // ==========================
    // DATOS DE LA MASCOTA
    // ==========================

    this.petService.getPetById(this.petId).subscribe({

      next: (pet) => {

        this.petName = pet.name;
        this.petAvatar = pet.imageUrl;
      },

      error: (err) => {

        console.error(
          '❌ Error cargando mascota:',
          err
        );
      }

    });

    // ==========================
    // CARGAR CONSULTAS
    // ==========================

    this.medicalHistoryService
      .getVisitsByPet(this.petId)
      .subscribe({

        next: (visits) => {

          this.visits = visits;

          console.log(
            '📋 Consultas disponibles:',
            visits
          );

          /*
           * SI VIENE UN visitId DESDE MEDICAL HISTORY
           * usamos ESE.
           */

          if (visitIdFromQuery) {

            const visitExists = visits.some(
              visit => visit.id === visitIdFromQuery
            );

            if (visitExists) {

              this.selectedVisitId =
                visitIdFromQuery;

              console.log(
                '✅ Consulta seleccionada desde URL:',
                this.selectedVisitId
              );

            } else {

              console.error(
                '❌ El visitId recibido no pertenece a las consultas de esta mascota:',
                visitIdFromQuery
              );
            }

          }

          /*
           * Si no vino visitId por URL,
           * usamos la primera consulta.
           */

          else if (visits.length > 0) {

            this.selectedVisitId =
              visits[0].id;

            console.log(
              'ℹ️ Se seleccionó la primera consulta:',
              this.selectedVisitId
            );
          }

        },

        error: (err) => {

          console.error(
            '❌ Error cargando visitas:',
            err
          );
        }

      });
  }

  // ==========================
  // MODAL
  // ==========================

  openValueModal() {
    this.showValueModal = true;
  }

  closeValueModal() {

    this.showValueModal = false;

    this.newValueLabel = '';
    this.newValueValue = '';
    this.newValueRange = '';
    this.newValueIsNormal = true;
  }

  // ==========================
  // AGREGAR VALOR
  // ==========================

  addValue() {

    if (
      !this.newValueLabel ||
      !this.newValueValue
    ) {
      return;
    }

    this.labValues.push({

      label: this.newValueLabel,

      value: this.newValueValue,

      normalRange: this.newValueRange,

      isNormal: this.newValueIsNormal

    });

    this.closeValueModal();
  }

  // ==========================
  // ELIMINAR VALOR
  // ==========================

  removeValue(index: number) {

    this.labValues.splice(index, 1);
  }

  // ==========================
  // GUARDAR
  // ==========================

  save() {

    if (this.saving) {
      return;
    }

    if (!this.selectedVisitId) {

      alert(
        'Selecciona a qué consulta pertenece este examen.'
      );

      return;
    }

    if (this.labValues.length === 0) {

      alert(
        'Agrega al menos un valor de laboratorio.'
      );

      return;
    }

    this.saving = true;

    console.log(
      '🚀 GUARDANDO LABORATORIOS PARA VISIT:',
      this.selectedVisitId
    );

    this.saveValuesSequentially(0);
  }

  // ==========================
  // GUARDAR UNO POR UNO
  // ==========================

  private saveValuesSequentially(index: number) {

    if (index >= this.labValues.length) {

      this.saving = false;

      console.log(
        '✅ Todos los laboratorios fueron procesados'
      );

      this.router.navigate(
        ['/medical-history', this.petId],
        {
          queryParams: {
            tab: 'lab'
          },
          replaceUrl: true
        }
      );

      return;
    }

    const v = this.labValues[index];

    const payload = {

      petId: this.petId,

      visit_id: this.selectedVisitId,

      name: v.label,

      result: v.value,

      normal_range: v.normalRange,

      date: this.examDate,

      notes: this.notes || undefined

    };

    console.log(
      '📤 ENVIANDO LABORATORIO:',
      payload
    );

    this.medicalHistoryService
      .createLabResult(payload)
      .subscribe({

        next: (response) => {

          console.log(
            '✅ LABORATORIO CREADO:',
            response
          );

          this.saveValuesSequentially(
            index + 1
          );
        },

        error: (err) => {

          console.error(
            `❌ Error guardando valor ${index}:`,
            err
          );

          /*
           * Continúa con el siguiente.
           */

          this.saveValuesSequentially(
            index + 1
          );
        }

      });
  }

  cancel() {
    this.location.back();
  }

  goBack() {
    this.location.back();
  }
}