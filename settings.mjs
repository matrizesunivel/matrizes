import {api} from './auth.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function settingsPage(ctx){
 const {me,shell,panel,safe}=ctx;
 if(!me.profiles.includes('admin'))throw Error('Configurações são exclusivas do Administrador.');
 const cfg=await api('ai_settings_get'),current=cfg.default_model||cfg.models[0]||'';
 shell(panel('Inteligência artificial','<form id="settings-form" autocomplete="off"><p>Provedor: OpenRouter</p><div class="fields"><div class="field"><label for="ai-api-key">Chave da API</label><input id="ai-api-key" name="api_key" type="password" autocomplete="off" spellcheck="false" maxlength="512" placeholder="'+(cfg.configured?'Chave cadastrada · deixe vazio para manter':'Insira uma nova chave')+'"></div><div class="field"><label for="ai-default-model">Modelo utilizado (padrão)</label><input id="ai-default-model" name="default_model" type="text" value="'+esc(current)+'" maxlength="200" placeholder="provedor/modelo:free"></div></div><p>'+(cfg.configured?'Já existe uma chave configurada. Para substituí-la, informe a nova chave. Deixe o campo vazio para manter a atual.':'Nenhuma chave cadastrada.')+' A chave fica protegida no servidor e não será exibida novamente.</p><div class="field"><label for="ai-other-models">Outros modelos gratuitos disponíveis (um por linha)</label><textarea id="ai-other-models" name="models" rows="4">'+esc(cfg.models.filter(m=>m!==current).join('\n'))+'</textarea></div><p>Qualquer Administrador pode cadastrar ou atualizar a chave e os modelos. O sistema registra automaticamente o usuário e a data da alteração. Modelos pagos e troca automática de modelo continuam bloqueados.</p>'+(cfg.updated_at?'<p>Última alteração: '+esc(new Date(cfg.updated_at).toLocaleString('pt-BR'))+' · '+esc(cfg.updated_by)+'</p>':'')+'<button class="btn primary">Salvar configurações</button></form>'));
 document.querySelector('#settings-form').onsubmit=e=>{e.preventDefault();safe(async()=>{
  const form=e.target,f=new FormData(form),button=e.submitter,model=String(f.get('default_model')||'').trim();
  button.disabled=true;
  try{
   await api('ai_settings_save',{models:[...new Set([model,...String(f.get('models')||'').split('\n').map(s=>s.trim())].filter(Boolean))],default_model:model,api_key:String(f.get('api_key')||'').trim(),revision:cfg.revision||0});
   form.querySelector('[name="api_key"]').value='';ctx.onSaved?.();await settingsPage(ctx);
   const notice=document.createElement('p');notice.className='notice';notice.setAttribute('role','status');notice.textContent='Configurações salvas.';document.querySelector('#settings-form').prepend(notice);
  }finally{button.disabled=false;}
 });};
}
