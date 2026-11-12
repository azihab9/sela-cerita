(() => {
 const cfg=window.SELA_SUPABASE_CONFIG||{};
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 const params=new URLSearchParams(location.search),projectId=params.get("id");
 const form=document.querySelector("#story-form"),status=document.querySelector("#save-status"),saveButton=document.querySelector("#save-button");
 const fields={title:document.querySelector("#project-title"),one:document.querySelector("#name-one"),two:document.querySelector("#name-two"),date:document.querySelector("#event-date"),hero:document.querySelector("#hero-title"),story:document.querySelector("#story-text"),accent:document.querySelector("#accent")};
 let project=null,saveTimer=null;
 const $=id=>document.getElementById(id);
 const palettes={peach:"#f0d3c5",lavender:"#e3d7e9",rose:"#f0cbd0"};
 function updatePreview(){
  $("preview-heading").textContent=fields.hero.value||"To my favorite person. ♡";
  $("preview-heading").innerHTML=escapeHtml(fields.hero.value||"To my favorite person. ♡").replace(/favorite/gi,"<i>favorite</i>");
  $("preview-names").textContent=[fields.one.value,fields.two.value].filter(Boolean).join(" & ")||"Nama kamu & Nama pasangan";
  $("preview-story").textContent=fields.story.value||"Setiap cerita indah dimulai dari hal sederhana...";
  $("preview-date").textContent=fields.date.value?new Date(fields.date.value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}).toUpperCase():"OUR SPECIAL DAY";
  $("preview-page").style.background=palettes[fields.accent.value]||palettes.peach;
  $("preview-template").textContent=(project?.template_id||"bloom").toUpperCase();
 }
 function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function collect(){return {names:{first:fields.one.value.trim(),second:fields.two.value.trim()},eventDate:fields.date.value,heroTitle:fields.hero.value.trim(),story:fields.story.value,appearance:{accent:fields.accent.value}};}
 function fill(content){const c=content||{};fields.one.value=c.names?.first||"";fields.two.value=c.names?.second||"";fields.date.value=c.eventDate||"";fields.hero.value=c.heroTitle||"";fields.story.value=c.story||"";fields.accent.value=c.appearance?.accent||"peach";updatePreview();}
 async function save(){
  if(!project)return;saveButton.disabled=true;status.textContent="Menyimpan...";
  const {error}=await db.from("projects").update({title:fields.title.value.trim()||"Cerita Baru",content:collect(),updated_at:new Date().toISOString()}).eq("id",project.id);
  saveButton.disabled=false;
  if(error){status.textContent="Gagal menyimpan";alert("Perubahan belum tersimpan: "+error.message);return;}
  status.textContent="Tersimpan ✓";
 }
 function scheduleSave(){status.textContent="Ada perubahan...";clearTimeout(saveTimer);saveTimer=setTimeout(save,1200);}
 async function init(){
  const {data:{session}}=await db.auth.getSession();if(!session){location.replace("auth.html");return;}
  if(!projectId){location.replace("dashboard.html#projects");return;}
  const {data,error}=await db.from("projects").select("*").eq("id",projectId).single();
  if(error||!data){document.querySelector(".editor-layout").innerHTML="<div style='padding:50px;font-family:Arial'><h2>Project tidak ditemukan</h2><p>Pastikan kamu masuk dengan akun pemilik project.</p><a href='dashboard.html'>Kembali ke dashboard</a></div>";return;}
  project=data;$("project-title").value=data.title||"";
  const names={bloom:"BLOOM",chapter:"CHAPTER",playdate:"PLAYDATE"};$("template-label").textContent=names[data.template_id]||data.template_id.toUpperCase();
  fill(data.content);form.querySelectorAll("input,textarea,select").forEach(el=>el.addEventListener("input",()=>{updatePreview();scheduleSave();}));
  $("preview-reset").addEventListener("click",()=>{if(confirm("Reset preview ke isi tersimpan terakhir?")){fill(project.content);fields.title.value=project.title;}});
  form.addEventListener("submit",e=>{e.preventDefault();clearTimeout(saveTimer);save();});
  saveButton.addEventListener("click",save);
  db.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT")location.replace("auth.html");});
 }
 init();
})();