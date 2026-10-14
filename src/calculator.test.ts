import { describe, expect, it } from 'vitest';
import { calculatorReducer, initialState } from './calculator';
import type { CalculatorAction, CalculatorState, Digit, Operation } from './calculator';

const digit = (value: Digit): CalculatorAction => ({ type: 'digit', digit: value });
const operator = (operation: Operation): CalculatorAction => ({ type: 'operator', operation });
const equals: CalculatorAction = { type: 'equals' };
const decimal: CalculatorAction = { type: 'decimal' };
const sign: CalculatorAction = { type: 'toggleSign' };
const backspace: CalculatorAction = { type: 'backspace' };
const clear: CalculatorAction = { type: 'clear' };

function sequence(actions: CalculatorAction[], state: CalculatorState = initialState) {
  return actions.reduce(calculatorReducer, state);
}

function pending(operation: Operation = 'add') {
  const state = sequence([digit('2'), operator(operation), digit('3'), equals]);
  if (state.status !== 'pending') throw new Error('Expected pending request');
  return state;
}

// Supplied values stand in for responses; tests never calculate an answer.
function completed(value: number) {
  const state = pending();
  return calculatorReducer(state, { type: 'resolved', id: state.submission.id, result: value });
}

function failed(state: CalculatorState = pending('divide')) {
  if (state.status !== 'pending') throw new Error('Expected pending request');
  const result = calculatorReducer(state, {
    type: 'rejected', id: state.submission.id, message: 'Could not reach the server.',
  });
  if (result.status !== 'error') throw new Error('Expected error');
  return result;
}

describe('entry editing', () => {
  it.each<Digit>(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])('enters digit %s', (value) => {
    expect(sequence([digit(value)])).toMatchObject({ status: 'firstEntry', entry: value });
  });

  it.each<{ name: string; actions: CalculatorAction[]; entry: string }>([
    { name: 'initial zero', actions: [], entry: '0' },
    { name: 'leading zeros', actions: [digit('0'), digit('0'), digit('7')], entry: '7' },
    { name: 'negative leading zeros', actions: [sign, digit('0'), digit('4')], entry: '-4' },
    { name: 'fractional zeros', actions: [decimal, digit('0'), digit('0'), digit('5')], entry: '0.005' },
    { name: 'repeated decimals', actions: [digit('1'), decimal, decimal, digit('5'), decimal], entry: '1.5' },
    { name: 'negative decimal', actions: [sign, decimal, digit('5')], entry: '-0.5' },
    { name: 'double sign toggle', actions: [digit('8'), sign, sign], entry: '8' },
    { name: 'backspace empty', actions: [digit('8'), backspace], entry: '0' },
    { name: 'backspace minus only', actions: [digit('8'), sign, backspace], entry: '0' },
    { name: 'backspace signed zero', actions: [sign, backspace], entry: '0' },
    { name: 'backspace decimal', actions: [digit('1'), decimal, digit('5'), backspace], entry: '1.' },
    { name: 'backspace at zero', actions: [backspace, backspace], entry: '0' },
  ])('$name', ({ actions, entry }) => {
    expect(sequence(actions)).toMatchObject({ status: 'firstEntry', entry });
  });

  it('ignores a digit that would overflow a finite operand', () => {
    const state = sequence(Array.from({ length: 308 }, () => digit('9')));
    expect(state).toMatchObject({ status: 'firstEntry', entry: '9'.repeat(308) });
    expect(calculatorReducer(state, digit('9'))).toEqual(state);
    expect(sequence([backspace, sign], state)).toMatchObject({ entry: `-${'9'.repeat(307)}` });
  });
});

