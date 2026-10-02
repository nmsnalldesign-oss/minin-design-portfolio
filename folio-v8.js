(() => {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 document.querySelectorAll('.folio-gallery').forEach(g=>{
  const strip=g.querySelector('.folio-strip');
  const move=d=>strip.scrollBy({left:(strip.querySelector('.folio-slide').getBoundingClientRect().width+28)*d,behavior:reduce?'instant':'smooth'});
  g.querySelector('.folio-prev').addEventListener('click',()=>move(-1));g.querySelector('.folio-next').addEventListener('click',()=>move(1));
  strip.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
 });
 const dialog=document.querySelector('.folio-viewer');if(!dialog)return;
 const data=JSON.parse(dialog.querySelector('.folio-data').textContent),page=dialog.querySelector('.folio-page'),rail=dialog.querySelector('.folio-thumbs');
 let index=0,serial=0,origin=null,touch=null;
 const back=dialog.querySelector('.folio-back'),forward=dialog.querySelector('.folio-forward'),counter=dialog.querySelector('.folio-count');
 const thumbs=data.map((item,i)=>{const b=document.createElement('button');b.className='folio-thumb';b.setAttribute('aria-label',`Работа ${i+1}: ${item.alt}`);const img=document.createElement('img');img.src=item.src;img.alt='';img.loading='lazy';b.append(img);b.addEventListener('click',()=>show(i));rail.append(b);return b;});
 function show(n,animate=true){
  index=Math.max(0,Math.min(data.length-1,n));const request=++serial,item=data[index];const img=new Image();
  img.onload=()=>{if(request!==serial)return;page.src=item.src;page.alt=item.alt;if(!reduce&&animate)page.animate([{opacity:.15,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:350,easing:'cubic-bezier(.16,1,.3,1)'});};img.src=item.src;
  counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(data.length).padStart(2,'0')}`;
  thumbs.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));thumbs[index].scrollIntoView({block:'nearest',inline:'nearest',behavior:reduce?'instant':'smooth'});
  back.disabled=index===0;forward.disabled=index===data.length-1;
  if(index+1<data.length)new Image().src=data[index+1].src;
 }
 document.querySelectorAll('.folio-open').forEach(b=>b.addEventListener('click',()=>{origin=b;dialog.showModal();show(0,false);}));
 dialog.querySelector('.folio-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>origin?.focus({preventScroll:true}));
 back.addEventListener('click',()=>show(index-1));forward.addEventListener('click',()=>show(index+1));
 dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?data.length-1:index+(e.key==='ArrowRight'?1:-1));}});
 const stage=dialog.querySelector('.folio-viewer-stage');stage.addEventListener('touchstart',e=>{touch=e.touches[0].clientX;},{passive:true});stage.addEventListener('touchend',e=>{if(touch!==null){const dx=e.changedTouches[0].clientX-touch;if(Math.abs(dx)>55)show(index+(dx<0?1:-1));}touch=null;},{passive:true});
})();
