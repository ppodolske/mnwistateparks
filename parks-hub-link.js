(()=>{
  function add(){
    const nav=document.querySelector('.site-header nav');if(!nav||nav.querySelector('[data-preston-home]'))return;
    const a=document.createElement('a');a.href='https://preston.run';a.textContent='Preston.run';a.dataset.prestonHome='true';a.className='preston-home-link';nav.appendChild(a);
    if(!document.getElementById('preston-home-link-style')){const s=document.createElement('style');s.id='preston-home-link-style';s.textContent='.site-header nav .preston-home-link{border-left:1px solid var(--line);padding-left:18px;color:var(--blue);font-weight:800}@media(max-width:850px){.site-header nav .preston-home-link{padding-left:9px}}';document.head.appendChild(s)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();
