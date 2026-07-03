// Menu mobile fullscreen condiviso tra tutte le pagine
document.addEventListener('DOMContentLoaded', function(){
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if(!toggle || !links) return;

  function setOpen(isOpen){
    links.classList.toggle('open', isOpen);
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggle.addEventListener('click', function(){
    setOpen(!links.classList.contains('open'));
  });
  links.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=> setOpen(false));
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') setOpen(false);
  });
});
