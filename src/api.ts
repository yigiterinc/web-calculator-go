import type { CalculationRequest } from './calculator';

const messages: Record<string, string> = {
  division_by_zero: 'Cannot divide by zero. Change the second number and try again.',
  result_out_of_range: 'The result is too large. Try smaller numbers.',
  invalid_operand: 'One of the numbers is invalid. Clear and try again.',
  invalid_operation: 'This operation is not supported. Clear and try again.',
  invalid_json: 'The calculation request was invalid. Clear and try again.',
  payload_too_large: 'The calculation request is too large. Clear and try again.',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function calculate(request: CalculationRequest, signal: AbortSignal): Promise<number> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 10_000);

  try {
    controller.signal.throwIfAborted();
    let response: Response;
    try {
      response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch {
      throw new Error('Could not reach the calculator. Check your connection and try again.');
    }

    let body: unknown;
    try {
      if (response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
        throw new Error('Non-JSON response');
      }
      body = await response.json();
    } catch {
      throw new Error('The server returned an unreadable response. Please try again.');
    }
    controller.signal.throwIfAborted();

    if (!response.ok) {
      const code = isObject(body) && isObject(body.error) ? body.error.code : undefined;
      // Use our own copy; never expose arbitrary server bodies or diagnostics.
      throw new Error(typeof code === 'string' && Object.hasOwn(messages, code)
        ? messages[code]
        : 'The calculation could not be completed. Please try again.');
    }
    if (response.status !== 200 || !isObject(body) || typeof body.result !== 'number' || !Number.isFinite(body.result)) {
      throw new Error('The server returned an invalid result. Please try again.');
    }
    return body.result;
  } catch (error) {
    if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (timedOut) throw new Error('The calculation timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}
