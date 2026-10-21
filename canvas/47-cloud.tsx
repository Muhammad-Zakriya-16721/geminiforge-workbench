// #region 5f. CLOUD SYNC (stub for the Canvas build: Canvas has no Supabase client, so the Sync tab is hidden)
export const CLOUD_AVAILABLE = false;
export const mergeStates = null;
export const supabase = null;
export async function syncNow(): Promise<void> { /* no cloud in Canvas */ }
export async function cloudSignOut(): Promise<void> { /* no cloud in Canvas */ }
export async function cloudSignIn(_e: string, _p: string): Promise<string> { return "Sync is not set up in this build."; }
export function CloudPanel() { return null; }
// #endregion
