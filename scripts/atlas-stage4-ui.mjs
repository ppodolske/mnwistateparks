/* Account-panel finishing: owner sharing controls and protected admin link. */
let selected='',sharing=null,waiting=false,message='';
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
function notify(){document.dispatchEvent(new Event('atlas-stage4-refresh'))}
async function run(action){if(waiting)return;waiting=true;notify();try{await action();message='';}catch(e){message=e?.message||'Unable to update sharing'}finally{waiting=false;notify()}}
async function load(api){if(!selected)return;sharing=await api('/api/v1/trips/'+encodeURIComponent(selected)+'/sharing')}
function appendPanel(panel,{profile,cloud,api}){
 if(!profile)return;
 if(profile.admin){const section=make('section','aa-section');section.append(make('h3','','Administration'));
  const a=make('a','aa-admin-link','Open private admin dashboard');a.href='/admin';section.append(a);panel.append(section);
 }
 const own=cloud.filter(t=>t.role==='owner');if(!own.length)return;
 const section=make('section','aa-section');section.append(make('h3','','Manage trip access'));
 section.append(make('p','aa-hint','Only owners can change collaborator roles or revoke invitations.'));
 const select=make('select','aa-select');select.setAttribute('aria-label','Trip to manage');select.append(make('option','','Choose a trip'));
 for(const t of own){const opt=make('option','',t.title);opt.value=t.id;select.append(opt)}
 select.value=own.some(t=>t.id===selected)?selected:'';
 select.onchange=()=>{selected=select.value;sharing=null;message='';notify();if(selected)run(()=>load(api));};section.append(select);
 if(selected){
  const btn=make('button','aa-secondary','Refresh sharing');btn.type='button';btn.disabled=waiting;
  btn.onclick=()=>run(()=>load(api));section.append(btn);
 }
 if(message)section.append(make('p','aa-notice',message));
 if(selected&&sharing){
  const heading=make('h4','aa-subhead',`Collaborators · ${sharing.members.length}`);section.append(heading);
  if(!sharing.members.length)section.append(make('p','aa-hint','No collaborators yet. Use the invitation form above.'));
  for(const member of sharing.members){
   const item=make('div','aa-management-row');item.append(make('span','',member.email));
   const role=make('select','aa-select');role.setAttribute('aria-label','Role for '+member.email);
   for(const r of ['viewer','editor']){const opt=make('option','',r);opt.value=r;role.append(opt)}role.value=member.role;
   role.onchange=()=>run(async()=>{
    await api(`/api/v1/trips/${encodeURIComponent(selected)}/members/${encodeURIComponent(member.uid)}`,{method:'PATCH',body:{role:role.value}});await load(api)
   });item.append(role);
   const remove=make('button','aa-secondary','Remove');remove.type='button';
   remove.onclick=()=>run(async()=>{if(!confirm('Remove '+member.email+' from this trip?'))return;
    await api(`/api/v1/trips/${encodeURIComponent(selected)}/members/${encodeURIComponent(member.uid)}`,{method:'DELETE'});await load(api)
   });item.append(remove);section.append(item);
  }
  section.append(make('h4','aa-subhead',`Pending invitations · ${sharing.invitations.length}`));
  if(!sharing.invitations.length)section.append(make('p','aa-hint','No pending invitations.'));
  for(const invitation of sharing.invitations){
   const item=make('div','aa-management-row');item.append(make('span','',`${invitation.email} · ${invitation.role}`));
   const revoke=make('button','aa-secondary','Revoke');revoke.type='button';
   revoke.onclick=()=>run(async()=>{if(!confirm('Revoke this invitation?'))return;
    await api(`/api/v1/trips/${encodeURIComponent(selected)}/invitations/${encodeURIComponent(invitation.id)}`,{method:'DELETE'});await load(api)
   });item.append(revoke);section.append(item);
  }
 }
 panel.append(section);
}
window.AtlasStage4UI={appendPanel};
document.addEventListener('atlas-account-changed',()=>{selected='';sharing=null;message=''});
notify();
