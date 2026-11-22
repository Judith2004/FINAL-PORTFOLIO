const $=s=>document.querySelector(s);
$("#yr").textContent=new Date().getFullYear();

// Owner mode: open the site with #admin once to unlock the upload box in this browser (#lock turns it off)
function ownerMode(){
  try{
    if(location.hash==="#admin"){localStorage.setItem("owner","1");location.hash="certificates"}
    if(location.hash==="#lock"){localStorage.removeItem("owner");location.hash="certificates"}
    document.documentElement.classList.toggle("admin",localStorage.getItem("owner")==="1");
  }catch{}
}
ownerMode();addEventListener("hashchange",ownerMode);

// Typing roles
const roles=["BSIT student","web developer in the making","problem solver","lifelong learner"];
let r=0,c=0,del=false;const el=$("#typed"),still=matchMedia("(prefers-reduced-motion:reduce)").matches;
function tick(){
  const w=roles[r];
  if(still){el.textContent=roles[0];return;}
  c+=del?-1:1;el.textContent=w.slice(0,c);
  let t=del?40:85;
  if(!del&&c===w.length){del=true;t=1400}else if(del&&c===0){del=false;r=(r+1)%roles.length;t=300}
  setTimeout(tick,t);
}
tick();

// Browser storage (IndexedDB) for the photo and uploaded certificates
const DB=new Promise((res,rej)=>{
  const q=indexedDB.open("judith-portfolio",1);
  q.onupgradeneeded=()=>{q.result.createObjectStore("certs",{keyPath:"id"});q.result.createObjectStore("misc")};
  q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);
});
const tx=async(store,mode,fn)=>{const db=await DB;return new Promise((res,rej)=>{const t=db.transaction(store,mode),rq=fn(t.objectStore(store));t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error)})};

// Profile photo
async function loadPhoto(){
  try{const b=await tx("misc","readonly",s=>s.get("photo"));
    if(b){const p=$("#photo");p.style.backgroundImage=`url(${URL.createObjectURL(b)})`;p.querySelector("span").hidden=true}}catch{}
}
$("#photoIn").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f||!f.type.startsWith("image/"))return;
  try{await tx("misc","readwrite",s=>s.put(f,"photo"));loadPhoto()}catch{}
});
loadPhoto();

// Certificates
const gallery=$("#gallery"),msg=$("#certMsg");
function card(c,isPublic){
  const d=document.createElement("div");d.className="cert";
  const url=c.file||URL.createObjectURL(c.blob),isPdf=c.file?c.file.toLowerCase().endsWith(".pdf"):c.type==="application/pdf";
  const b=document.createElement("button");b.className="thumb";b.type="button";b.setAttribute("aria-label","Open "+c.title);
  if(isPdf&&!c.thumb)b.textContent="PDF";else{const i=document.createElement("img");i.src=c.thumb||url;i.alt=c.title;i.onerror=()=>{b.replaceChildren();b.textContent=isPdf?"PDF":"Image"};b.append(i)}
  b.onclick=()=>openModal(url,isPdf);
  const m=document.createElement("div");m.className="meta";
  const t=document.createElement("span");t.textContent=c.title;m.append(t);
  if(!isPublic){const x=document.createElement("button");x.className="del";x.type="button";x.textContent="Remove";
    x.onclick=async()=>{if(confirm("Remove this certificate?")){await tx("certs","readwrite",s=>s.delete(c.id));render()}};m.append(x)}
  d.append(b,m);return d;
}
async function render(){
  gallery.replaceChildren();
  let mine=[];try{mine=await tx("certs","readonly",s=>s.getAll())||[]}catch{}
  mine.sort((a,b)=>b.date-a.date);
  (typeof PUBLIC_CERTIFICATES!=="undefined"?PUBLIC_CERTIFICATES:[]).forEach(c=>gallery.append(card(c,true)));
  mine.forEach(c=>gallery.append(card(c,false)));
  $("#empty").hidden=gallery.children.length>0;
}
async function addFiles(files){
  const title=$("#certTitle").value.trim();let n=0,bad=0;
  for(const f of files){
    if(!(f.type.startsWith("image/")||f.type==="application/pdf")||f.size>10*1024*1024){bad++;continue}
    const name=title||f.name.replace(/\.[^.]+$/,"");
    try{await tx("certs","readwrite",s=>s.put({id:crypto.randomUUID(),title:name,type:f.type,blob:f,date:Date.now()}));n++}catch{bad++}
  }
  msg.textContent=n?`${n} certificate${n>1?"s":""} added.`:"";
  if(bad)msg.textContent+=` ${bad} file${bad>1?"s were":" was"} skipped. Use images or PDFs under 10 MB.`;
  $("#certTitle").value="";render();
}
$("#certIn").addEventListener("change",e=>{addFiles([...e.target.files]);e.target.value=""});
const drop=$("#drop");
["dragenter","dragover"].forEach(v=>drop.addEventListener(v,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(v=>drop.addEventListener(v,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>addFiles([...e.dataTransfer.files]));
drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("#certIn").click()}});
$("#certForm").addEventListener("submit",e=>e.preventDefault());
render();

