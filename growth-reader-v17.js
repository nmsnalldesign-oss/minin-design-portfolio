(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewer=document.querySelector('.book-viewer'),page=viewer.querySelector('.book-page'),rail=viewer.querySelector('.book-thumbs');
  const prev=viewer.querySelector('.book-prev'),next=viewer.querySelector('.book-next'),counter=viewer.querySelector('.book-counter');
  let deck='main',current=0,origin=null,request=0,touchX=null;
  const total=()=>deck==='main'?14:7;
  const source=i=>deck==='main'?`/assets/growth-${String(i+1).padStart(2,'0')}.webp`:`/assets/growth-start/page-${String(i+1).padStart(2,'0')}.webp`;
  function show(index,animate=true){
    current=Math.max(0,Math.min(total()-1,index));const serial=++request,src=source(current),img=new Image();
    img.onload=()=>{if(serial!==request)return;page.width=img.naturalWidth;page.height=img.naturalHeight;page.src=src;viewer.querySelector('.deck-viewport').scrollTop=0;page.alt=`${deck==='main'?'Основная презентация':'Пакет Старт'} — слайд ${current+1}`;if(animate&&!reduce)page.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.16,1,.3,1)'});};img.src=src;
    counter.textContent=`${String(current+1).padStart(2,'0')} / ${total()}`;
    [...rail.children].forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));
    rail.children[current]?.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduce?'instant':'smooth'});
    prev.disabled=current===0;next.disabled=current===total()-1;
    if(current+1<total())new Image().src=source(current+1);
  }
  function chooseDeck(name){
    deck=name;
    viewer.querySelectorAll('[data-deck]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deck===deck)));
    rail.replaceChildren();
    for(let i=0;i<total();i++){
      const b=document.createElement('button');b.className='book-thumb';b.setAttribute('aria-label',`Слайд ${i+1}`);
      const img=document.createElement('img');img.src=source(i);img.alt='';img.loading='lazy';
      const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');b.append(img,num);b.addEventListener('click',()=>show(i));rail.append(b);
    }
    show(0,false);
  }
  viewer.querySelectorAll('[data-deck]').forEach(b=>b.addEventListener('click',()=>chooseDeck(b.dataset.deck)));
  document.querySelectorAll('.book-open').forEach(b=>b.addEventListener('click',()=>{origin=b;viewer.showModal();chooseDeck(b.dataset.openDeck==='start'?'start':'main');}));
  viewer.querySelector('.book-close').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',()=>origin?.focus({preventScroll:true}));
  prev.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));
  viewer.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?total()-1:current+(e.key==='ArrowRight'?1:-1));}});
  viewer.querySelector('.deck-fit').addEventListener('click',e=>{
    const fit=viewer.classList.toggle('fit-mode');
    e.currentTarget.setAttribute('aria-pressed',String(fit));
    e.currentTarget.textContent=fit?'Читать в одном масштабе':'Вместить целиком';
  });
  const stage=viewer.querySelector('.book-stage');
  stage.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;},{passive:true});
  stage.addEventListener('touchend',e=>{if(touchX!==null){const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>55)show(current+(dx<0?1:-1));}touchX=null;},{passive:true});
})();
