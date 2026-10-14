import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculate } from './api';

const request = { operation: 'multiply' as const, a: 12, b: 5 };
const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

beforeEach(() => { vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); vi.useRealTimers(); });

function waitUntilAborted() {
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
}

it('sends the exact typed payload and returns the supplied finite result', async () => {
  fetchMock.mockResolvedValue(json({ result: 60 }));
  expect(await calculate(request, new AbortController().signal)).toBe(60);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/calculate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: '{"operation":"multiply","a":12,"b":5}', signal: expect.any(AbortSignal),
  });
});

it.each([0, -2.5, 0.30000000000000004, 5e-324, 1e21])('preserves result %s', async (result) => {
  fetchMock.mockResolvedValue(json({ result }));
  expect(await calculate(request, new AbortController().signal)).toBe(result);
});

it.each([
  ['division_by_zero', 422, 'Cannot divide by zero'],
  ['result_out_of_range', 422, 'result is too large'],
  ['invalid_operand', 400, 'numbers is invalid'],
  ['invalid_operation', 400, 'not supported'],
  ['invalid_json', 400, 'request was invalid'],
  ['payload_too_large', 413, 'request is too large'],
  ['internal_error', 500, 'could not be completed'],
  ['constructor', 500, 'could not be completed'],
] as const)('maps %s to safe feedback', async (code, status, message) => {
  fetchMock.mockResolvedValue(json({ error: { code, message: 'PRIVATE STACK TRACE' } }, status));
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow(message);
});

it.each([{}, null, [], { result: '60' }, { result: null }, { error: { code: 'oops' } }])('rejects malformed success shape %j', async (body) => {
  fetchMock.mockResolvedValue(json(body));
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow('invalid result');
});

it('rejects a JSON numeric literal that parses to Infinity', async () => {
  fetchMock.mockResolvedValue(new Response('{"result":1e999}', { headers: { 'Content-Type': 'application/json' } }));
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow('invalid result');
});

it.each([
  new Response('<html>Private proxy error</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }),
  new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
  new Response('{"result":60}'),
])('handles unreadable or non-JSON responses', async (response) => {
  fetchMock.mockResolvedValue(response);
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow('unreadable response');
});

it('rejects an unexpected success status', async () => {
  fetchMock.mockResolvedValue(json({ result: 60 }, 201));
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow('invalid result');
});

it('uses generic feedback for malformed HTTP error envelopes', async () => {
  fetchMock.mockResolvedValue(json({ error: null }, 500));
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow('could not be completed');
});

it('does not expose network exception details', async () => {
  fetchMock.mockRejectedValue(new TypeError('Private network diagnostics'));
  await expect(calculate(request, new AbortController().signal)).rejects.toThrow('Could not reach the calculator');
});

describe('request lifecycle', () => {
  it('aborts fetch after ten seconds and releases the timer', async () => {
    vi.useFakeTimers();
    waitUntilAborted();
    const result = calculate(request, new AbortController().signal);
    const assertion = expect(result).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending request without treating it as a network error', async () => {
    waitUntilAborted();
    const controller = new AbortController();
    const result = calculate(request, controller.signal);
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('does not send an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(calculate(request, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the timeout active while reading the response body', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async (_url, options) => ({
      ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }),
    } as Response));
    const result = calculate(request, new AbortController().signal);
    const assertion = expect(result).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('cleans up the timer after success', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json({ result: 60 }));
    await calculate(request, new AbortController().signal);
    expect(vi.getTimerCount()).toBe(0);
  });
});