// Viewer
const modal=$("#modal"),body=$("#modalBody");
function openModal(url,pdf){
  body.replaceChildren();
  if(pdf){const f=document.createElement("iframe");f.src=url;f.title="Certificate";body.append(f)}
  else{const i=document.createElement("img");i.src=url;i.alt="Certificate";body.append(i)}
  modal.hidden=false;$("#closeM").focus();
}
const closeModal=()=>{modal.hidden=true;body.replaceChildren()};
$("#closeM").onclick=closeModal;
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)closeModal()});

// Contact form (opens the visitor's email app)
const EMAIL="judithbarrera0828@gmail.com";
$("#cf").addEventListener("submit",e=>{
  e.preventDefault();
  const n=$("#name").value.trim(),m=$("#email").value.trim(),t=$("#msg").value.trim(),s=$("#status");
  if(!n||!/^\S+@\S+\.\S+$/.test(m)||!t){s.textContent="Please enter your name, a valid email and a message.";return}
  location.href=`mailto:${EMAIL}?subject=${encodeURIComponent("Portfolio message from "+n)}&body=${encodeURIComponent(t+"\n\nFrom: "+n+" <"+m+">")}`;
  s.textContent="Opening your email app…";
});

// Hero: the sun sinks toward the sea as you scroll
const hero=$(".hero");
if(!matchMedia("(prefers-reduced-motion:reduce)").matches){
  let tk=false;
  addEventListener("scroll",()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{
    hero.style.setProperty("--p",Math.min(1,Math.max(0,scrollY/hero.offsetHeight)).toFixed(3));tk=false})},{passive:true});
}

// Hero: skill stickers drift gently with the mouse
if(!matchMedia("(prefers-reduced-motion:reduce)").matches&&matchMedia("(hover:hover)").matches){
  hero.addEventListener("pointermove",e=>{const r=hero.getBoundingClientRect();
    hero.style.setProperty("--mx",((e.clientX-r.left)/r.width*2-1).toFixed(2));
    hero.style.setProperty("--my",((e.clientY-r.top)/r.height*2-1).toFixed(2))});
}

// Touch screens: boxes lift for a moment when tapped
document.querySelectorAll(".skills>div,.facts li,.card").forEach(b=>{
  b.addEventListener("pointerdown",()=>{b.classList.add("lift");setTimeout(()=>b.classList.remove("lift"),700)},{passive:true});
});

// Journey: yellow + buttons open one detail at a time
const jItems=[...document.querySelectorAll(".timeline li")];
function setOpen(li,open){
  li.classList.toggle("open",open);
  li.querySelector(".jbtn").setAttribute("aria-expanded",open);
  const t=li.querySelector(".jtext");open?t.removeAttribute("inert"):t.setAttribute("inert","");
}
jItems.forEach(li=>{
  setOpen(li,false);
  li.querySelector(".jbtn").addEventListener("click",()=>{
    const willOpen=!li.classList.contains("open");
    jItems.forEach(o=>setOpen(o,false));
    setOpen(li,willOpen);
  });
});