describe('binary request intents', () => {
  it.each<Operation>(['add', 'subtract', 'multiply', 'divide'])('requests %s without computing', (operation) => {
    expect(pending(operation)).toEqual({
      status: 'pending', nextRequestId: 2,
      submission: {
        id: 1, request: { operation, a: 2, b: 3 }, rightEntry: '3', nextOperation: null,
      },
    });
  });

  it('replaces operators until a second operand is entered', () => {
    const state = sequence([digit('5'), operator('add'), operator('multiply'), backspace, equals]);
    expect(state).toMatchObject({ status: 'operatorSelected', left: 5, operation: 'multiply', nextRequestId: 1 });
    expect(sequence([digit('2'), equals], state)).toMatchObject({
      status: 'pending', submission: { request: { operation: 'multiply', a: 5, b: 2 } },
    });
  });

  it('does not invent missing operands or reuse a previous equals', () => {
    expect(sequence([equals, equals])).toEqual(initialState);
    const waiting = sequence([digit('2'), operator('add')]);
    expect(calculatorReducer(waiting, equals)).toBe(waiting);
    const result = completed(5);
    expect(sequence([equals, equals, backspace], result)).toBe(result);
  });

  it('submits valid zero operands including negative zero to the API', () => {
    const state = sequence([operator('divide'), sign, equals]);
    expect(state).toMatchObject({ status: 'pending', submission: { request: { a: 0, b: -0 } } });
    if (state.status !== 'pending') throw new Error('Expected pending request');
    expect(Object.is(state.submission.request.b, -0)).toBe(true);
  });

  it('accepts a trailing decimal and negative fractional second operand', () => {
    expect(sequence([digit('1'), decimal, operator('subtract'), decimal, digit('5'), sign, equals])).toMatchObject({
      status: 'pending', submission: { request: { operation: 'subtract', a: 1, b: -0.5 }, rightEntry: '-0.5' },
    });
  });

  it('edits the second operand and preserves its operator and left operand', () => {
    expect(sequence([digit('8'), operator('divide'), digit('2'), digit('3'), backspace, decimal, digit('5'), sign, equals])).toMatchObject({
      status: 'pending', submission: { request: { operation: 'divide', a: 8, b: -2.5 } },
    });
  });

  it('chains left to right using only the supplied response', () => {
    const first = sequence([digit('2'), operator('add'), digit('3'), operator('multiply')]);
    expect(first).toMatchObject({ status: 'pending', submission: { request: { operation: 'add', a: 2, b: 3 }, nextOperation: 'multiply' } });
    // Deliberately not 5: this proves the reducer trusts the API, not local arithmetic.
    const waiting = calculatorReducer(first, { type: 'resolved', id: 1, result: 37 });
    expect(waiting).toEqual({ status: 'operatorSelected', left: 37, operation: 'multiply', nextRequestId: 2 });
    expect(sequence([digit('4'), equals], waiting)).toMatchObject({
      status: 'pending', submission: { id: 2, request: { operation: 'multiply', a: 37, b: 4 }, nextOperation: null },
    });
  });
});

describe('results', () => {
  it('keeps the completed expression and full result precision', () => {
    const state = completed(0.30000000000000004);
    expect(state).toMatchObject({ status: 'result', value: 0.30000000000000004, request: { operation: 'add', a: 2, b: 3 } });
    expect(sequence([operator('subtract'), digit('1'), equals], state)).toMatchObject({
      submission: { request: { operation: 'subtract', a: 0.30000000000000004, b: 1 } },
    });
  });

  it.each([
    { action: digit('4'), entry: '4' },
    { action: decimal, entry: '0.' },
    { action: sign, entry: '-12.5' },
  ])('starts a fresh operand with $action.type', ({ action, entry }) => {
    expect(calculatorReducer(completed(12.5), action)).toEqual({ status: 'firstEntry', entry, nextRequestId: 2 });
  });

  it('sign-toggles a negative result by editing text', () => {
    expect(sequence([sign], completed(-12.5))).toMatchObject({ status: 'firstEntry', entry: '12.5' });
  });

  it.each([1e21, 5e-324, 1.7976931348623157e308])('reuses scientific result %s unchanged', (value) => {
    expect(sequence([operator('add'), digit('1'), equals], completed(value))).toMatchObject({ submission: { request: { a: value } } });
  });

  it('does not corrupt an exponent after sign toggle', () => {
    const state = sequence([sign], completed(1e21));
    expect(state).toMatchObject({ entry: '-1e+21' });
    expect(calculatorReducer(state, backspace)).toEqual(state);
    expect(sequence([sign], state)).toMatchObject({ entry: '1e+21' });
    expect(sequence([digit('7')], state)).toMatchObject({ entry: '7' });
    expect(sequence([decimal], state)).toMatchObject({ entry: '0.' });
    expect(sequence([operator('add'), digit('1'), equals], state)).toMatchObject({ submission: { request: { a: -1e21 } } });
  });
});

