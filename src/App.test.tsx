// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const result = () => screen.getByLabelText('Result');
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => { vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.resetAllMocks(); vi.useRealTimers(); });

function setup() {
  render(<StrictMode><App /></StrictMode>);
  return userEvent.setup();
}

async function press(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) await user.click(button(name));
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

it('renders the display and all accessible keypad controls', () => {
  setup();
  expect(screen.getByRole('heading', { name: 'Calculator' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Calculator' })).toHaveFocus();
  expect(result()).toHaveTextContent(/^0$/);
  for (const name of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'All clear', 'Backspace', 'Toggle sign', 'Decimal point', 'Add', 'Subtract', 'Multiply', 'Divide', 'Equals']) {
    expect(button(name)).toBeVisible();
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

it('sends one request from the keypad and renders the API result and expression', async () => {
  fetchMock.mockResolvedValue(json({ result: 60 }));
  const user = setup();
  await press(user, '1', '2', 'Multiply', '5', 'Equals');
  await waitFor(() => expect(result()).toHaveTextContent(/^60$/));
  expect(screen.getByLabelText('Expression')).toHaveTextContent('12 × 5 =');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0]?.[1]?.body).toBe('{"operation":"multiply","a":12,"b":5}');
});

it.each([
  ['12+5{Enter}', 'add', 12, 5, 17],
  ['9-4=', 'subtract', 9, 4, 5],
  ['1.5*2=', 'multiply', 1.5, 2, 3],
  ['8/2=', 'divide', 8, 2, 4],
] as const)('supports keyboard %s', async (input, operation, a, b, answer) => {
  fetchMock.mockResolvedValue(json({ result: answer }));
  const user = setup();
  await user.keyboard(input);
  await waitFor(() => expect(result()).toHaveTextContent(String(answer)));
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ operation, a, b });
});

it('supports backspace, sign toggle, decimal deduplication, operator replacement and Escape', async () => {
  fetchMock.mockResolvedValue(json({ result: -1 }));
  const user = setup();
  await user.keyboard('00.55{Backspace}{F9}+*2=');
  await waitFor(() => expect(result()).toHaveTextContent(/^-1$/));
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ operation: 'multiply', a: -0.5, b: 2 });
  await user.keyboard('{Escape}');
  expect(result()).toHaveTextContent(/^0$/);
  await press(user, 'Decimal point', 'Decimal point', '5', 'Toggle sign', 'Backspace');
  expect(result()).toHaveTextContent(/^-0\.$/);
});

it('keeps native Enter and Space activation on buttons without duplicate handling', async () => {
  fetchMock.mockResolvedValue(json({ result: 9 }));
  const user = setup();
  await user.keyboard('2+');
  button('3').focus();
  await user.keyboard('{Enter}');
  expect(result()).toHaveTextContent(/^3$/);
  expect(fetchMock).not.toHaveBeenCalled();
  await user.keyboard(' ');
  expect(result()).toHaveTextContent(/^33$/);
  button('Equals').focus();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(result()).toHaveTextContent(/^9$/));
});

it('preserves Tab and browser shortcuts and ignores input outside the calculator', async () => {
  const user = setup();
  await user.tab();
  expect(button('All clear')).toHaveFocus();
  expect(fireEvent.keyDown(button('All clear'), { key: 'r', ctrlKey: true })).toBe(true);
  expect(fireEvent.keyDown(button('All clear'), { key: '1', metaKey: true })).toBe(true);
  expect(result()).toHaveTextContent(/^0$/);
  const summary = screen.getByText('Keyboard shortcuts');
  summary.focus();
  await user.keyboard('123');
  expect(result()).toHaveTextContent(/^0$/);
  expect(fireEvent.keyDown(screen.getByRole('region'), { key: '/' })).toBe(false);
});

it('handles a touch activation using native buttons', async () => {
  const user = setup();
  await user.pointer([{ keys: '[TouchA>]', target: button('7') }, { keys: '[/TouchA]' }]);
  expect(result()).toHaveTextContent(/^7$/);
});

it('reuses results, ignores repeated equals and starts fresh on a digit', async () => {
  fetchMock.mockResolvedValueOnce(json({ result: 17 })).mockResolvedValueOnce(json({ result: 34 }));
  const user = setup();
  await user.keyboard('12+5=');
  await waitFor(() => expect(result()).toHaveTextContent(/^17$/));
  await user.keyboard('==');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.keyboard('*2=');
  await waitFor(() => expect(result()).toHaveTextContent(/^34$/));
  expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ operation: 'multiply', a: 17, b: 2 });
  await user.keyboard('8');
  expect(result()).toHaveTextContent(/^8$/);
  expect(screen.getByLabelText('Expression')).toHaveTextContent(/^$/);
});

