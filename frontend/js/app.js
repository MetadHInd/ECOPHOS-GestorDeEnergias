document.getElementById('btnHealth').addEventListener('click', async () => {
  const out = document.getElementById('healthBox');
  out.textContent = 'Consultando /api/health...';
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = 'Error: ' + err.message;
  }


  function setActive(pathname){
  const links = document.querySelectorAll('.nav .nav-link');
  links.forEach(a=>{
    const isActive = a.getAttribute('href') === pathname;
    a.classList.toggle('is-active', isActive);
  });
}
window.setActive = setActive;


});
