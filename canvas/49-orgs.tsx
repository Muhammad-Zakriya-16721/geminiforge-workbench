// #region 5k. ORGANIZATIONS AND PROJECTS (stub for the Canvas build: it has no Supabase connection)
function useSpecVisible(): boolean { return true; }
function ProjectSwitcher() { return null; }
// the address without a # opens the organizations page; Canvas has none, so it goes to the start page
export function OrgsView() { useEffect(() => { useStore.getState().go({ kind: "home" }); }, []); return null; }
export function OrgView(_p: { id: string; tab?: string }) { return OrgsView(); }
export function ProjectView() { return null; }
export function JoinView(_p: { token: string }) { return null; }
async function searchPages(_p: string, _q: string): Promise<{ ref: string; title: string }[]> { return []; }
export function ProjectHome() { return null; }
export function NativePages(_p: { projectId: string; canCreate: boolean }) { return null; }
// #endregion
