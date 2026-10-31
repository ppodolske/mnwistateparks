// Pure synchronisation rules. Neither transport nor browser storage lives here.
export const serialise = value => JSON.stringify(value);
export function reconcile({local, remote, base, role}) {
  const rh=serialise(remote), lh=local===null?null:serialise(local);
  if(local===null)return {action:'download'};
  if(lh===rh)return {action:'aligned'};
  if(base===undefined||base===null)return {action:'conflict', reason:'unverified local copy'};
  if(lh===base&&rh!==base)return {action:'download'};
  if(rh===base&&lh!==base)return role==='viewer'?{action:'conflict',reason:'viewer cannot publish changes'}:{action:'upload'};
  return {action:'conflict',reason:'both copies changed'};
}
export function collidingLocalId(all, candidate, cloudId, mappings) {
  if(!candidate || typeof candidate!=='string')return true;
  const exists=all.some(t=>t?.id===candidate);
  if(!exists)return false;
  return !Object.values(mappings||{}).some(m=>m.cloudId===cloudId&&m.localId===candidate);
}
export function applyTrip(all, doc) {
  if(!doc || typeof doc!=='object'||!Array.isArray(doc.parks)||typeof doc.id!=='string')throw Error('Invalid cloud trip');
  const i=all.findIndex(t=>t?.id===doc.id);
  const result=all.slice();if(i<0)result.push(doc);else result[i]=doc;return result;
}
export function localSnapshot(data,id){return data.find(t=>t?.id===id)||null}
export function summary(mappings){
  const v=Object.values(mappings||{});
  return {tracked:v.length,conflicts:v.filter(m=>!!m.conflict).length,unsynced:v.filter(m=>m.dirty).length};
}
