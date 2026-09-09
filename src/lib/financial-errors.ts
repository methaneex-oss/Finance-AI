export class FinancialValidationError extends Error {
  status = 400;
}

export class FinancialNotFoundError extends Error {
  status = 404;
}

export class FinancialConflictError extends Error {
  status = 409;
}

export function financialErrorResponse(error: unknown) {
  if (error instanceof FinancialValidationError || error instanceof FinancialNotFoundError || error instanceof FinancialConflictError) {
    return { status: error.status, message: error.message };
  }
  return { status: 500, message: "An unexpected financial system error occurred" };
}
