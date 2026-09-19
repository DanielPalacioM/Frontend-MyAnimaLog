export type DocumentType =
  | 'VACCINE'
  | 'MEDICAL_RECORD'
  | 'PRESCRIPTION'
  | 'LAB_RESULT'
  | 'SURGERY_REPORT'
  | 'DEWORMING'
  | 'ALLERGY_REPORT'
  | 'OTHER';

export interface PetDocument {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  documentType: DocumentType;
  uploadedAt: string;
}