/**
 * Same async boundary as apps/shell/src/index.tsx: Module Federation must
 * resolve shared singletons (react, react-dom, @enterprise-mfe/auth,
 * react-router) before any application code runs.
 */
import('./bootstrap');
