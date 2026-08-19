/**
 * The dynamic import below creates an async boundary. Module Federation must
 * resolve shared singletons (react, react-dom, react-router) before any
 * application code runs, and an eager import here
 * would run before that resolution completes — the "Shared module is not
 * available for eager consumption" failure. `bootstrap.tsx` is where the
 * actual application starts.
 */
import('./bootstrap');
