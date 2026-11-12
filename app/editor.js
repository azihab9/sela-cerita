(() => {
 const cfg=window.SELA_SUPABASE_CONFIG||{};
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 const params=new URLSearchParams(location.search),projectId=params.get("id");
 const form=document.querySelector("#story-form"),status=document.querySelector("#save-status"),saveButton=document.querySelector("#save-button");
 const fields={title:document.querySelector("#project-title"),one:document.querySelector("#name-one"),two:document.querySelector("#name-two"),date:document.querySelector("#event-date"),hero:document.querySelector("#hero-title"),story:document.querySelector("#story-text"),accent:document.querySelector("#accent")};
 const photoInput=document.querySelector("#photo-input"),photoGrid=document.querySelector("#photo-grid"),photoCount=document.querySelector("#photo-count");
 let project=null,saveTimer=null,photos=[],uploading=false;
 const $=id=>document.getElementById(id);
 const palettes={peach:"#f0d3c5",lavender:"#e3d7e9",rose:"#f0cbd0"};
 const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function updatePreview(){
  $("preview-heading").innerHTML=escapeHtml(fields.hero.value||"To my favorite person. ♡").replace(/favorite/gi,"<i>favorite</i>");
  $("preview-names").textContent=[fields.one.value,fields.two.value].filter(Boolean).join(" & ")||"Nama kamu & Nama pasangan";
  $("preview-story").textContent=fields.story.value||"Setiap cerita indah dimulai dari hal sederhana...";
  $("preview-date").textContent=fields.date.value?new Date(fields.date.value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}).toUpperCase():"OUR SPECIAL DAY";
  $("preview-page").style.background=palettes[fields.accent.value]||palettes.peach;
  $("preview-template").textContent=(project?.template_id||"bloom").toUpperCase();
  $("preview-gallery").innerHTML=photos.map(p=>'<img src="'+escapeHtml(p.url)+'" alt="Foto kenangan">').join("");
 }
 function collect(){return {names:{first:fields.one.value.trim(),second:fields.two.value.trim()},eventDate:fields.date.value,heroTitle:fields.hero.value.trim(),story:fields.story.value,appearance:{accent:fields.accent.value},gallery:photos.map(p=>({path:p.path}))};}
 function fill(content){const c=content||{};fields.one.value=c.names?.first||"";fields.two.value=c.names?.second||"";fields.date.value=c.eventDate||"";fields.hero.value=c.heroTitle||"";fields.story.value=c.story||"";fields.accent.value=c.appearance?.accent||"peach";}
 async function refreshPhotoUrls(){
  for(const p of photos){if(p.file){p.url=URL.createObjectURL(p.file);continue;}const {data,error}=await db.storage.from("project-photos").createSignedUrl(p.path,3600);p.url=error?"":data.signedUrl;}
  renderPhotos();updatePreview();
 }
 function renderPhotos(){
  photoCount.textContent=photos.length+"/5";
  photoGrid.innerHTML=photos.map((p,i)=>'<div class="photo-thumb"><img data-preview-photo="'+i+'" src="'+escapeHtml(p.url||"")+'" alt="Foto '+(i+1)+'"><div class="photo-controls"><button type="button" data-move-photo="'+i+'" data-dir="-1" aria-label="Geser ke kiri" '+(i===0?"disabled":"")+'>←</button><button type="button" data-move-photo="'+i+'" data-dir="1" aria-label="Geser ke kanan" '+(i===photos.length-1?"disabled":"")+'>→</button></div><button class="remove-photo" type="button" data-remove-photo="'+i+'" aria-label="Hapus foto">×</button></div>').join("")||'<span class="photo-empty">Belum ada foto yang ditambahkan.</span>';
  photoGrid.querySelectorAll("[data-remove-photo]").forEach(b=>b.addEventListener("click",()=>removePhoto(Number(b.dataset.removePhoto))));
  photoGrid.querySelectorAll("[data-move-photo]").forEach(b=>b.addEventListener("click",()=>movePhoto(Number(b.dataset.movePhoto),Number(b.dataset.dir))));
  photoGrid.querySelectorAll("[data-preview-photo]").forEach(img=>img.addEventListener("click",()=>openLightbox(photos[Number(img.dataset.previewPhoto)]?.url)));
 }
 function movePhoto(index,direction){
  const next=index+direction;if(next<0||next>=photos.length)return;
  [photos[index],photos[next]]=[photos[next],photos[index]];
  renderPhotos();updatePreview();scheduleSave();
 }
 function openLightbox(url){
  if(!url)return;
  $("lightbox-image").src=url;$("photo-lightbox").classList.add("open");$("photo-lightbox").setAttribute("aria-hidden","false");
 }
 function closeLightbox(){
  $("photo-lightbox").classList.remove("open");$("photo-lightbox").setAttribute("aria-hidden","true");$("lightbox-image").src="";
 }
 async function removePhoto(index){
  const p=photos[index];if(!p)return;
  if(p.path){const {error}=await db.storage.from("project-photos").remove([p.path]);if(error){alert("Foto gagal dihapus: "+error.message);return;}}
  if(p.file&&p.url)URL.revokeObjectURL(p.url);
  photos.splice(index,1);renderPhotos();updatePreview();scheduleSave();
 }
 async function uploadFiles(files){
  const selected=[...files];if(!selected.length)return;
  if(photos.length+selected.length>5){alert("Maksimal 5 foto per project.");photoInput.value="";return;}
  const allowed=["image/jpeg","image/png","image/webp"];
  for(const file of selected){if(!allowed.includes(file.type)){alert("Gunakan foto JPG, PNG, atau WEBP.");photoInput.value="";return;}if(file.size>8*1024*1024){alert("Ukuran setiap foto maksimal 8 MB.");photoInput.value="";return;}}
  uploading=true;status.textContent="Mengunggah foto...";
  for(const file of selected){
   const safeName=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
   const path=sessionUser.id+"/"+project.id+"/"+crypto.randomUUID()+"-"+safeName;
   const {error}=await db.storage.from("project-photos").upload(path,file,{contentType:file.type,upsert:false});
   if(error){alert("Foto gagal diunggah: "+error.message);continue;}
   photos.push({path});
  }
  photoInput.value="";await refreshPhotoUrls();uploading=false;status.textContent="Foto siap disimpan";scheduleSave();
 }
 async function save(){
  if(!project||uploading)return;saveButton.disabled=true;status.textContent="Menyimpan...";
  const {error}=await db.from("projects").update({title:fields.title.value.trim()||"Cerita Baru",content:collect(),updated_at:new Date().toISOString()}).eq("id",project.id);
  saveButton.disabled=false;
  if(error){status.textContent="Gagal menyimpan";alert("Perubahan belum tersimpan: "+error.message);return;}
  project.content=collect();project.title=fields.title.value.trim()||"Cerita Baru";status.textContent="Tersimpan ✓";
 }
 function scheduleSave(){status.textContent="Ada perubahan...";clearTimeout(saveTimer);saveTimer=setTimeout(save,1200);}
 let sessionUser=null;
 async function init(){
  const {data:{session}}=await db.auth.getSession();if(!session){location.replace("auth.html");return;}sessionUser=session.user;
  if(!projectId){location.replace("dashboard.html#projects");return;}
  const {data,error}=await db.from("projects").select("*").eq("id",projectId).single();
  if(error||!data){document.querySelector(".editor-layout").innerHTML="<div style='padding:50px;font-family:Arial'><h2>Project tidak ditemukan</h2><p>Pastikan kamu masuk dengan akun pemilik project.</p><a href='dashboard.html'>Kembali ke dashboard</a></div>";return;}
  project=data;fields.title.value=data.title||"";const previewLink=$("open-full-preview");previewLink.href=(data.template_id==="bloom"?"../demos/bloom.html?id=":"preview.html?id=")+encodeURIComponent(project.id);previewLink.addEventListener("click",async e=>{e.preventDefault();clearTimeout(saveTimer);await save();if(status.textContent==="Tersimpan ✓")location.href=previewLink.href;});const names={bloom:"BLOOM",chapter:"CHAPTER",playdate:"PLAYDATE"};$("template-label").textContent=names[data.template_id]||data.template_id.toUpperCase();
  fill(data.content);photos=(data.content?.gallery||[]).filter(p=>p.path).map(p=>({path:p.path}));
  await refreshPhotoUrls();form.querySelectorAll("input:not([type=file]),textarea,select").forEach(el=>el.addEventListener("input",()=>{updatePreview();scheduleSave();}));
  photoInput.addEventListener("change",()=>uploadFiles(photoInput.files));
  $("lightbox-close").addEventListener("click",closeLightbox);$("photo-lightbox").addEventListener("click",e=>{if(e.target.id==="photo-lightbox")closeLightbox();});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLightbox();});$("preview-gallery").addEventListener("click",e=>{if(e.target.tagName==="IMG")openLightbox(e.target.src);});
  $("preview-reset").addEventListener("click",()=>{if(confirm("Reset preview ke isi tersimpan terakhir?")){fill(project.content);fields.title.value=project.title;photos=(project.content?.gallery||[]).filter(p=>p.path).map(p=>({path:p.path}));refreshPhotoUrls();}});
  form.addEventListener("submit",e=>{e.preventDefault();clearTimeout(saveTimer);save();});
  saveButton.addEventListener("click",save);db.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT")location.replace("auth.html");});
 }
 init();
})();