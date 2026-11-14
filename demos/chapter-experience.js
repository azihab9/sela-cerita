(() => {
 const entries=[...document.querySelectorAll(".chapter-entry")];
 const bar=document.getElementById("chapterProgressBar"),label=document.getElementById("chapterProgressLabel");
 entries.forEach((entry,index)=>{
  const btn=entry.querySelector(".chapter-read"),extra=entry.querySelector(".chapter-extra");
  btn.addEventListener("click",()=>{
   const open=extra.hidden;
   entries.forEach(item=>{item.querySelector(".chapter-extra").hidden=true;item.querySelector(".chapter-read").setAttribute("aria-expanded","false");item.querySelector(".chapter-read").textContent="READ THIS PAGE ↗"});
   extra.hidden=!open;btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"CLOSE THIS PAGE ↙":"READ THIS PAGE ↗";
   if(open){bar.style.width=((index+1)/entries.length*100)+"%";label.textContent="PAGE "+String(index+1).padStart(2,"0")+" / 03";}
  });
 });
})();