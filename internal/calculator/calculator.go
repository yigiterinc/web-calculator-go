package calculator

import (
	"errors"
	"math"
)

var (
	// ErrUnsupportedOperation indicates an unrecognized operation name.
	ErrUnsupportedOperation = errors.New("unsupported operation")
	// ErrNonFiniteOperand indicates that an operand is NaN or infinite.
	ErrNonFiniteOperand = errors.New("operands must be finite")
	// ErrDivisionByZero indicates a positive or negative zero divisor.
	ErrDivisionByZero = errors.New("cannot divide by zero")
	// ErrNonFiniteResult indicates that the result is NaN or infinite.
	ErrNonFiniteResult = errors.New("result is not finite")
)

// Calculate applies add, subtract, multiply, or divide to a and b, in that order.
// It checks the operation before operands and returns zero on error.
// Results retain float64 rounding and underflow; zero results are positive zero.
func Calculate(operation string, a, b float64) (float64, error) {
	switch operation {
	case "add", "subtract", "multiply", "divide":
	default:
		return 0, ErrUnsupportedOperation
	}

	if math.IsNaN(a) || math.IsInf(a, 0) || math.IsNaN(b) || math.IsInf(b, 0) {
		return 0, ErrNonFiniteOperand
	}

	var result float64
	switch operation {
	case "add":
		result = a + b
	case "subtract":
		result = a - b
	case "multiply":
		result = a * b
	case "divide":
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		result = a / b
	}

	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, ErrNonFiniteResult
	}
	if result == 0 {
		// Signed zero carries no useful distinction in the calculator display.
		return 0, nil
	}
	return result, nil
}
