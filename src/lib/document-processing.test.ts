import assert from "node:assert/strict";
import { test } from "node:test";
import { transitionDocumentStatus, validateDocumentForIngestion } from "./document-processing";

const document = {
  id: "doc_1",
  organizationId: "org_1",
  contentType: "image/jpeg",
  sizeBytes: 100,
  status: "UPLOADED" as const,
};

test("allows a document to enter processing", () => {
  assert.deepEqual(transitionDocumentStatus(document, "PROCESSING"), {
    documentId: "doc_1",
    from: "UPLOADED",
    to: "PROCESSING",
  });
});

test("rejects invalid status transitions", () => {
  assert.throws(() => transitionDocumentStatus(document, "PROCESSED"), /Invalid document status transition/);
});

test("validates organization-owned document metadata", () => {
  assert.doesNotThrow(() => validateDocumentForIngestion(document));
  assert.throws(() => validateDocumentForIngestion({ ...document, organizationId: "" }), /Organization id is required/);
  assert.throws(() => validateDocumentForIngestion({ ...document, sizeBytes: 0 }), /Document size/);
});
