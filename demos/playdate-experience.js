(() => {
 const prompts=[
 "Take a photo of something ordinary that makes you smile.",
 "Send a voice note saying one tiny thing you appreciate.",
 "Recreate your funniest old photo. No retakes allowed.",
 "Go for a spontaneous snack run together.",
 "Make a 10-second video of today's little chaos.",
 "Tell someone your favorite memory with them."
 ];
 let last=-1;
 const button=document.getElementById("challengeButton"),prompt=document.getElementById("challengePrompt");
 button.addEventListener("click",()=>{
  let next;do{next=Math.floor(Math.random()*prompts.length)}while(next===last);last=next;
  prompt.textContent=prompts[next];prompt.classList.remove("challenge-pop");void prompt.offsetWidth;prompt.classList.add("challenge-pop");
  button.textContent="ANOTHER ONE? ↻";
 });
})();