import {api,reauthenticate} from './auth.mjs';
let started=0,lastActivity=0,lastSent=0,blocked=false,installed=false,onRestore;
export function sessionPolicy(person,restore){
 onRestore=restore;started=new Date(person._session?.started_at||Date.now()).getTime();lastActivity=new Date(person._session?.last_activity||Date.now()).getTime();
 if(installed)return;installed=true;
 for(const event of ['pointerdown','keydown','input','touchstart'])document.addEventListener(event,e=>{if(!e.isTrusted||blocked)return;const now=Date.now();if(now-started>=8*3600000||now-lastActivity>=30*60000){lock();return;}lastActivity=now;if(now-lastSent>60000){lastSent=now;api('activity').catch(()=>lock());}},{capture:true,passive:true});
 window.addEventListener('session-invalid',lock);
 setInterval(tick,1000);
 setInterval(()=>{if(!blocked)api('session_check').catch(()=>lock());},60000);
}
function tick(){
 if(blocked)return;const now=Date.now(),idle=30*60000-(now-lastActivity),absolute=8*3600000-(now-started);
 if(idle<=0||absolute<=0){lock();return;}
 let banner=document.querySelector('#session-warning');
 if(idle<=120000||absolute<=300000){
  if(!banner){banner=document.createElement('div');banner.id='session-warning';banner.className='session-warning';document.body.append(banner);}
  banner.replaceChildren();const message=document.createElement('span');message.textContent='Sua sessão expira em '+Math.ceil(Math.min(idle,absolute)/1000)+' segundos. ';banner.append(message);
  if(absolute>Math.min(idle,120000)){const button=document.createElement('button');button.textContent='Continuar sessão';button.onclick=async()=>{try{await api('activity');lastActivity=Date.now();banner.remove();}catch{lock();}};banner.append(button);}
 }else banner?.remove();
}
function lock(){
 if(blocked)return;blocked=true;document.querySelector('#session-warning')?.remove();document.querySelector('#app').inert=true;
 const overlay=document.createElement('div');overlay.id='session-lock';overlay.className='session-lock';
 const card=document.createElement('div');card.className='panel';const heading=document.createElement('h2');heading.textContent='Sessão encerrada';
 const message=document.createElement('p');message.textContent='As alterações não salvas continuam na memória desta aba. Entre novamente com a mesma conta para retomar. Fechar ou recarregar a aba pode perder esse conteúdo.';
 const button=document.createElement('button');button.className='btn primary';button.textContent='Entrar novamente com Google';
 button.onclick=async()=>{button.disabled=true;try{await reauthenticate();const person=await api('whoami');await onRestore(person);started=new Date(person._session.started_at).getTime();lastActivity=Date.now();blocked=false;document.querySelector('#app').inert=false;overlay.remove();}catch(e){message.textContent=e.message+' As alterações permanecem nesta aba.';}finally{button.disabled=false;}};
 card.append(heading,message,button);overlay.append(card);document.body.append(overlay);
}
