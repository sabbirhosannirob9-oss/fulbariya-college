// Student portal placeholder.
// Authentication/database intentionally disconnected.
const f=document.querySelector("#studentLoginForm");
if(f){
  f.addEventListener("submit",e=>{
    e.preventDefault();
    const b=document.querySelector("#studentMessage");
    if(b) b.innerHTML='<div class="status-box info">Student authentication will be enabled after Supabase connection.</div>';
  });
}