// Hero: real water ripples (WebGL). The hero background is drawn on a canvas and the
// water bends it like glass. If WebGL is not available, the normal hero is kept.
(()=>{
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const cv=document.querySelector(".ripples");if(!cv)return;
  const gl=cv.getContext("webgl",{antialias:false,alpha:false})||cv.getContext("experimental-webgl");
  if(!gl){cv.remove();return}

  const VS="attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  const FS=`precision mediump float;
    uniform sampler2D uBg,uH;uniform vec2 uT;varying vec2 v;
    void main(){
      float l=texture2D(uH,v-vec2(uT.x,0.)).r,r=texture2D(uH,v+vec2(uT.x,0.)).r;
      float u=texture2D(uH,v-vec2(0.,uT.y)).r,d=texture2D(uH,v+vec2(0.,uT.y)).r;
      vec2 g=vec2(l-r,u-d)*6.;                              /* slope of the water */
      vec3 c=texture2D(uBg,v+g*.03).rgb;                    /* background seen through the water */
      vec3 n=normalize(vec3(g*3.,1.));
      float s=pow(max(dot(n,normalize(vec3(-.35,-.5,.8))),0.),40.);
      c*=.9+.1*n.z;                                         /* soft shading */
      gl_FragColor=vec4(c+vec3(s)*.8,1.);                   /* sparkle */
    }`;
  function shader(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}
  const pr=gl.createProgram();
  gl.attachShader(pr,shader(gl.VERTEX_SHADER,VS));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){cv.remove();return}
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  function texture(unit){
    const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
    [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]]
      .forEach(([k,val])=>gl.texParameteri(gl.TEXTURE_2D,k,val));
    return t;
  }
  texture(0);texture(1);
  gl.uniform1i(gl.getUniformLocation(pr,"uBg"),0);gl.uniform1i(gl.getUniformLocation(pr,"uH"),1);
  const uT=gl.getUniformLocation(pr,"uT");
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);

  // ---- the hero background (sky, sun, sea lines) painted on a small canvas
  const bg=document.createElement("canvas"),x=bg.getContext("2d");
  let CW=0,CH=0;
  const progress=()=>Math.min(1,Math.max(0,scrollY/hero.offsetHeight));
  function paintBg(){
    x.setTransform(.5,0,0,.5,0,0);
    const dark=matchMedia("(prefers-color-scheme:dark)").matches;
    const g=x.createLinearGradient(0,0,0,CH);
    (dark?[[0,"#08161F"],[.5,"#0B2B3A"],[.85,"#124A55"],[1,"#1A6A70"]]
         :[[0,"#0A2430"],[.45,"#0B3C49"],[.8,"#17717A"],[1,"#6FBDB4"]]).forEach(([o,c])=>g.addColorStop(o,c));
    x.fillStyle=g;x.fillRect(0,0,CW,CH);
    const mob=innerWidth<=800,sz=mob?.75*innerWidth:Math.min(.34*innerWidth,340);
    const cx=(mob?CW*1.2:CW*.98)-sz/2,cy=CH+170-sz/2+progress()*220;
    const glow=x.createRadialGradient(cx,cy,sz*.4,cx,cy,sz*.95);
    glow.addColorStop(0,"rgba(255,170,70,.45)");glow.addColorStop(1,"rgba(255,170,70,0)");
    x.fillStyle=glow;x.fillRect(0,0,CW,CH);
    const sun=x.createLinearGradient(0,cy-sz/2,0,cy+sz/2);
    sun.addColorStop(0,"#FFD470");sun.addColorStop(.45,"#FFB627");sun.addColorStop(1,"#FF8A4A");
    x.fillStyle=sun;x.beginPath();x.arc(cx,cy,sz/2,0,6.2832);x.fill();
    x.lineWidth=1.3;                                         // sea shimmer lines, so the bending is easy to see
    for(let y=CH*.3;y<CH;y+=13){
      x.strokeStyle=`rgba(255,255,255,${.03+.08*(y-CH*.3)/(CH*.7)})`;x.beginPath();
      for(let X=0;X<=CW;X+=12)x.lineTo(X,y+Math.sin(X/38+y*.7)*2.5);
      x.stroke();
    }
    gl.activeTexture(gl.TEXTURE0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bg);
  }
  const draw=()=>{gl.viewport(0,0,cv.width,cv.height);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)};

  // ---- the water: a small wave simulation (S pixels per cell)
  const S=4;let w,h,a,b,hm,raf=0,idle=0,lx=-99,ly=-99;
  function upload(){gl.activeTexture(gl.TEXTURE1);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,w,h,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,hm)}
  function resize(){
    CW=hero.clientWidth;CH=hero.clientHeight;const dpr=Math.min(devicePixelRatio||1,1.5);
    cv.width=Math.round(CW*dpr);cv.height=Math.round(CH*dpr);
    bg.width=Math.ceil(CW/2);bg.height=Math.ceil(CH/2);
    w=Math.ceil(CW/S);h=Math.ceil(CH/S);
    a=new Float32Array(w*h);b=new Float32Array(w*h);hm=new Uint8Array(w*h).fill(128);
    gl.uniform2f(uT,1/w,1/h);upload();paintBg();draw();
  }
  resize();new ResizeObserver(resize).observe(hero);

  function splash(px,py,r,s){                                // push the water down around the point
    const cx=Math.round(px/S),cy=Math.round(py/S);
    for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){
      const d=i*i+j*j,X=cx+i,Y=cy+j;
      if(d>r*r||X<1||Y<1||X>=w-1||Y>=h-1)continue;
      a[Y*w+X]-=s*(1-Math.sqrt(d)/r);
    }
    idle=0;if(!raf)raf=requestAnimationFrame(step);
  }
  function step(){
    for(let y=1;y<h-1;y++){let i=y*w+1;
      for(let X=1;X<w-1;X++,i++)b[i]=((a[i-1]+a[i+1]+a[i-w]+a[i+w])/2-b[i])*0.985;   // 0.985 = how fast waves fade
    }
    const t=a;a=b;b=t;
    for(let i=0;i<a.length;i++){const v=128+a[i]*.8;hm[i]=v<0?0:v>255?255:v}
    upload();draw();
    raf=++idle<280?requestAnimationFrame(step):0;
    if(!raf){a.fill(0);b.fill(0);hm.fill(128);upload();draw()}
  }
  hero.addEventListener("pointermove",e=>{
    const r=hero.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
    if(Math.hypot(px-lx,py-ly)>12){splash(px,py,2,120);lx=px;ly=py}
  });
  hero.addEventListener("pointerdown",e=>{
    const r=hero.getBoundingClientRect();splash(e.clientX-r.left,e.clientY-r.top,4,320);
  });
  // keep the painted sun in step with scrolling and light/dark mode
  let sk=false;
  addEventListener("scroll",()=>{if(sk)return;sk=true;requestAnimationFrame(()=>{paintBg();if(!raf)draw();sk=false})},{passive:true});
  matchMedia("(prefers-color-scheme:dark)").addEventListener("change",()=>{paintBg();draw()});
})();