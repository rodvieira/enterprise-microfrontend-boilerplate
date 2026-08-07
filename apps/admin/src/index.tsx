/**
 * Same async boundary as every other app's index.tsx: Module Federation
 * must resolve shared singletons before any application code runs.
 */
import('./bootstrap');
