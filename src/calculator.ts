export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type CalculationRequest = Readonly<{
  operation: Operation;
  a: number;
  b: number;
}>;

type Submission = Readonly<{
  id: number;
  request: CalculationRequest;
  rightEntry: string;
  nextOperation: Operation | null;
}>;

type Phase =
  | Readonly<{ status: 'firstEntry'; entry: string }>
  | Readonly<{ status: 'operatorSelected'; left: number; operation: Operation }>
  | Readonly<{ status: 'secondEntry'; left: number; operation: Operation; entry: string }>
  | Readonly<{ status: 'pending'; submission: Submission }>
  | Readonly<{ status: 'result'; value: number; request: CalculationRequest }>
  | Readonly<{ status: 'error'; submission: Submission; message: string }>;

export type CalculatorState = Phase & Readonly<{ nextRequestId: number }>;

type EditAction =
  | Readonly<{ type: 'digit'; digit: Digit }>
  | Readonly<{ type: 'decimal' }>
  | Readonly<{ type: 'toggleSign' }>
  | Readonly<{ type: 'backspace' }>;

export type CalculatorAction =
  | EditAction
  | Readonly<{ type: 'operator'; operation: Operation }>
  | Readonly<{ type: 'equals' }>
  | Readonly<{ type: 'clear' }>
  | Readonly<{ type: 'resolved'; id: number; result: number }>
  // The future API adapter supplies safe, user-facing messages, never raw bodies.
  | Readonly<{ type: 'rejected'; id: number; message: string }>;

export const initialState: CalculatorState = {
  status: 'firstEntry',
  entry: '0',
  nextRequestId: 1,
};

function edit(entry: string, action: EditAction): string {
  const scientific = /e/i.test(entry);
  switch (action.type) {
    case 'digit': {
      const base = scientific ? '0' : entry;
      const candidate = /^-?0$/.test(base)
        ? `${base.startsWith('-') ? '-' : ''}${action.digit}`
        : base + action.digit;
      // Ignore a digit that would make the operand unrepresentable by float64.
      return Number.isFinite(Number(candidate)) ? candidate : entry;
    }
    case 'decimal':
      return scientific ? '0.' : entry.includes('.') ? entry : `${entry}.`;
    case 'toggleSign':
      return entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
    case 'backspace': {
      if (scientific) return entry;
      const shortened = entry.slice(0, -1);
      return shortened === '' || shortened === '-' ? '0' : shortened;
    }
  }
}

function submit(
  state: CalculatorState,
  request: CalculationRequest,
  rightEntry: string,
  nextOperation: Operation | null,
): CalculatorState {
  return {
    status: 'pending',
    // Only request bookkeeping uses a numeric increment; answers come from Go.
    nextRequestId: state.nextRequestId + 1,
    submission: { id: state.nextRequestId, request, rightEntry, nextOperation },
  };
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  const nextRequestId = state.nextRequestId;

  if (action.type === 'clear') {
    // Do not reset the counter: an old response must never match a new request.
    return { status: 'firstEntry', entry: '0', nextRequestId };
  }

  if (action.type === 'resolved' || action.type === 'rejected') {
    if (state.status !== 'pending' || action.id !== state.submission.id) return state;
    if (action.type === 'rejected') {
      return { status: 'error', submission: state.submission, message: action.message, nextRequestId };
    }
    if (!Number.isFinite(action.result)) {
      return {
        status: 'error', submission: state.submission,
        message: 'The server returned an invalid result.', nextRequestId,
      };
    }
    if (state.submission.nextOperation !== null) {
      return {
        status: 'operatorSelected', left: action.result,
        operation: state.submission.nextOperation, nextRequestId,
      };
    }
    return { status: 'result', value: action.result, request: state.submission.request, nextRequestId };
  }

  if (state.status === 'pending') return state;

  if (action.type === 'equals') {
    if (state.status === 'secondEntry') {
      return submit(state, { operation: state.operation, a: state.left, b: Number(state.entry) }, state.entry, null);
    }
    if (state.status === 'error') {
      const { request, rightEntry, nextOperation } = state.submission;
      return submit(state, request, rightEntry, nextOperation);
    }
    return state;
  }

  if (action.type === 'operator') {
    switch (state.status) {
      case 'firstEntry':
        return { status: 'operatorSelected', left: Number(state.entry), operation: action.operation, nextRequestId };
      case 'operatorSelected':
        return { ...state, operation: action.operation };
      case 'secondEntry':
        return submit(state, { operation: state.operation, a: state.left, b: Number(state.entry) }, state.entry, action.operation);
      case 'result':
        return { status: 'operatorSelected', left: state.value, operation: action.operation, nextRequestId };
      case 'error':
        return {
          status: 'secondEntry', left: state.submission.request.a,
          operation: action.operation, entry: state.submission.rightEntry, nextRequestId,
        };
    }
  }

  switch (state.status) {
    case 'firstEntry':
    case 'secondEntry':
      return { ...state, entry: edit(state.entry, action) };
    case 'operatorSelected':
      if (action.type === 'backspace') return state;
      return {
        status: 'secondEntry', left: state.left, operation: state.operation,
        entry: edit('0', action), nextRequestId,
      };
    case 'result':
      if (action.type === 'backspace') return state;
      return {
        status: 'firstEntry', nextRequestId,
        entry: edit(action.type === 'toggleSign' ? String(state.value) : '0', action),
      };
    case 'error':
      return {
        status: 'secondEntry', left: state.submission.request.a,
        operation: state.submission.request.operation, nextRequestId,
        entry: edit(
          action.type === 'digit' || action.type === 'decimal' ? '0' : state.submission.rightEntry,
          action,
        ),
      };
  }
}
