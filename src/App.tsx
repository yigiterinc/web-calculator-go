import { useEffect, useReducer, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { calculate } from './api';
import { calculatorReducer, initialState } from './calculator';
import type { CalculatorAction, CalculatorState, Digit, Operation } from './calculator';
import './styles.css';

const symbols: Record<Operation, string> = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
const keys: { label: string; name: string; action: CalculatorAction; kind?: string }[] = [
  { label: 'AC', name: 'All clear', action: { type: 'clear' }, kind: 'utility' },
  { label: '±', name: 'Toggle sign', action: { type: 'toggleSign' }, kind: 'utility' },
  { label: '⌫', name: 'Backspace', action: { type: 'backspace' }, kind: 'utility' },
  { label: '÷', name: 'Divide', action: { type: 'operator', operation: 'divide' }, kind: 'operator' },
  ...(['7', '8', '9'] as const).map(digitKey),
  { label: '×', name: 'Multiply', action: { type: 'operator', operation: 'multiply' }, kind: 'operator' },
  ...(['4', '5', '6'] as const).map(digitKey),
  { label: '−', name: 'Subtract', action: { type: 'operator', operation: 'subtract' }, kind: 'operator' },
  ...(['1', '2', '3'] as const).map(digitKey),
  { label: '+', name: 'Add', action: { type: 'operator', operation: 'add' }, kind: 'operator' },
  { ...digitKey('0'), kind: 'zero' },
  { label: '.', name: 'Decimal point', action: { type: 'decimal' } },
  { label: '=', name: 'Equals', action: { type: 'equals' }, kind: 'equals' },
];

function digitKey(digit: Digit) {
  return { label: digit, name: digit, action: { type: 'digit' as const, digit } };
}

function display(state: CalculatorState): { value: string; expression: string } {
  switch (state.status) {
    case 'firstEntry': return { value: state.entry, expression: '' };
    case 'operatorSelected': return { value: String(state.left), expression: `${state.left} ${symbols[state.operation]}` };
    case 'secondEntry': return { value: state.entry, expression: `${state.left} ${symbols[state.operation]} ${state.entry}` };
    case 'result': return {
      value: String(state.value),
      expression: `${state.request.a} ${symbols[state.request.operation]} ${state.request.b} =`,
    };
    case 'pending':
    case 'error': {
      const { request, rightEntry } = state.submission;
      return { value: rightEntry, expression: `${request.a} ${symbols[request.operation]} ${rightEntry} =` };
    }
  }
}

export default function App() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const panel = useRef<HTMLElement>(null);
  const submission = state.status === 'pending' ? state.submission : null;

  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    if (!submission) return;
    const controller = new AbortController();
    void calculate(submission.request, controller.signal).then(
      result => {
        if (!controller.signal.aborted) dispatch({ type: 'resolved', id: submission.id, result });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) dispatch({
          type: 'rejected', id: submission.id,
          message: error instanceof Error ? error.message : 'The calculation could not be completed. Please try again.',
        });
      },
    );
    // Clear, a completed request, or unmount invalidates this effect's response.
    return () => controller.abort();
  }, [submission]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, a, summary, [contenteditable="true"]')) return;
    // Enter/Space on a button belongs to its native click behavior.
    if (event.key === 'Enter' && target instanceof HTMLElement && target.closest('button')) return;

    let action: CalculatorAction | undefined;
    if (/^[0-9]$/.test(event.key)) action = { type: 'digit', digit: event.key as Digit };
    else {
      switch (event.key) {
        case '.': action = { type: 'decimal' }; break;
        case '+': action = { type: 'operator', operation: 'add' }; break;
        case '-': action = { type: 'operator', operation: 'subtract' }; break;
        case '*': action = { type: 'operator', operation: 'multiply' }; break;
        case '/': action = { type: 'operator', operation: 'divide' }; break;
        case '=':
        case 'Enter': action = { type: 'equals' }; break;
        case 'Backspace': action = { type: 'backspace' }; break;
        case 'Escape':
        case 'Delete': action = { type: 'clear' }; break;
        case 'F9': action = { type: 'toggleSign' }; break;
      }
    }
    if (action) {
      event.preventDefault();
      dispatch(action);
    }
  }

  const { value, expression } = display(state);
  const pending = state.status === 'pending';
  const selected = state.status === 'operatorSelected' || state.status === 'secondEntry' ? state.operation : null;

  return (
    <main className="page">
      <div className="workspace">
        <header className="page-header">
          <span className="wordmark">sezzle<span className="wordmark-dot">.</span></span>
          <span className="eyebrow">Everyday essentials</span>
        </header>
        <h1>Calculator</h1>
        <p className="intro">A clear space for everyday numbers.</p>

        <section ref={panel} className="calculator" aria-label="Calculator" aria-describedby="keyboard-hint" tabIndex={0} onKeyDown={onKeyDown}>
          <div className={`display${state.status === 'error' ? ' display-error' : ''}`}>
            <div className="display-heading">
              <span>{state.status === 'result' ? 'Result' : 'Calculation'}</span>
              <span className="display-indicator" aria-hidden="true" />
            </div>
            <div className="expression" aria-label="Expression">{expression || '\u00a0'}</div>
            <output className={`number${value.length > 12 ? ' number-long' : ''}`} aria-label="Result" aria-live="polite" aria-atomic="true">{value}</output>
            <div className="feedback">
              {state.status === 'error' ? (
                <p role="alert">{state.message} <span>Press = to retry, or edit your numbers.</span></p>
              ) : (
                <p role="status">{pending ? 'Calculating…' : state.status === 'result' ? 'Ready for what’s next' : '\u00a0'}</p>
              )}
            </div>
          </div>

          <div className="keypad" aria-label="Calculator keys">
            {keys.map(key => {
              const unavailable = pending && key.action.type !== 'clear';
              return (
                <button key={key.name} type="button"
                  className={`key ${key.kind ?? ''}`}
                  aria-label={key.name}
                  aria-disabled={unavailable}
                  aria-pressed={key.action.type === 'operator' ? selected === key.action.operation : undefined}
                  onClick={() => { if (!unavailable) dispatch(key.action); }}>
                  {key.label}
                </button>
              );
            })}
          </div>
        </section>

        <p id="keyboard-hint" className="keyboard-hint">Made for your keyboard, too.</p>
        <details className="shortcuts">
          <summary>Keyboard shortcuts</summary>
          <p>Use 0–9, decimal point, +, −, * and /. Enter or = calculates; Backspace edits; Escape or Delete clears; F9 changes the sign.</p>
          <p>Tab moves between buttons. Enter and Space activate a focused button. Shortcuts work while focus is inside the calculator.</p>
        </details>
      </div>
    </main>
  );
}