it('chains using the API result and shows the selected next operator', async () => {
  fetchMock.mockResolvedValueOnce(json({ result: 5 })).mockResolvedValueOnce(json({ result: 20 }));
  const user = setup();
  await user.keyboard('2+3*');
  await waitFor(() => expect(button('Multiply')).toHaveAttribute('aria-pressed', 'true'));
  expect(result()).toHaveTextContent(/^5$/);
  await user.keyboard('4=');
  await waitFor(() => expect(result()).toHaveTextContent(/^20$/));
  expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ operation: 'multiply', a: 5, b: 4 });
});

it('shows loading, blocks edits and prevents duplicate submissions in StrictMode', async () => {
  const response = deferredResponse();
  fetchMock.mockReturnValue(response.promise);
  const user = setup();
  await user.keyboard('8/2=');
  expect(screen.getByText('Calculating…')).toBeVisible();
  expect(button('Equals')).toHaveAttribute('aria-disabled', 'true');
  expect(button('All clear')).toHaveAttribute('aria-disabled', 'false');
  await user.keyboard('==123+{Backspace}');
  await press(user, 'Equals', '9');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(result()).toHaveTextContent(/^2$/);
  await act(async () => response.resolve(json({ result: 4 })));
  expect(result()).toHaveTextContent(/^4$/);
  expect(button('Equals')).toHaveAttribute('aria-disabled', 'false');
});

it.each(['success', 'failure'] as const)('Clear aborts and ignores a late %s during a newer request', async (outcome) => {
  const old = deferredResponse();
  const current = deferredResponse();
  fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const user = setup();
  await user.keyboard('1+2=');
  const signal = fetchMock.mock.calls[0]?.[1]?.signal;
  await press(user, 'All clear');
  expect(signal?.aborted).toBe(true);
  expect(result()).toHaveTextContent(/^0$/);
  await user.keyboard('4+5=');
  await act(async () => {
    if (outcome === 'success') old.resolve(json({ result: 999 }));
    else old.reject(new Error('Late failure'));
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('Calculating…')).toBeVisible();
  await act(async () => current.resolve(json({ result: 9 })));
  expect(result()).toHaveTextContent(/^9$/);
});

it('shows a safe division error and supports editing the second operand', async () => {
  fetchMock.mockResolvedValueOnce(json({ error: { code: 'division_by_zero', message: 'PRIVATE' } }, 422))
    .mockResolvedValueOnce(json({ result: 4 }));
  const user = setup();
  await user.keyboard('8/0=');
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero');
  expect(screen.queryByText('PRIVATE')).not.toBeInTheDocument();
  await user.keyboard('2=');
  await waitFor(() => expect(result()).toHaveTextContent(/^4$/));
  expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ operation: 'divide', a: 8, b: 2 });
});

it('recovers from a network failure by retrying the same pair', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce(json({ result: 3 }));
  const user = setup();
  await user.keyboard('1+2=');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the calculator');
  await user.keyboard('=');
  await waitFor(() => expect(result()).toHaveTextContent(/^3$/));
  expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(fetchMock.mock.calls[0]?.[1]?.body);
});

it.each([
  [json({ result: 'oops' }), 'invalid result'],
  [json({ error: { code: 'invalid_operand' } }, 400), 'numbers is invalid'],
])('renders malformed response and validation errors', async (response, message) => {
  fetchMock.mockResolvedValue(response as Response);
  const user = setup();
  await user.keyboard('1+2=');
  expect(await screen.findByRole('alert')).toHaveTextContent(message as string);
});

it('shows a retryable timeout', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  render(<App />);
  for (const name of ['1', 'Add', '2', 'Equals']) fireEvent.click(button(name));
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(screen.getByRole('alert')).toHaveTextContent('timed out');
  expect(button('Equals')).toHaveAttribute('aria-disabled', 'false');
});

it('aborts on unmount', async () => {
  const response = deferredResponse();
  fetchMock.mockReturnValue(response.promise);
  const view = render(<App />);
  const user = userEvent.setup();
  await user.keyboard('1+2=');
  const signal = fetchMock.mock.calls[0]?.[1]?.signal;
  view.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => response.resolve(json({ result: 3 })));
});

it('renders long results without rounding or truncation', async () => {
  fetchMock.mockResolvedValue(json({ result: 0.30000000000000004 }));
  const user = setup();
  await user.keyboard('0.1+0.2=');
  await waitFor(() => expect(result()).toHaveTextContent(/^0\.30000000000000004$/));
  expect(result()).toHaveClass('number-long');
});
