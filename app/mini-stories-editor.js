(() => {
  const cfg = window.SELA_SUPABASE_CONFIG || {};
  if (!window.supabase || !cfg.url || !cfg.anonKey) {
    document.body.innerHTML = "<p style='padding:30px;font-family:Arial'>Konfigurasi Supabase belum tersedia.</p>";
    return;
  }
  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const projectId = new URLSearchParams(location.search).get("id");
  const $ = (id) => document.getElementById(id);
  const fields = {
    title: $("site-title"), cover: $("cover-title"), from: $("from-name"), to: $("to-name"),
    message: $("story-message"), date: $("special-date"), closing: $("closing-message"),
    theme: $("theme"), music: $("music-url"),
  };
  const palettes = { berry:"#ffb7c5", citrus:"#ffd28a", sky:"#b9d9ff", confetti:"#c8b5f2" };
  let user, project, assets = [], step = 0, saveTimer, busy = false;
  const setStatus = (s) => { $("save-status").textContent = s; };
  const escapeUrl = (s) => String(s).replace(/["\\]/g, "\\$&");

  function collect() {
    return {
      cover: { title: fields.cover.value.trim(), from: fields.from.value.trim(), to: fields.to.value.trim() },
      story: { message: fields.message.value, date: fields.date.value, closing: fields.closing.value },
      gallery: assets.map(a => a.id),
      theme: fields.theme.value,
      music: fields.music.value.trim(),
    };
  }
  function updatePreview() {
    $("preview-title").textContent = fields.cover.value.trim() || "You make ordinary days feel special.";
    $("preview-names").textContent = [fields.from.value.trim(), fields.to.value.trim()].filter(Boolean).join(" · ") || "Namamu · Nama dia";
    $("preview-message").textContent = fields.message.value.trim() || "Ada banyak hal kecil yang ingin aku simpan tentang kita...";
    $("preview-date").textContent = fields.date.value ? new Date(fields.date.value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}) : "";
    $("preview-closing").textContent = fields.closing.value;
    $("cover-preview").style.background = palettes[fields.theme.value] || palettes.berry;
    const gallery = $("preview-gallery"); gallery.replaceChildren();
    assets.forEach(a => {
      if (!a.viewUrl) return;
      const img = document.createElement("img"); img.src = a.viewUrl; img.alt = "Foto cerita";
      gallery.append(img);
    });
  }
  function renderAssets() {
    const list = $("photo-list"); list.replaceChildren();
    assets.forEach((a, i) => {
      const wrap = document.createElement("div"); wrap.className = "photo";
      const img = document.createElement("img"); img.src = a.viewUrl; img.alt = "Foto "+(i+1);
      const del = document.createElement("button"); del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label","Hapus foto");
      del.addEventListener("click", () => removeAsset(a));
      wrap.append(img,del); list.append(wrap);
    });
    updatePreview();
  }
  function renderStep(next) {
    step = Math.max(0, Math.min(3, next));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", Number(p.dataset.panel) === step));
    document.querySelectorAll(".step").forEach(b => b.classList.toggle("active", Number(b.dataset.step) === step));
    $("step-count").textContent = "Langkah "+(step+1)+" dari 4";
    $("back-btn").disabled = step === 0;
    $("next-btn").hidden = step === 3;
  }
  function scheduleSave() {
    setStatus("Ada perubahan…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1100);
  }
  async function save() {
    if (!project || busy) return;
    busy = true; setStatus("Menyimpan draft…");
    const { error } = await db.from("projects").update({
      title: fields.title.value.trim() || "Our Little Journey",
      content: collect(), updated_at: new Date().toISOString(),
      content_version: (project.content_version || 1) + 1,
    }).eq("id", project.id);
    busy = false;
    if (error) { setStatus("Gagal menyimpan — "+error.message); return; }
    project.content = collect(); project.content_version = (project.content_version || 1) + 1;
    project.title = fields.title.value.trim() || "Our Little Journey";
    setStatus("Draft tersimpan ✓");
  }
  async function optimize(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let quality = 0.84, blob;
    do { blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality)); quality -= 0.08; }
    while (blob && blob.size > 2 * 1024 * 1024 && quality >= 0.44);
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error("Foto masih terlalu besar setelah dioptimalkan.");
    return { blob, width: canvas.width, height: canvas.height };
  }
  async function mediaAction(payload) {
    const { data, error } = await db.functions.invoke("r2-media", { body: payload });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }
  async function uploadFiles(files) {
    const chosen = Array.from(files || []);
    if (!chosen.length) return;
    const allowed = ["image/jpeg","image/png","image/webp"];
    if (chosen.some(f => !allowed.includes(f.type))) { alert("Gunakan JPG, PNG, atau WEBP."); return; }
    busy = true; $("photo-input").disabled = true;
    try {
      for (const file of chosen) {
        setStatus("Mengoptimalkan "+file.name+"…");
        const image = await optimize(file);
        const signed = await mediaAction({
          action:"sign-upload", projectId, filename:file.name,
          width:image.width, height:image.height, expectedBytes:image.blob.size,
        });
        const put = await fetch(signed.uploadUrl, {
          method:"PUT", headers:{"Content-Type":"image/webp"}, body:image.blob,
        });
        if (!put.ok) throw new Error("Upload ke penyimpanan gagal.");
        const completed = await mediaAction({
          action:"confirm-upload", projectId, objectKey:signed.objectKey,
          filename:file.name, width:image.width, height:image.height, expectedBytes:image.blob.size,
        });
        assets.push({ ...completed.asset, viewUrl:completed.viewUrl });
        renderAssets();
        setStatus("Foto berhasil diunggah");
      }
      scheduleSave();
    } catch (e) {
      alert(e.message || "Foto gagal diunggah.");
      setStatus("Upload foto gagal");
    } finally {
      busy = false; $("photo-input").disabled = false; $("photo-input").value = "";
    }
  }
  async function removeAsset(asset) {
    if (!confirm("Hapus foto ini dari cerita?")) return;
    try {
      await mediaAction({ action:"delete", projectId, assetId:asset.id });
      assets = assets.filter(a => a.id !== asset.id);
      renderAssets(); scheduleSave();
    } catch (e) { alert(e.message || "Foto gagal dihapus."); }
  }
  async function loadAssets(ids) {
    const { data, error } = await db.from("media_assets").select("id,object_key,position,width,height,byte_size")
      .eq("project_id", projectId).order("position");
    if (error) throw error;
    const wanted = new Set(ids || []);
    assets = [];
    for (const a of data || []) {
      if (wanted.size && !wanted.has(a.id)) continue;
      const signed = await mediaAction({ action:"view-url", projectId, assetId:a.id });
      assets.push({ ...a, viewUrl:signed.viewUrl });
    }
    renderAssets();
  }
  async function init() {
    if (!projectId) { location.replace("dashboard.html#projects"); return; }
    const { data:{session}, error:authError } = await db.auth.getSession();
    if (authError || !session) { location.replace("auth.html"); return; }
    user = session.user;
    const { data, error } = await db.from("projects").select("*").eq("id", projectId).single();
    if (error || !data || data.product_line !== "mini_stories") {
      document.querySelector(".layout").innerHTML = "<h2>Project Mini Stories tidak ditemukan atau tidak dapat diakses.</h2>";
      return;
    }
    if (!["draft","pending_payment"].includes(data.status)) {
      document.querySelector(".layout").innerHTML = "<h2>Project ini tidak lagi dalam status edit.</h2>";
      return;
    }
    project = data;
    const c = data.content || {};
    fields.title.value = data.title || "Our Little Journey";
    fields.cover.value = c.cover?.title || "";
    fields.from.value = c.cover?.from || "";
    fields.to.value = c.cover?.to || "";
    fields.message.value = c.story?.message || "";
    fields.date.value = c.story?.date || "";
    fields.closing.value = c.story?.closing || "";
    fields.theme.value = c.theme || "berry";
    fields.music.value = c.music || "";
    await loadAssets(c.gallery || []);
    updatePreview(); setStatus("Semua perubahan tersimpan"); renderStep(0);
    document.querySelectorAll(".step").forEach(b => b.addEventListener("click", () => renderStep(Number(b.dataset.step))));
    $("back-btn").addEventListener("click", () => renderStep(step-1));
    $("next-btn").addEventListener("click", () => renderStep(step+1));
    Object.values(fields).forEach(el => el.addEventListener("input", () => { updatePreview(); scheduleSave(); }));
    $("photo-input").addEventListener("change", e => uploadFiles(e.target.files));
    $("save-btn").addEventListener("click", () => { clearTimeout(saveTimer); save(); });
    $("preview-btn").addEventListener("click", async () => {
      clearTimeout(saveTimer); await save();
      alert("Preview langsung tersedia di panel kanan. Halaman publik akan diaktifkan setelah proses publikasi.");
    });
    db.auth.onAuthStateChange(event => { if (event === "SIGNED_OUT") location.replace("auth.html"); });
  }
  init().catch(error => { console.error(error); setStatus("Gagal memuat editor"); alert("Editor gagal dimuat. Periksa koneksi dan konfigurasi Supabase."); });
})();
