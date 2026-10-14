package calculator_test

import (
	"errors"
	"math"
	"testing"

	"sezzle-calculator/internal/calculator"
)

func TestCalculate(t *testing.T) {
	negativeZero := math.Copysign(0, -1)
	tests := []struct {
		name      string
		operation string
		a, b      float64
		want      float64
		wantErr   error
	}{
		{name: "addition", operation: "add", a: 2, b: 3, want: 5},
		{name: "subtraction preserves order", operation: "subtract", a: 2, b: 5, want: -3},
		{name: "multiplication", operation: "multiply", a: 3, b: 4, want: 12},
		{name: "division preserves order", operation: "divide", a: 3, b: 12, want: 0.25},
		{name: "negative addition", operation: "add", a: -2, b: -3, want: -5},
		{name: "subtract negative", operation: "subtract", a: -2, b: -3, want: 1},
		{name: "negative product", operation: "multiply", a: -2, b: 3, want: -6},
		{name: "two negative factors", operation: "multiply", a: -2, b: -3, want: 6},
		{name: "negative dividend", operation: "divide", a: -6, b: 3, want: -2},
		{name: "negative divisor", operation: "divide", a: 6, b: -3, want: -2},
		{name: "two negative division operands", operation: "divide", a: -6, b: -3, want: 2},
		{name: "fractional addition", operation: "add", a: 0.5, b: 0.25, want: 0.75},
		{name: "fractional subtraction", operation: "subtract", a: 0.5, b: 0.25, want: 0.25},
		{name: "fractional product", operation: "multiply", a: 0.5, b: 0.25, want: 0.125},
		{name: "fractional divisor", operation: "divide", a: 0.5, b: 0.25, want: 2},
		{name: "add zero", operation: "add", a: 0, b: 7, want: 7},
		{name: "subtract zero", operation: "subtract", a: 7, b: 0, want: 7},
		{name: "multiply by zero", operation: "multiply", a: -7, b: 0, want: 0},
		{name: "zero dividend", operation: "divide", a: 0, b: -7, want: 0},
		{name: "negative zeros added", operation: "add", a: negativeZero, b: negativeZero, want: 0},
		{name: "negative zero subtraction", operation: "subtract", a: negativeZero, b: 0, want: 0},
		{name: "positive zero divisor", operation: "divide", a: 7, b: 0, wantErr: calculator.ErrDivisionByZero},
		{name: "negative zero divisor", operation: "divide", a: 7, b: negativeZero, wantErr: calculator.ErrDivisionByZero},
		{name: "zero divided by zero", operation: "divide", a: 0, b: 0, wantErr: calculator.ErrDivisionByZero},
		{name: "unknown operation", operation: "power", a: 2, b: 3, wantErr: calculator.ErrUnsupportedOperation},
		{name: "empty operation", operation: "", a: 2, b: 3, wantErr: calculator.ErrUnsupportedOperation},
		{name: "operation is case sensitive", operation: "ADD", a: 2, b: 3, wantErr: calculator.ErrUnsupportedOperation},
		{name: "operation is not trimmed", operation: " add ", a: 2, b: 3, wantErr: calculator.ErrUnsupportedOperation},
		{name: "operation validated first", operation: "power", a: math.NaN(), b: 0, wantErr: calculator.ErrUnsupportedOperation},
		{name: "NaN left operand", operation: "add", a: math.NaN(), b: 1, wantErr: calculator.ErrNonFiniteOperand},
		{name: "NaN right operand", operation: "subtract", a: 1, b: math.NaN(), wantErr: calculator.ErrNonFiniteOperand},
		{name: "positive infinity left", operation: "multiply", a: math.Inf(1), b: 0, wantErr: calculator.ErrNonFiniteOperand},
		{name: "negative infinity left", operation: "divide", a: math.Inf(-1), b: 1, wantErr: calculator.ErrNonFiniteOperand},
		{name: "positive infinity right", operation: "divide", a: 1, b: math.Inf(1), wantErr: calculator.ErrNonFiniteOperand},
		{name: "negative infinity right", operation: "add", a: 1, b: math.Inf(-1), wantErr: calculator.ErrNonFiniteOperand},
		{name: "operands validated before division", operation: "divide", a: math.NaN(), b: 0, wantErr: calculator.ErrNonFiniteOperand},
		{name: "addition overflow", operation: "add", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: calculator.ErrNonFiniteResult},
		{name: "negative addition overflow", operation: "add", a: -math.MaxFloat64, b: -math.MaxFloat64, wantErr: calculator.ErrNonFiniteResult},
		{name: "subtraction overflow", operation: "subtract", a: math.MaxFloat64, b: -math.MaxFloat64, wantErr: calculator.ErrNonFiniteResult},
		{name: "negative subtraction overflow", operation: "subtract", a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: calculator.ErrNonFiniteResult},
		{name: "multiplication overflow", operation: "multiply", a: math.MaxFloat64, b: 2, wantErr: calculator.ErrNonFiniteResult},
		{name: "negative multiplication overflow", operation: "multiply", a: -math.MaxFloat64, b: 2, wantErr: calculator.ErrNonFiniteResult},
		{name: "division overflow", operation: "divide", a: math.MaxFloat64, b: 0.5, wantErr: calculator.ErrNonFiniteResult},
		{name: "negative division overflow", operation: "divide", a: -math.MaxFloat64, b: 0.5, wantErr: calculator.ErrNonFiniteResult},
		{name: "largest finite result", operation: "add", a: math.MaxFloat64, b: 0, want: math.MaxFloat64},
		{name: "large cancellation", operation: "subtract", a: math.MaxFloat64, b: math.MaxFloat64, want: 0},
		{name: "smallest nonzero divisor", operation: "divide", a: math.SmallestNonzeroFloat64, b: math.SmallestNonzeroFloat64, want: 1},
		{name: "subnormal result", operation: "multiply", a: math.SmallestNonzeroFloat64, b: 1, want: math.SmallestNonzeroFloat64},
		{name: "multiplication underflow", operation: "multiply", a: math.SmallestNonzeroFloat64, b: 0.5, want: 0},
		{name: "negative division underflow", operation: "divide", a: -math.SmallestNonzeroFloat64, b: 2, want: 0},
		// These expectations intentionally preserve float64 rounding, not decimal arithmetic.
		{name: "binary rounding", operation: "add", a: 0.1, b: 0.2, want: 0.30000000000000004},
		{name: "repeating fraction", operation: "divide", a: 1, b: 3, want: 0.3333333333333333},
		{name: "integer precision boundary", operation: "add", a: 9007199254740992, b: 1, want: 9007199254740992},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calculator.Calculate(tt.operation, tt.a, tt.b)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("result = %.17g, want %.17g", got, tt.want)
			}
			if got == 0 && math.Signbit(got) {
				t.Error("result is negative zero, want positive zero")
			}
		})
	}
}
