const views=[...document.querySelectorAll(".view")];
const links=[...document.querySelectorAll("[data-view]")];
const crumb=document.querySelector("#crumb");
const sidebar=document.querySelector("#sidebar");
const toast=document.querySelector("#toast");
let toastTimer;
function notify(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2800)}
function showView(id){const target=document.getElementById(id);if(!target||!target.classList.contains("view"))return;views.forEach(v=>v.classList.toggle("active-view",v===target));links.forEach(a=>a.classList.toggle("active",a.dataset.view===id));crumb.textContent=({overview:"Dashboard",projects:"Ceritaku",templates:"Pilih template",orders:"Pesanan",settings:"Pengaturan",help:"Bantuan"})[id]||"Dashboard";history.replaceState(null,"","#"+id);sidebar.classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})}
links.forEach(a=>a.addEventListener("click",e=>{e.preventDefault();showView(a.dataset.view)}));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
document.querySelector("#mobile-menu").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.querySelectorAll(".choose-template").forEach(button=>button.addEventListener("click",()=>{const template=button.dataset.template;notify(template+" dipilih. Langkah berikutnya adalah membuat project dan menghubungkan akun.");}));
document.querySelectorAll("[data-demo-edit]").forEach(button=>button.addEventListener("click",()=>notify("Editor "+button.dataset.demoEdit+" akan dibuka setelah sistem project dan login terhubung.")));
document.querySelector("#year").textContent=new Date().getFullYear();
const initial=location.hash.replace("#","");if(initial)showView(initial);
