(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const ease = 'cubic-bezier(.16,1,.3,1)';
  const progress = document.querySelector('.progress');
  const overlay = document.querySelector('.transition-surface');
  let navigating = false;

  // The dense brandbook pages need one large, readable stage.
  if (document.body.classList.contains('eywa-case')) {
    const rules = document.querySelector('img[src="/assets/eywa-10.webp"]')?.closest('.case-gallery');
    if (rules) {
      rules.classList.add('rules-gallery');
      const section = document.createElement('section');
      section.className = 'rules-section';
      const intro = rules.previousElementSibling;
      intro.before(section); section.append(intro, rules);
      const sourceFigures = [...rules.querySelectorAll('.figure')];
      const figures = [sourceFigures[3],sourceFigures[0],sourceFigures[1],sourceFigures[2]];
      figures.forEach(figure=>rules.append(figure));
      const titles = ['Типографика', 'Логотип', 'Паттерн', 'Цвет'];
      const pages = [13, 10, 14, 12];
      const toolbar = document.createElement('div'); toolbar.className = 'rules-toolbar';
      toolbar.innerHTML = '<div class="rules-tabs" role="tablist" aria-label="Визуальные правила EYWA"></div><span class="rules-count" aria-live="polite">01 / 04</span>';
      rules.prepend(toolbar);
      const tablist = toolbar.firstElementChild;
      const buttons = figures.map((figure, i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.id = `rule-tab-${i}`; button.role = 'tab';
        button.textContent = titles[i]; button.setAttribute('aria-controls', `rule-panel-${i}`);
        tablist.append(button);
        figure.id = `rule-panel-${i}`; figure.setAttribute('role', 'tabpanel');
        figure.setAttribute('aria-labelledby', button.id);
        const media = figure.querySelector('img');
        media.src = `/assets/eywa/page-${pages[i]}.webp`;
        figure.querySelector('[data-zoom]').dataset.zoom = media.src;
        button.addEventListener('click', () => selectRule(i));
        button.addEventListener('keydown', e => {
          let to = i;
          if (e.key === 'ArrowRight') to = (i + 1) % figures.length;
          else if (e.key === 'ArrowLeft') to = (i + figures.length - 1) % figures.length;
          else if (e.key === 'Home') to = 0;
          else if (e.key === 'End') to = figures.length - 1;
          else return;
          e.preventDefault(); selectRule(to); buttons[to].focus();
        });
        return button;
      });
      function selectRule(index) {
        figures.forEach((figure, i) => {
          figure.hidden = i !== index;
          buttons[i].setAttribute('aria-selected', String(i === index));
          buttons[i].tabIndex = i === index ? 0 : -1;
        });
        toolbar.lastElementChild.textContent = `0${index + 1} / 04`;
        if (!reduced) figures[index].animate([{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}], {duration:450,easing:ease});
      }
      selectRule(0);
    }
  }

  const observer = new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.remove('pending');e.target.classList.add('is-visible');observer.unobserve(e.target)}
  }),{threshold:.06,rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.reveal,.case-intro,.case-facts,.case-text,.case-block>.eyebrow,.case-block>.quote,.result,.next-project').forEach(el=>{
    if(reduced)return;
    // Case text is revealed and tracked by motion-v16; media keeps the existing observer.
    if(document.querySelector('.case-header')&&!el.matches('.figure,.case-hero'))return;
    el.classList.add('reveal','pending');observer.observe(el);
  });

  const filters=[...document.querySelectorAll('.filter')];
  const cards=[...document.querySelectorAll('.project-card')];
  function filter(category,write=true){
    if(!filters.some(b=>b.dataset.filter===category))category='all';
    filters.forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    let index=0;cards.forEach(card=>{const visible=category==='all'||card.dataset.category===category;card.hidden=!visible;if(visible){card.style.setProperty('--stagger',innerWidth>600&&index%2?`${Math.min(165,innerWidth*.1)}px`:'0px');if(write&&!reduced)card.animate([{opacity:0},{opacity:1}],{duration:380,easing:ease});index++}});
    if(write){const url=new URL(location);category==='all'?url.searchParams.delete('category'):url.searchParams.set('category',category);history.replaceState(null,'',url)}
  }
  filters.forEach(b=>b.addEventListener('click',()=>filter(b.dataset.filter)));
  if(filters.length)filter(new URLSearchParams(location.search).get('category')||'all',false);

  const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');
  function closeMenu(){nav.classList.remove('open');menu?.setAttribute('aria-expanded','false');if(menu)menu.textContent='Меню'}
  menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Закрыть':'Меню'});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  const dialog=document.querySelector('.lightbox');
  document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{const img=dialog.querySelector('img');img.src=button.dataset.zoom;img.alt=button.querySelector('img').alt;dialog.showModal();hideCursor()}));
  dialog?.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});

  let cursor,arrow,raf=0,last=0,inside=false,x=0,y=0,cx=0,cy=0;
  let mode='default',stretch=0,angle=0;
  const motionCards=[];
  const lines=[];
  function hideCursor(){inside=false;cursor?.classList.remove('show');arrow?.classList.remove('show')}
  function refreshMode(target){
    if(!cursor)return;
    mode=target?.closest('[data-cursor]')?'case':target?.closest('a,button')?'link':'default';
    cursor.dataset.mode=mode;arrow.classList.toggle('show',mode==='case'&&inside);
  }
  function wake(){if(!raf)raf=requestAnimationFrame(tick)}
  function tick(time){
    raf=0;const dt=Math.min(32,time-(last||time-16.67))/16.67;last=time;
    const dx=x-cx,dy=y-cy;const follow=1-Math.pow(.81,dt);cx+=dx*follow;cy+=dy*follow;
    const speed=Math.hypot(dx,dy);if(speed>1)angle=Math.atan2(dy,dx)*180/Math.PI;stretch+=(Math.min(.115,speed*.00085)-stretch)*(1-Math.pow(.65,dt));
    if(cursor)cursor.firstElementChild.style.transform=`rotate(${angle}deg) scale(${1+stretch},${1/(1+stretch)})`;
    if(cursor){cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;arrow.style.transform=`translate3d(${cx}px,${cy}px,0)`}
    let moving=Math.abs(cx-x)+Math.abs(cy-y)>.05||stretch>.0001;
    motionCards.forEach(m=>{
      for(let i=0;i<2;i++){m.v[i]=(m.v[i]+(m.target[i]-m.p[i])*.065*dt)*Math.pow(.77,dt);m.p[i]+=m.v[i]*dt}
      const stretch=clamp((Math.abs(m.v[0])+Math.abs(m.v[1]))*.0007,0,.005);
      m.el.style.transform=`translate3d(${m.p[0]}px,${m.p[1]}px,0) rotateX(${-m.p[1]*.1}deg) rotateY(${m.p[0]*.1}deg) scale(${1+stretch},${1-stretch})`;
      moving ||= Math.abs(m.target[0]-m.p[0])+Math.abs(m.target[1]-m.p[1])+Math.abs(m.v[0])+Math.abs(m.v[1])>.03;
    });
    lines.forEach(l=>{
      l.velocity=(l.velocity+(l.target-l.value)*.085*dt)*Math.pow(.78,dt);l.value+=l.velocity*dt;
      l.path.setAttribute('d',`M0 33 Q${l.point.toFixed(2)} ${(33+l.value).toFixed(3)} 1000 33`);
      moving ||= Math.abs(l.value-l.target)+Math.abs(l.velocity)>.025;
    });
    if(moving)wake();else last=0;
  }
  if(fine&&!reduced){
    cursor=document.createElement('div');cursor.className='motion-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<div class="inertia"><div class="disc"></div></div>';document.body.append(cursor);
    arrow=document.createElement('div');arrow.className='motion-arrow';arrow.setAttribute('aria-hidden','true');arrow.innerHTML="<svg class=\"icon-arrow\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M5 19 19 5M5 5h14v14\"/></svg>";document.body.append(arrow);
    document.querySelectorAll('.project-media,.figure > button,.case-hero').forEach(el=>{const shell=el.parentElement;const m={el,shell,p:[0,0],v:[0,0],target:[0,0],rect:null};motionCards.push(m);shell.addEventListener('pointerenter',()=>{m.rect=shell.getBoundingClientRect()});shell.addEventListener('pointermove',e=>{const b=m.rect||shell.getBoundingClientRect();m.target=[clamp((e.clientX-b.left-b.width/2)/b.width*13,-6.5,6.5),clamp((e.clientY-b.top-b.height/2)/b.height*13,-6.5,6.5)];wake()});shell.addEventListener('pointerleave',()=>{m.target=[0,0];wake()})});
    document.querySelectorAll('.elastic').forEach(el=>lines.push({el,path:el.querySelector('path'),target:0,value:0,velocity:0,point:500}));
    window.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch'||dialog?.open)return;
      x=e.clientX;y=e.clientY;
      if(!inside){cx=x;cy=y;inside=true;document.body.classList.add('cursor-enabled');cursor.style.transform=`translate3d(${x}px,${y}px,0)`;cursor.classList.add('show')}
      refreshMode(e.target);
      lines.forEach(l=>{const b=l.el.getBoundingClientRect(),distance=y-(b.top+b.height/2);const near=x>=b.left&&x<=b.right&&Math.abs(distance)<32;if(Math.abs(distance)>.7)l.side=Math.sign(distance);l.target=near?-(l.side||1)*38*Math.pow(1-Math.abs(distance)/32,2):0;if(near)l.point=clamp((x-b.left)/b.width*1000,10,990)});
      wake();
    },{passive:true});
    document.documentElement.addEventListener('pointerleave',()=>{hideCursor();motionCards.forEach(m=>m.target=[0,0]);lines.forEach(l=>l.target=0);wake()});
    window.addEventListener('blur',hideCursor);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)hideCursor()});
  }
  function onScroll(){
    const total=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${total>0?scrollY/total:0})`;
    if(inside)refreshMode(document.elementFromPoint(x,y));
    motionCards.forEach(m=>{m.rect=null;m.target=[0,0]});lines.forEach(l=>l.target=0);if(cursor)wake();
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  window.addEventListener('resize',()=>{if(filters.length)filter(document.querySelector('.filter.active')?.dataset.filter||'all',false);motionCards.forEach(m=>{m.rect=null;m.target=[0,0]});if(cursor)wake()},{passive:true});

})();