describe('pending and response identity', () => {
  it.each([digit('1'), decimal, sign, backspace, operator('subtract'), equals])('blocks $type while pending', (action) => {
    const state = pending();
    expect(calculatorReducer(state, action)).toBe(state);
  });

  it('ignores responses after Clear and while a newer request is pending', () => {
    const old = pending();
    const cleared = calculatorReducer(old, clear);
    const late: CalculatorAction[] = [
      { type: 'resolved', id: old.submission.id, result: 99 },
      { type: 'rejected', id: old.submission.id, message: 'Old error' },
    ];
    expect(sequence(late, cleared)).toBe(cleared);
    const newer = sequence([digit('6'), operator('add'), digit('7'), equals], cleared);
    expect(newer).toMatchObject({ status: 'pending', submission: { id: 2 } });
    expect(sequence(late, newer)).toBe(newer);
    const result = calculatorReducer(newer, { type: 'resolved', id: 2, result: 13 });
    expect(result).toMatchObject({ status: 'result', value: 13 });
    expect(calculatorReducer(result, { type: 'resolved', id: 2, result: 88 })).toBe(result);
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite response %s', (result) => {
    expect(calculatorReducer(pending(), { type: 'resolved', id: 1, result })).toMatchObject({
      status: 'error', message: 'The server returned an invalid result.',
    });
  });

  it('is deterministic and does not mutate an input state or action', () => {
    const state = pending();
    Object.freeze(state.submission.request);
    Object.freeze(state.submission);
    Object.freeze(state);
    const before = structuredClone(state);
    const action = Object.freeze({ type: 'resolved' as const, id: 1, result: 5 });
    expect(calculatorReducer(state, action)).toEqual(calculatorReducer(state, action));
    expect(state).toEqual(before);
  });
});

describe('error recovery and Clear', () => {
  it('preserves the failed pair and retries with a new ID', () => {
    const state = failed(sequence([digit('8'), operator('divide'), digit('0'), equals]));
    expect(state).toMatchObject({ message: 'Could not reach the server.', submission: { request: { operation: 'divide', a: 8, b: 0 } } });
    const retry = calculatorReducer(state, equals);
    expect(retry).toMatchObject({ status: 'pending', submission: { id: 2, request: state.submission.request } });
    expect(calculatorReducer(retry, { type: 'rejected', id: 1, message: 'Late failure' })).toBe(retry);
    expect(calculatorReducer(retry, { type: 'resolved', id: 2, result: 42 })).toMatchObject({ status: 'result', value: 42 });
  });

  it.each([
    { action: digit('7'), entry: '7' },
    { action: decimal, entry: '0.' },
    { action: sign, entry: '-3' },
    { action: backspace, entry: '0' },
  ])('resumes second operand entry with $action.type', ({ action, entry }) => {
    expect(calculatorReducer(failed(), action)).toEqual({
      status: 'secondEntry', left: 2, operation: 'divide', entry, nextRequestId: 2,
    });
  });

  it('keeps the original right-entry text when editing a failed request', () => {
    const state = failed(sequence([digit('1'), operator('divide'), digit('3'), decimal, digit('0'), equals]));
    expect(calculatorReducer(state, backspace)).toMatchObject({ entry: '3.' });
  });

  it('replaces the failed operator without submitting or losing the right operand', () => {
    const edited = calculatorReducer(failed(), operator('multiply'));
    expect(edited).toMatchObject({ status: 'secondEntry', operation: 'multiply', entry: '3', nextRequestId: 2 });
    expect(calculatorReducer(edited, equals)).toMatchObject({ submission: { request: { operation: 'multiply', a: 2, b: 3 } } });
  });

  it('retains a chain on retry but discards its continuation when edited', () => {
    const state = failed(sequence([digit('2'), operator('add'), digit('3'), operator('multiply')]));
    expect(calculatorReducer(state, equals)).toMatchObject({ submission: { nextOperation: 'multiply' } });
    expect(sequence([digit('7'), equals], state)).toMatchObject({ submission: { request: { a: 2, b: 7 }, nextOperation: null } });
    expect(sequence([operator('divide'), equals], state)).toMatchObject({ submission: { request: { operation: 'divide' }, nextOperation: null } });
  });

  it.each([
    initialState,
    sequence([digit('5'), operator('add')]),
    sequence([digit('5'), operator('add'), digit('2')]),
    pending(), completed(5), failed(),
  ])('clears $status while preserving the request counter', (state) => {
    expect(calculatorReducer(state, clear)).toEqual({ status: 'firstEntry', entry: '0', nextRequestId: state.nextRequestId });
  });
});
