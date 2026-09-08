export type MetricInputValue = {
  alias: string;
  value: number;
};

const operators = new Set(["+", "-", "*", "/"]);
const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

function tokenize(formula: string): string[] {
  return formula.match(/[A-Za-z][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
}

export function evaluateMetricFormula(formula: string, inputs: MetricInputValue[]): number {
  const tokens = tokenize(formula.trim());
  if (!tokens.length) throw new Error("Formula cannot be empty");

  const values = new Map(inputs.map((input) => [input.alias, input.value]));
  const output: string[] = [];
  const stack: string[] = [];
  let expectValue = true;

  for (const token of tokens) {
    if (/^[A-Za-z]/.test(token) || /^\d/.test(token)) {
      if (!expectValue) throw new Error("Invalid formula sequence");
      if (/^[A-Za-z]/.test(token) && !values.has(token)) throw new Error(`Unknown formula alias: ${token}`);
      output.push(token);
      expectValue = false;
      continue;
    }

    if (token === "(") {
      if (!expectValue) throw new Error("Missing operator before '('");
      stack.push(token);
      continue;
    }

    if (token === ")") {
      if (expectValue) throw new Error("Unexpected ')' in formula");
      while (stack.length && stack[stack.length - 1] !== "(") output.push(stack.pop()!);
      if (stack.pop() !== "(") throw new Error("Unbalanced parentheses");
      expectValue = false;
      continue;
    }

    if (operators.has(token)) {
      if (expectValue) throw new Error(`Unexpected operator: ${token}`);
      while (stack.length && operators.has(stack[stack.length - 1]) && precedence[stack[stack.length - 1]] >= precedence[token]) {
        output.push(stack.pop()!);
      }
      stack.push(token);
      expectValue = true;
      continue;
    }

    throw new Error(`Unsupported formula token: ${token}`);
  }

  if (expectValue) throw new Error("Formula cannot end with an operator");
  while (stack.length) {
    const operator = stack.pop()!;
    if (operator === "(") throw new Error("Unbalanced parentheses");
    output.push(operator);
  }

  const evaluation: number[] = [];
  for (const token of output) {
    if (operators.has(token)) {
      const right = evaluation.pop();
      const left = evaluation.pop();
      if (left === undefined || right === undefined) throw new Error("Invalid formula");
      if (token === "/" && right === 0) throw new Error("Division by zero");
      evaluation.push(token === "+" ? left + right : token === "-" ? left - right : token === "*" ? left * right : left / right);
    } else {
      evaluation.push(/^[A-Za-z]/.test(token) ? values.get(token)! : Number(token));
    }
  }

  if (evaluation.length !== 1 || !Number.isFinite(evaluation[0])) throw new Error("Formula did not produce a valid result");
  return evaluation[0];
}
