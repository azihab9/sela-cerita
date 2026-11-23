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
 function safeAudioUrl(value){
  try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:"";}catch{return "";}
 }
 function commonSections(data){
  const date=data.eventDate?new Date(data.eventDate+"T00:00:00"):null;
  const dateLabel=date?dateText(data.eventDate):"Tanggal menyusul";
  const mapsQuery=[data.venueName,data.venueAddress].filter(Boolean).join(" ");
  const mapsUrl=mapsQuery?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery):"";
  const hasVenue=Boolean(data.venueName||data.venueAddress);
  const hasRsvp=Boolean(data.rsvpPhone);
  return '<section class="event-details"><div class="event-heading"><p class="eyebrow">SAVE THE DATE</p><h2>The day <em>we celebrate.</em></h2></div>'+
   (date?'<div class="countdown-card" data-countdown="'+esc(data.eventDate)+'"><span class="countdown-label">COUNTING DOWN TO OUR DAY</span><div class="countdown-grid"><div><b data-days>—</b><small>HARI</small></div><div><b data-hours>—</b><small>JAM</small></div><div><b data-minutes>—</b><small>MENIT</small></div><div><b data-seconds>—</b><small>DETIK</small></div></div><p>'+esc(dateLabel)+'</p></div>':'')+
   '<div class="event-info"><div class="event-info-item"><span class="event-icon">◷</span><div><small>TANGGAL & WAKTU</small><b>'+esc(dateLabel)+'</b><p>'+esc(data.eventTime||"Waktu acara akan diumumkan")+'</p></div></div>'+
   (hasVenue?'<div class="event-info-item"><span class="event-icon">⌖</span><div><small>LOKASI ACARA</small><b>'+esc(data.venueName||"Lokasi acara")+'</b><p>'+esc(data.venueAddress||"")+'</p>'+(mapsUrl?'<a class="map-link" target="_blank" rel="noopener noreferrer" href="'+esc(mapsUrl)+'">Buka petunjuk arah ↗</a>':'')+'</div></div>':'')+
   '</div>'+
   (hasRsvp?'<div class="rsvp-card"><p class="eyebrow">KINDLY REPLY</p><h2>Will you <em>join us?</em></h2><p>Konfirmasikan kehadiran kalian melalui WhatsApp.</p><a class="rsvp-button" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(data.rsvpPhone)+'?text='+encodeURIComponent(data.rsvpMessage)+'">Konfirmasi via WhatsApp ↗</a></div>':'')+
   '<div class="closing-card"><span>♡</span><p>'+esc(data.closing)+'</p><b>'+esc(data.first)+' & '+esc(data.second)+'</b></div>'+
   (safeAudioUrl(data.musicUrl)?'<div class="music-card"><span class="eyebrow">A LITTLE SOUNDTRACK</span><p>Putar lagu yang menemani cerita kalian.</p><audio controls preload="none" src="'+esc(safeAudioUrl(data.musicUrl))+'">Browser kamu belum mendukung audio.</audio></div>':'')+
   '</section>';
 }
 function startCountdown(){
  const card=document.querySelector("[data-countdown]");if(!card)return;
  const target=new Date(card.dataset.countdown+"T00:00:00").getTime();
  const update=()=>{
   const remaining=target-Date.now(),value=Math.max(0,remaining);
   const units={days:Math.floor(value/86400000),hours:Math.floor(value%86400000/3600000),minutes:Math.floor(value%3600000/60000),seconds:Math.floor(value%60000/1000)};
   Object.entries(units).forEach(([key,number])=>{const node=card.querySelector("[data-"+key+"]");if(node)node.textContent=String(number).padStart(2,"0");});
   if(remaining<=0)card.querySelector(".countdown-label").textContent="TODAY IS THE DAY";
  };
  update();setInterval(update,1000);
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
   date:dateText(content.eventDate),
   eventDate:content.eventDate||"",
   eventTime:content.eventTime||"",
   venueName:content.venueName||"",
   venueAddress:content.venueAddress||"",
   rsvpPhone:String(content.rsvp?.phone||"").replace(/[^0-9]/g,""),
   rsvpMessage:content.rsvp?.message||"Halo, saya ingin mengonfirmasi kehadiran.",
   closing:content.closingMessage||"Terima kasih telah menjadi bagian dari cerita kami.",
   musicUrl:content.musicUrl||""
  };
  const accent=palettes[content.appearance?.accent]||palettes.peach;
  const urls=[];
  for(const item of content.gallery||[]){
   if(!item.path)continue;
   const {data:photo}=await db.storage.from("project-photos").createSignedUrl(item.path,3600);
   if(photo?.signedUrl)urls.push(photo.signedUrl);
  }
  const render=template==="chapter"?chapterMarkup:template==="playdate"?playdateMarkup:bloomMarkup;
  const common=commonSections(data);
  const invitation=render(data,urls,accent);
  // Keep shared event sections inside the selected template so each theme's CSS applies.
  root.innerHTML=invitation.replace("</article>",common+"</article>")+
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
  startCountdown();
  document.title=(project.title||"Cerita istimewa")+" — Sela Cerita";
 }
 const previewTimeout=setTimeout(()=>fail("Pemuatan terlalu lama. Periksa koneksi lalu coba muat ulang. Jika masih gagal, kirim pesan error dari halaman ini."),15000);
 init().then(()=>clearTimeout(previewTimeout)).catch(error=>{
  clearTimeout(previewTimeout);
  console.error("Sela Cerita preview error:",error);
  fail(error?.message||"Terjadi kendala saat memuat data cerita. Coba muat ulang halaman.");
 });
})();