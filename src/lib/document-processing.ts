export type DocumentProcessingStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "REVIEW_REQUIRED"
  | "PROCESSED"
  | "FAILED";

export type DocumentRecord = {
  id: string;
  organizationId: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string | null;
  status: DocumentProcessingStatus;
};

export type DocumentProcessingEvent = {
  documentId: string;
  from: DocumentProcessingStatus;
  to: DocumentProcessingStatus;
};

const transitions: Record<DocumentProcessingStatus, DocumentProcessingStatus[]> = {
  UPLOADED: ["PROCESSING", "FAILED"],
  PROCESSING: ["REVIEW_REQUIRED", "PROCESSED", "FAILED"],
  REVIEW_REQUIRED: ["PROCESSING", "PROCESSED", "FAILED"],
  PROCESSED: [],
  FAILED: ["PROCESSING"],
};

export function transitionDocumentStatus(
  document: DocumentRecord,
  next: DocumentProcessingStatus,
): DocumentProcessingEvent {
  if (!transitions[document.status].includes(next)) {
    throw new Error(`Invalid document status transition: ${document.status} -> ${next}`);
  }
  return { documentId: document.id, from: document.status, to: next };
}

export function validateDocumentForIngestion(document: DocumentRecord): void {
  if (!document.id.trim()) throw new Error("Document id is required");
  if (!document.organizationId.trim()) throw new Error("Organization id is required");
  if (!document.contentType.trim()) throw new Error("Document content type is required");
  if (!Number.isSafeInteger(document.sizeBytes) || document.sizeBytes <= 0) {
    throw new Error("Document size must be a positive safe integer");
  }
}
