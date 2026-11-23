(() => {
  const cfg=window.SELA_SUPABASE_CONFIG||{};
  const db=window.supabase.createClient(cfg.url,cfg.anonKey);
  const params=new URLSearchParams(location.search),projectId=params.get("id");
  const $=id=>document.getElementById(id);
  const form=$("story-form"),status=$("save-status"),saveButton=$("save-button");
  const fields={title:$("project-title"),one:$("name-one"),two:$("name-two"),date:$("event-date"),time:$("event-time"),venue:$("venue-name"),address:$("venue-address"),rsvpPhone:$("rsvp-phone"),rsvpMessage:$("rsvp-message"),closing:$("closing-message"),music:$("music-url"),hero:$("hero-title"),story:$("story-text"),accent:$("accent")};
  const photoInput=$("photo-input"),photoGrid=$("photo-grid"),photoCount=$("photo-count");
  const palettes={peach:"#d58a70",lavender:"#a18eaf",rose:"#c77f89"};
  const stepCopy=[
    {eyebrow:"STEP 01 / 05",title:"Mulai dari <em>cover.</em>",description:"Tentukan judul dan kalimat pertama yang akan menyambut tamu."},
    {eyebrow:"STEP 02 / 05",title:"Kenalkan <em>kalian.</em>",description:"Nama dan tanggal spesial menjadi bagian yang paling diingat."},
    {eyebrow:"STEP 03 / 05",title:"Ceritakan <em>kisahnya.</em>",description:"Bagikan sedikit perjalanan atau pesan dari hati kalian."},
    {eyebrow:"STEP 04 / 05",title:"Pilih <em>kenangannya.</em>",description:"Tambahkan foto yang membuat cerita ini terasa semakin dekat."},
    {eyebrow:"STEP 05 / 05",title:"Sentuhan <em>terakhir.</em>",description:"Pilih warna yang paling mewakili suasana cerita kalian."}
  ];
  const templateNames={bloom:"BLOOM",chapter:"CHAPTER",playdate:"PLAYDATE"};
  let project=null,sessionUser=null,saveTimer=null,photos=[],uploading=false,currentStep=0,saving=false;
  function setStatus(message,state){
    status.textContent=message;
    status.classList.toggle("saved",state==="saved");
  }
  function safeText(value){return String(value??"");}
  function renderStep(index){
    currentStep=Math.max(0,Math.min(4,index));
    document.querySelectorAll(".step-panel").forEach(panel=>panel.classList.toggle("active",Number(panel.dataset.panel)===currentStep));
    document.querySelectorAll(".step-link").forEach(button=>{
      const active=Number(button.dataset.step)===currentStep;
      button.classList.toggle("active",active);
      button.setAttribute("aria-current",active?"step":"false");
    });
    const copy=stepCopy[currentStep];
    $("step-eyebrow").textContent=copy.eyebrow;
    $("step-title").innerHTML=copy.title;
    $("step-description").textContent=copy.description;
    $("progress-text").innerHTML=String(currentStep+1).padStart(2,"0")+"<span>/05</span>";
    $("step-helper").textContent="Langkah "+(currentStep+1)+" dari 5";
    $("previous-step").disabled=currentStep===0;
    $("next-step").hidden=currentStep===4;
    $("finish-step").hidden=currentStep!==4;
    if(currentStep===3)renderPhotos();
  }
  function updateCounts(){
    $("hero-count").textContent=fields.hero.value.length;
    $("story-count").textContent=fields.story.value.length;
  }
  function updatePreview(){
    const template=project?.template_id||"bloom";
    const page=$("preview-page");
    page.className="preview-page template-"+template;
    page.style.setProperty("--preview-accent",palettes[fields.accent.value]||palettes.peach);
    $("template-label").textContent=templateNames[template]||template.toUpperCase();
    $("preview-template");
    $("final-template").textContent=templateNames[template]||template.toUpperCase();
    $("top-project-name").textContent=fields.title.value.trim()||"Untitled story";
    $("preview-heading").textContent=fields.hero.value.trim()||"To my favorite person. ♡";
    $("preview-names").textContent=[fields.one.value.trim(),fields.two.value.trim()].filter(Boolean).join(" & ")||"Nama kamu & Nama pasangan";
    const story=fields.story.value.trim()||"Setiap cerita indah dimulai dari hal sederhana...";
    $("preview-story").textContent=story;
    $("preview-story-repeat").textContent=story;
    $("preview-date").textContent=fields.date.value?new Date(fields.date.value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}).toUpperCase():"OUR SPECIAL DAY";
    $("preview-kicker").textContent=template==="chapter"?"A STORY IN THE MAKING":template==="playdate"?"OUR FAVORITE KIND OF CHAOS":"A LITTLE NOTE FOR YOU";
    $("preview-ornament").textContent=template==="chapter"?"✧":template==="playdate"?"✳":"✿";
    const heroPhoto=$("preview-hero-photo");
    if(photos.length&&photos[0].url){
      heroPhoto.style.backgroundImage="url("+JSON.stringify(photos[0].url)+")";
      heroPhoto.classList.add("has-photo");
    }else{
      heroPhoto.style.backgroundImage="";
      heroPhoto.classList.remove("has-photo");
    }
    const gallery=$("preview-gallery");
    gallery.replaceChildren();
    photos.forEach((photo,index)=>{
      if(!photo.url)return;
      const image=document.createElement("img");
      image.src=photo.url;image.alt="Foto kenangan "+(index+1);
      image.addEventListener("click",()=>openLightbox(photo.url));
      gallery.append(image);
    });
    updateCounts();
  }
  function collect(){
    return {
      names:{first:fields.one.value.trim(),second:fields.two.value.trim()},
      eventDate:fields.date.value,
      eventTime:fields.time.value.trim(),
      venueName:fields.venue.value.trim(),
      venueAddress:fields.address.value.trim(),
      rsvp:{phone:fields.rsvpPhone.value.replace(/[^0-9]/g,""),message:fields.rsvpMessage.value.trim()},
      closingMessage:fields.closing.value.trim(),
      musicUrl:fields.music.value.trim(),
      heroTitle:fields.hero.value.trim(),
      story:fields.story.value,
      appearance:{accent:fields.accent.value},
      gallery:photos.map(photo=>({path:photo.path}))
    };
  }
  function fill(content){
    const value=content||{};
    fields.one.value=value.names?.first||"";
    fields.two.value=value.names?.second||"";
    fields.date.value=value.eventDate||"";
    fields.time.value=value.eventTime||"";
    fields.venue.value=value.venueName||"";
    fields.address.value=value.venueAddress||"";
    fields.rsvpPhone.value=value.rsvp?.phone||"";
    fields.rsvpMessage.value=value.rsvp?.message||"";
    fields.closing.value=value.closingMessage||"";
    fields.music.value=value.musicUrl||"";
    fields.hero.value=value.heroTitle||"";
    fields.story.value=value.story||"";
    fields.accent.value=value.appearance?.accent||"peach";
    document.querySelectorAll('input[name="accent-choice"]').forEach(input=>{input.checked=input.value===fields.accent.value;});
    updateCounts();
  }
  async function refreshPhotoUrls(){
    for(const photo of photos){
      if(photo.file){photo.url=URL.createObjectURL(photo.file);continue;}
      const {data,error}=await db.storage.from("project-photos").createSignedUrl(photo.path,3600);
      photo.url=error?"":data?.signedUrl||"";
    }
    renderPhotos();updatePreview();
  }
  function renderPhotos(){
    photoCount.textContent=photos.length+"/5";
    photoGrid.replaceChildren();
    if(!photos.length){
      const empty=document.createElement("span");empty.className="photo-empty";empty.textContent="Belum ada foto yang ditambahkan.";photoGrid.append(empty);return;
    }
    photos.forEach((photo,index)=>{
      const item=document.createElement("div");item.className="photo-thumb";
      const image=document.createElement("img");image.src=photo.url||"";image.alt="Foto "+(index+1);image.addEventListener("click",()=>openLightbox(photo.url));
      const controls=document.createElement("div");controls.className="photo-controls";
      const left=document.createElement("button");left.type="button";left.textContent="←";left.disabled=index===0;left.setAttribute("aria-label","Geser ke kiri");left.addEventListener("click",()=>movePhoto(index,-1));
      const right=document.createElement("button");right.type="button";right.textContent="→";right.disabled=index===photos.length-1;right.setAttribute("aria-label","Geser ke kanan");right.addEventListener("click",()=>movePhoto(index,1));
      controls.append(left,right);
      const remove=document.createElement("button");remove.type="button";remove.className="remove-photo";remove.textContent="×";remove.setAttribute("aria-label","Hapus foto");remove.addEventListener("click",()=>removePhoto(index));
      item.append(image,controls,remove);photoGrid.append(item);
    });
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
    const photo=photos[index];if(!photo)return;
    if(photo.path){
      const {error}=await db.storage.from("project-photos").remove([photo.path]);
      if(error){alert("Foto gagal dihapus: "+error.message);return;}
    }
    if(photo.file&&photo.url)URL.revokeObjectURL(photo.url);
    photos.splice(index,1);renderPhotos();updatePreview();scheduleSave();
  }
  async function uploadFiles(fileList){
    const selected=Array.from(fileList||[]);if(!selected.length)return;
    if(photos.length+selected.length>5){alert("Maksimal 5 foto per project.");photoInput.value="";return;}
    const allowed=["image/jpeg","image/png","image/webp"];
    for(const file of selected){
      if(!allowed.includes(file.type)){alert("Gunakan foto JPG, PNG, atau WEBP.");photoInput.value="";return;}
      if(file.size>8*1024*1024){alert("Ukuran setiap foto maksimal 8 MB.");photoInput.value="";return;}
    }
    uploading=true;setStatus("Mengunggah foto...");
    for(const file of selected){
      const safeName=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
      const path=sessionUser.id+"/"+project.id+"/"+crypto.randomUUID()+"-"+safeName;
      const {error}=await db.storage.from("project-photos").upload(path,file,{contentType:file.type,upsert:false});
      if(error){alert("Foto gagal diunggah: "+error.message);continue;}
      photos.push({path});
    }
    photoInput.value="";await refreshPhotoUrls();uploading=false;setStatus("Foto siap disimpan");scheduleSave();
  }
  async function save(){
    if(!project||uploading||saving)return false;
    saving=true;saveButton.disabled=true;setStatus("Menyimpan...");
    const content=collect(),title=fields.title.value.trim()||"Cerita Baru";
    const {error}=await db.from("projects").update({title:title,content:content,updated_at:new Date().toISOString()}).eq("id",project.id);
    saving=false;saveButton.disabled=false;
    if(error){setStatus("Gagal menyimpan");alert("Perubahan belum tersimpan: "+error.message);return false;}
    project.content=content;project.title=title;setStatus("Tersimpan ✓","saved");return true;
  }
  function scheduleSave(){
    setStatus("Ada perubahan...");
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),1200);
  }
  function resetToSaved(){
    if(!confirm("Kembalikan semua bagian ke perubahan terakhir yang tersimpan?"))return;
    clearTimeout(saveTimer);fill(project.content);fields.title.value=project.title||"";
    photos=(project.content?.gallery||[]).filter(item=>item.path).map(item=>({path:item.path}));
    refreshPhotoUrls();updatePreview();setStatus("Perubahan dipulihkan","saved");
  }
  function bindEvents(){
    document.querySelectorAll(".step-link").forEach(button=>button.addEventListener("click",()=>renderStep(Number(button.dataset.step))));
    $("previous-step").addEventListener("click",()=>renderStep(currentStep-1));
    $("next-step").addEventListener("click",()=>renderStep(currentStep+1));
    document.querySelectorAll('input[name="accent-choice"]').forEach(input=>input.addEventListener("change",()=>{
      fields.accent.value=input.value;updatePreview();scheduleSave();
    }));
    form.querySelectorAll('input:not([type=file]):not([type=radio]),textarea').forEach(element=>element.addEventListener("input",()=>{updatePreview();scheduleSave();}));
    photoInput.addEventListener("change",()=>uploadFiles(photoInput.files));
    document.querySelectorAll(".device-button").forEach(button=>button.addEventListener("click",()=>{
      document.querySelectorAll(".device-button").forEach(item=>item.classList.toggle("active",item===button));
      $("preview-device").classList.toggle("wide",button.dataset.device==="wide");
    }));
    $("lightbox-close").addEventListener("click",closeLightbox);
    $("photo-lightbox").addEventListener("click",event=>{if(event.target.id==="photo-lightbox")closeLightbox();});
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closeLightbox();});
    form.addEventListener("submit",async event=>{
      event.preventDefault();clearTimeout(saveTimer);
      const ok=await save();if(ok){setStatus("Draft tersimpan ✓","saved");renderStep(0);}
    });
    saveButton.addEventListener("click",async()=>{clearTimeout(saveTimer);await save();});
    const previewLink=$("open-full-preview");
    previewLink.href="preview.html?id="+encodeURIComponent(project.id);
    previewLink.addEventListener("click",async event=>{
      event.preventDefault();clearTimeout(saveTimer);
      const ok=await save();if(ok)location.href=previewLink.href;
    });
    db.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT")location.replace("auth.html");});
  }
  async function init(){
    setStatus("Memuat project...");
    const {data:{session},error:sessionError}=await db.auth.getSession();
    if(sessionError||!session){location.replace("auth.html");return;}
    sessionUser=session.user;
    if(!projectId){location.replace("dashboard.html#projects");return;}
    const {data,error}=await db.from("projects").select("*").eq("id",projectId).single();
    if(error||!data){
      document.querySelector(".editor-workspace").innerHTML="<div style='padding:50px;font-family:Arial'><h2>Project tidak ditemukan</h2><p>Pastikan kamu masuk dengan akun pemilik project.</p><a href='dashboard.html'>Kembali ke dashboard</a></div>";return;
    }
    project=data;
    fields.title.value=data.title||"";
    $("top-project-name").textContent=data.title||"Untitled story";
    $("template-label").textContent=templateNames[data.template_id]||String(data.template_id||"bloom").toUpperCase();
    fill(data.content);
    photos=(data.content?.gallery||[]).filter(item=>item.path).map(item=>({path:item.path}));
    await refreshPhotoUrls();
    bindEvents();renderStep(0);updatePreview();setStatus("Semua perubahan tersimpan","saved");
  }
  init();
})();