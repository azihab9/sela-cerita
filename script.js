// Ganti nomor berikut dengan nomor WhatsApp admin (format internasional, tanpa +).
const SELA_WHATSAPP_NUMBER = "";
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
if (form) form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  const message = [
    "Halo Sela Cerita! Aku mau tanya tentang pembuatan website.",
    "", "Nama: " + data.get("name"), "Kontak: " + data.get("contact"),
    "Momen: " + data.get("occasion"), "Template: " + data.get("template"),
    "Detail: " + (data.get("details") || "-")
  ].join("\n");
  const status = document.querySelector("#form-status");
  if (!/^\d{9,15}$/.test(SELA_WHATSAPP_NUMBER)) {
    status.textContent = "Form siap. Admin perlu mengatur nomor WhatsApp di script.js sebelum pesan bisa dikirim.";
    return;
  }
  window.open("https://wa.me/" + SELA_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  status.textContent = "WhatsApp terbuka dengan ringkasan pesanmu.";
});