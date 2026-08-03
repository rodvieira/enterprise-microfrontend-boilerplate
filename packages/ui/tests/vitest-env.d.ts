/// <reference types="@testing-library/jest-dom" />

// Registers the jest-dom matchers (toHaveFocus, toBeInTheDocument, …) for the
// type-checker. Scoped to this package's tests on purpose: the shared React
// tsconfig must not force every consuming app to install testing libraries.
