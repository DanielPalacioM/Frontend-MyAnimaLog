import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
export class AddLabPage {

  petName = 'Juan';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  // Tabs de tipo de examen
  examTypes = ['Hemograma', 'Bioquímica', 'Rayos X', '+ Otro'];
  selectedExamType = 'Hemograma';

  examName = '';
  examDate = '';
  result = '';
  normalRange = '';
  isNormal: boolean | null = null;
  notes = '';

  labValues: LabValue[] = [];

  // Modal agregar valor
  showValueModal = false;
  newValueLabel = '';
  newValueValue = '';
  newValueRange = '';
  newValueIsNormal = true;

  constructor(private router: Router) {}

  selectExamType(type: string) {
    this.selectedExamType = type;
  }

  setNormal(val: boolean) {
    this.isNormal = val;
  }

  openValueModal() { this.showValueModal = true; }

  closeValueModal() {
    this.showValueModal = false;
    this.newValueLabel = '';
    this.newValueValue = '';
    this.newValueRange = '';
    this.newValueIsNormal = true;
  }

  addValue() {
    if (!this.newValueLabel || !this.newValueValue) return;
    this.labValues.push({
      label: this.newValueLabel,
      value: this.newValueValue,
      normalRange: this.newValueRange,
      isNormal: this.newValueIsNormal,
    });
    this.closeValueModal();
  }

  removeValue(index: number) {
    this.labValues.splice(index, 1);
  }

  save() {
    console.log('Guardar examen:', {
      examType: this.selectedExamType,
      examName: this.examName,
      examDate: this.examDate,
      result: this.result,
      normalRange: this.normalRange,
      isNormal: this.isNormal,
      notes: this.notes,
      labValues: this.labValues,
    });
    // TODO: LabService.create(...)
    history.back();
  }

  cancel() { history.back(); }
  goBack() { history.back(); }
}