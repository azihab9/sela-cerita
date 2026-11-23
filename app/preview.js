(()=> {
 const root=document.getElementById("preview-root");
 if(!window.supabase||!window.SELA_SUPABASE_CONFIG){
  root.innerHTML='<div class="error"><span>♡</span><h2>Preview belum siap</h2><p>Layanan preview belum berhasil dimuat. Muat ulang halaman beberapa saat lagi.</p><a href="dashboard.html">Kembali ke dashboard</a></div>';return;
 }
 const cfg=window.SELA_SUPABASE_CONFIG;
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 const id=new URLSearchParams(location.search).get("id");
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const palettes={peach:"#f0d3c5",lavender:"#e3d7e9",rose:"#f0cbd0"};
 const dateText=value=>value?new Date(value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"OUR SPECIAL DAY";
 function fail(message){
  root.innerHTML='<div class="error"><span>♡</span><h2>Preview belum bisa dibuka</h2><p>'+esc(message)+'</p><a href="dashboard.html">Kembali ke dashboard</a></div>';
 }
 function galleryMarkup(urls,style){
  if(!urls.length)return "";
  return '<div class="gallery '+style+'">'+urls.map((url,index)=>'<button type="button" class="gallery-item" data-photo="'+index+'" aria-label="Lihat foto '+(index+1)+'"><img src="'+esc(url)+'" alt="Foto kenangan '+(index+1)+'"></button>').join("")+'</div>';
 }
 function bloomMarkup(data,urls,accent){
  return '<article class="invitation bloom" style="--accent:'+accent+'">'+
   '<section class="bloom-cover"><div class="bloom-flower">✿</div><p class="eyebrow">A LITTLE NOTE FOR YOU</p><span class="cover-overline">OUR STORY · OUR LITTLE UNIVERSE</span><h1>'+esc(data.title)+'</h1><p class="couple">'+esc(data.first)+' <i>&</i> '+esc(data.second)+'</p><span class="ornament-line"></span><p class="cover-message">'+esc(data.story||"Setiap cerita indah dimulai dari hal sederhana...")+'</p><p class="cover-date">'+esc(data.date)+'</p><span class="scroll-hint">SCROLL TO EXPLORE ↓</span></section>'+
   '<section class="bloom-note"><p class="eyebrow">A NOTE FROM US</p><h2>Our little <em>story.</em></h2><p>'+esc(data.story||"Ada banyak hal kecil yang membuat cerita ini berarti.")+'</p>'+galleryMarkup(urls,"bloom-gallery")+'<div class="bloom-signature">'+esc(data.first)+' & '+esc(data.second)+' <span>♡</span></div></section></article>';
 }
 function chapterMarkup(data,urls,accent){
  return '<article class="invitation chapter" style="--accent:'+accent+'">'+
   '<section class="chapter-cover"><div class="chapter-meta"><span>SELA CERITA / VOL. 01</span><span>THE STORY OF US</span></div><div class="chapter-index">01</div><p class="eyebrow">A NEW CHAPTER BEGINS</p><h1>'+esc(data.title)+'</h1><div class="chapter-rule"></div><p class="chapter-couple">'+esc(data.first)+' <span>×</span> '+esc(data.second)+'</p><p class="chapter-date">'+esc(data.date)+'</p><p class="chapter-intro">'+esc(data.story||"Setiap cerita punya awal. Ini halaman pertama dari banyak hal yang masih ingin kita tulis bersama.")+'</p><span class="chapter-turn">KEEP READING ↓</span></section>'+
   '<section class="chapter-body"><div class="chapter-side-note">A STORY<br>IN THE MAKING</div><div class="chapter-main"><p class="eyebrow">THE FIRST PAGES</p><h2>It all started <em>somewhere.</em></h2><p>'+esc(data.story||"Ada pertemuan, percakapan, dan momen kecil yang perlahan menjadi cerita besar.")+'</p>'+galleryMarkup(urls,"chapter-gallery")+'<div class="chapter-end"><span>END OF THIS PAGE</span><b>TO BE CONTINUED…</b></div></div></section></article>';
 }
 function playdateMarkup(data,urls,accent){
  return '<article class="invitation playdate" style="--accent:'+accent+'">'+
   '<section class="play-cover"><span class="sticker sticker-one">✳ GOOD VIBES</span><span class="sticker sticker-two">EST. '+esc(data.date.split(" ").pop()||"2026")+'</span><p class="eyebrow">OUR FAVORITE KIND OF CHAOS</p><h1>'+esc(data.title)+'</h1><div class="play-names">'+esc(data.first)+' <span>+</span> '+esc(data.second)+'</div><p class="play-message">'+esc(data.story||"Foto blur, tawa terlalu keras, dan rencana spontan. Hal-hal kecil yang justru bikin hari terasa besar.")+'</p><div class="play-date">'+esc(data.date)+'</div><span class="play-arrow">LET’S REPLAY THIS DAY ↓</span></section>'+
   '<section class="play-memories"><div class="play-section-head"><span>THE GOOD STUFF</span><h2>Little moments,<br><em>big memories.</em></h2></div>'+galleryMarkup(urls,"play-gallery")+'<div class="play-footer">MADE OF LAUGHTER & LOVE <span>✳</span></div></section></article>';
 }
 async function init(){
  if(!id){fail("Project tidak ditemukan.");return;}
  const {data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError||!session){location.replace("auth.html");return;}
  const {data:project,error}=await db.from("projects").select("*").eq("id",id).single();
  if(error||!project){fail("Pastikan kamu masuk dengan akun pemilik cerita.");return;}
  const content=project.content||{},names=content.names||{};
  const template=String(project.template_id||"bloom").toLowerCase();
  const data={
   title:content.heroTitle||"To my favorite person. ♡",
   first:names.first||"Nama pertama",
   second:names.second||"Nama kedua",
   story:content.story||"",
   date:dateText(content.eventDate)
  };
  const accent=palettes[content.appearance?.accent]||palettes.peach;
  const urls=[];
  for(const item of content.gallery||[]){
   if(!item.path)continue;
   const {data:photo}=await db.storage.from("project-photos").createSignedUrl(item.path,3600);
   if(photo?.signedUrl)urls.push(photo.signedUrl);
  }
  const render=template==="chapter"?chapterMarkup:template==="playdate"?playdateMarkup:bloomMarkup;
  root.innerHTML=render(data,urls,accent)+
   '<p class="footer">SELA CERITA STUDIO <span>·</span> EVERY MOMENT HAS A STORY</p>'+
   '<div class="lightbox" id="lightbox" aria-hidden="true"><button type="button" aria-label="Tutup">×</button><img alt="Foto kenangan"></div>';
  root.querySelectorAll("[data-photo]").forEach(button=>button.addEventListener("click",()=>{
   const box=document.getElementById("lightbox"),image=box.querySelector("img");
   image.src=urls[Number(button.dataset.photo)]||"";box.classList.add("open");box.setAttribute("aria-hidden","false");
  }));
  const box=document.getElementById("lightbox"),image=box.querySelector("img");
  function close(){box.classList.remove("open");box.setAttribute("aria-hidden","true");image.src="";}
  box.querySelector("button").addEventListener("click",close);
  box.addEventListener("click",event=>{if(event.target===box)close();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")close();});
  document.title=(project.title||"Cerita istimewa")+" — Sela Cerita";
 }
 const previewTimeout=setTimeout(()=>fail("Pemuatan terlalu lama. Periksa koneksi lalu coba muat ulang. Jika masih gagal, kirim pesan error dari halaman ini."),15000);
 init().then(()=>clearTimeout(previewTimeout)).catch(error=>{
  clearTimeout(previewTimeout);
  console.error("Sela Cerita preview error:",error);
  fail(error?.message||"Terjadi kendala saat memuat data cerita. Coba muat ulang halaman.");
 });
})();