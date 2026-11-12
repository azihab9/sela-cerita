// Ganti dengan nomor WhatsApp admin format internasional tanpa tanda +, contoh 62812xxxxxxx.
const SELA_WHATSAPP_NUMBER = "6285110509056";
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-links");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const form = document.querySelector("#order-form");
const photoInput = document.querySelector("#order-photos");
const preview = document.querySelector("#upload-preview");
const status = document.querySelector("#form-status");
let selectedPhotos = [];
let previewUrls = [];

function clearPreview() {
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  previewUrls = [];
  preview.replaceChildren();
}
if (photoInput) {
  photoInput.addEventListener("change", () => {
    const files = Array.from(photoInput.files || []);
    if (files.length > 5) {
      photoInput.value = "";
      selectedPhotos = [];
      clearPreview();
      status.textContent = "Maksimal 5 foto. Silakan pilih ulang.";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (files.some(file => !allowed.includes(file.type))) {
      photoInput.value = "";
      selectedPhotos = [];
      clearPreview();
      status.textContent = "Gunakan foto JPG, PNG, atau WEBP.";
      return;
    }
    if (files.some(file => file.size > 8 * 1024 * 1024)) {
      photoInput.value = "";
      selectedPhotos = [];
      clearPreview();
      status.textContent = "Ukuran setiap foto maksimal 8 MB.";
      return;
    }
    selectedPhotos = files;
    clearPreview();
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      const item = document.createElement("div");
      item.className = "upload-thumb";
      const image = document.createElement("img");
      image.src = url;
      image.alt = "Preview " + file.name;
      const name = document.createElement("span");
      name.textContent = file.name;
      item.append(image, name);
      preview.append(item);
    });
    status.textContent = files.length
      ? files.length + " foto dipilih. Foto belum terkirim; lampirkan manual di WhatsApp setelah pesan terbuka."
      : "Belum ada foto dipilih.";
  });
}
if (form) form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  const photoNames = selectedPhotos.map(file => file.name);
  const message = [
    "Halo Sela Cerita! Aku ingin memesan website personal.",
    "",
    "Nama: " + data.get("name"),
    "Kontak WhatsApp: " + data.get("contact"),
    "Momen: " + data.get("occasion"),
    "Template: " + data.get("template"),
    "Nama pasangan: " + (data.get("partner") || "-"),
    "Tanggal spesial: " + (data.get("event_date") || "-"),
    "Cerita / detail: " + (data.get("details") || "-"),
    "Foto pilihan: " + (photoNames.length ? photoNames.join(", ") : "Belum ada"),
    "",
    "Aku akan melampirkan foto pilihan secara manual di chat ini."
  ].join("\n");
  if (!/^\d{9,15}$/.test(SELA_WHATSAPP_NUMBER)) {
    status.textContent = "Form sudah siap, tetapi nomor WhatsApp admin belum diatur. Hubungi admin secara langsung untuk mengirim pesanan.";
    return;
  }
  const url = "https://wa.me/" + SELA_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  window.open(url, "_blank", "noopener,noreferrer");
  status.textContent = "WhatsApp terbuka. Jangan lupa lampirkan foto pilihanmu di chat.";
});
window.addEventListener("beforeunload", clearPreview);
