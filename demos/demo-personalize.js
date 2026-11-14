(() => {
 const panel=document.getElementById("personalizePanel");
 const open=document.getElementById("openPersonalize");
 const close=document.getElementById("closePersonalize");
 const fields={names:document.getElementById("customNames"),date:document.getElementById("customDate"),message:document.getElementById("customMessage")};
 const defaults={};
 Object.entries(fields).forEach(([key,input])=>{
   const target=document.querySelector('[data-personalize="'+key+'"]');
   defaults[key]=target?.textContent||"";
   input.addEventListener("input",()=>{
     if(target) target.textContent=input.value.trim()||defaults[key];
   });
 });
 open.addEventListener("click",()=>{panel.hidden=false;open.hidden=true;fields.names.focus()});
 close.addEventListener("click",()=>{panel.hidden=true;open.hidden=false});
 document.getElementById("resetPersonalize").addEventListener("click",()=>{
   Object.entries(fields).forEach(([key,input])=>{input.value="";const target=document.querySelector('[data-personalize="'+key+'"]');if(target)target.textContent=defaults[key]});
 });
})();