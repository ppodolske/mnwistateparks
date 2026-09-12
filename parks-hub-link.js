(()=>{
  function add(){
    const headerLink=document.querySelector('.site-header nav [data-preston-home]');
    if(headerLink)headerLink.remove();
    const footer=document.querySelector('.site-footer');
    if(!footer||footer.querySelector('[data-preston-home]'))return;
    const wrap=document.createElement('div');
    wrap.className='preston-footer-home';
    wrap.innerHTML='<a href="https://preston.run" data-preston-home="true">Preston.run ↗</a>';
    footer.appendChild(wrap);
    if(!document.getElementById('preston-home-link-style')){
      const s=document.createElement('style');
      s.id='preston-home-link-style';
      s.textContent='.preston-footer-home{width:100%;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.18);font-size:10px;letter-spacing:.08em;text-transform:uppercase}.preston-footer-home a{color:inherit;text-decoration:none;opacity:.72;font-weight:700}.preston-footer-home a:hover{opacity:1;text-decoration:underline}@media print{.preston-footer-home{display:none!important}}';
      document.head.appendChild(s);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();
