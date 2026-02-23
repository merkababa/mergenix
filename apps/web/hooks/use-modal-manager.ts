/**
 * Re-export from the canonical store location.
 * The modal manager has been moved to lib/stores/modal-manager-store.ts
 * to align with the stores/ convention. This file is kept for backward
 * compatibility with existing imports and test mocks.
 */
export { useModalManager } from "@/lib/stores/modal-manager-store";
