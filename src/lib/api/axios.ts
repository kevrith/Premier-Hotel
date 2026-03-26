/**
 * axios.ts — compatibility re-export
 *
 * All modules that do `import api from './axios'` now get the single
 * offline-aware apiClient from client.ts instead of a bare axios instance.
 * This means their mutations are automatically queued when offline and
 * their GETs are served from the IndexedDB cache when offline.
 */
import apiClient from './client';

export default apiClient;
