// Browsers happily render a .json response inline, and the download attribute
// alone doesn't always stop them. Fetch the file and hand it over as a blob so
// the flow files always land on disk with the right filename.
document.addEventListener('click', async e => {
  const a = e.target.closest('a[download][href$=".json"]');
  if(!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const name = a.getAttribute('href').split('/').pop();
  try{
    const res = await fetch(a.href);
    if(!res.ok) throw new Error(res.status);
    const url = URL.createObjectURL(await res.blob());
    const tmp = Object.assign(document.createElement('a'), { href:url, download:name });
    document.body.appendChild(tmp); tmp.click(); tmp.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }catch(err){
    window.location.href = a.href;   // fall back to the plain link
  }
});
