import {roles} from './domain.mjs';
import {moduleLevel} from './permissions.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s??'').trim().toLocaleLowerCase('pt-BR');
export function areaPayload(area,form,people){const coordinator=String(form.get('coordinator')||'');return {id:area.id,revision:area.revision,name:people.find(p=>p.email===coordinator)?.name?.trim()||'',coordinator,course_ids:[...new Set(form.getAll('course_ids'))]};}
export function validateArea(payload,areas,people){
 const errors=[];
 if(!people.some(p=>p.email===payload.coordinator&&p.active!==false)||!payload.name)errors.push('Selecione o responsável pela área.');
 if(areas.some(a=>a.id!==payload.id&&(normalize(a.name)===normalize(payload.name)||a.coordinator===payload.coordinator)))errors.push('Já existe uma área com este nome ou responsável.');
 const conflict=areas.find(a=>a.id!==payload.id&&a.coordinator!==payload.coordinator&&a.course_ids?.some(id=>payload.course_ids.includes(id)));
 if(conflict)errors.push('O curso já está atribuído a outro coordenador de área ('+conflict.name+'). Remova a atribuição anterior antes de salvar.');
 return errors;
}
export async function areasPage(ctx){
 const {root,me,shell,safe,api,reload,leave,onSaved,toast}=ctx;
 const editable=me.profiles.includes('admin')&&moduleLevel(me,'areas')>=2;
 const areas=await api('areas_list'),options=editable?await api('area_options'):{people:[],courses:[]};
 const people=options.people||[],courses=options.courses||[];
 const heading='<div class="panel-head"><h2>Cadastro de áreas internas</h2></div>';
 const panel=body=>`<div class="panel area-panel">${heading}<div class="panel-body">${body}</div></div>`;
 const coordinatorName=a=>a.coordinator_name||people.find(p=>p.email===a.coordinator)?.name||(a.coordinator?'Responsável cadastrado':'Não definido');
 const courseName=(a,id)=>a.course_names?.[id]||courses.find(c=>c.id===id)?.name||'Curso vinculado (acesso restrito ou registro legado)';
 function list(){shell(panel(`<div class="toolbar area-list-toolbar">${editable?'<button class="btn primary" id="area-new">+ Nova área interna</button>':''}</div>${areas.length?`<div class="reg-table-scroll"><table class="mini-table area-list"><thead><tr><th>Área interna</th><th>Coordenador</th><th>Cursos vinculados</th><th>Ações</th></tr></thead><tbody>${areas.map((a,i)=>`<tr><td><strong>${esc(a.name)}</strong></td><td>${esc(coordinatorName(a))}${a.coordinator&&a.coordinator_active===false?' · Desativado':''}</td><td>${esc((a.course_ids||[]).map(id=>courseName(a,id)).join(', ')||'Nenhum')}</td><td><button class="btn tiny" data-area-edit="${i}">${editable?'Editar':'Visualizar'}</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state">Nenhuma área cadastrada.</div>'}`));root.querySelector('#area-new')?.addEventListener('click',()=>edit({name:'',coordinator:'',course_ids:[],members:[]}));root.querySelectorAll('[data-area-edit]').forEach(b=>b.onclick=()=>edit(areas[b.dataset.areaEdit]));}
 function edit(area){
  const current=people.find(p=>p.email===area.coordinator),legacy=area.coordinator&&!current;
  shell(panel(`<button class="btn" id="area-back">← Voltar à lista</button><form id="area-form"><fieldset class="reg-fieldset" ${editable?'':'disabled'}><div class="course-field area-field"><label for="area-name">Nome da área (nome do responsável selecionado)</label><input id="area-name" name="name" readonly value="${esc(current?.name||area.coordinator_name||area.name)}"></div><div class="course-field area-field"><label for="area-coordinator">Coordenador de área</label><select id="area-coordinator" name="coordinator" required><option value="">Selecionar usuário</option>${legacy?`<option value="${esc(area.coordinator)}" selected ${editable?'disabled':''}>${esc(coordinatorName(area))} — ${area.coordinator_active===false?'Desativado':'Cadastro existente'}</option>`:''}${people.map(p=>`<option value="${esc(p.email)}" ${p.email===area.coordinator?'selected':''}>${esc(p.name)} — ${esc(p.profiles.filter(k=>k!=='area').map(k=>roles[k]||k).join(', ')||'Sem perfil')}</option>`).join('')}</select></div><h3 class="section-label">Cursos vinculados</h3><div class="area-course-checks">${(editable?courses.map(c=>({id:c.id,name:c.name})):area.course_ids.map(id=>({id,name:courseName(area,id)}))).map(c=>`<label><input type="checkbox" name="course_ids" value="${esc(c.id)}" ${area.course_ids.includes(c.id)?'checked':''}> ${esc(c.name)}</label>`).join('')||'<p class="muted">Nenhum curso cadastrado.</p>'}${editable?area.course_ids.filter(id=>!courses.some(c=>c.id===id)).map(id=>`<label><input type="checkbox" name="course_ids" value="${esc(id)}" checked> ${esc(courseName(area,id))}</label>`).join(''):''}</div></fieldset><p class="compact-note area-help">A Coordenação de Área é uma atribuição adicional ao perfil institucional. Vincular ou remover cursos nesta área não altera os responsáveis já designados nas cinco etapas. As designações de aprovação são feitas no Cadastro de Cursos; enviar continua exclusivo do Coordenador de Curso vinculado.</p><p id="area-feedback" role="status" class="reg-feedback"></p>${editable?'<div class="actions"><button type="submit" class="btn primary">Salvar</button></div>':'<p class="compact-note">Modo Visualizar. Seu acesso não permite alterar este cadastro.</p>'}</form>`));
  const form=root.querySelector('#area-form');form.elements.coordinator.addEventListener('change',()=>{form.elements.name.value=people.find(p=>p.email===form.elements.coordinator.value)?.name||'';});root.querySelector('#area-back').onclick=()=>leave(list);
  form.onsubmit=e=>{e.preventDefault();if(!editable)return;safe(async()=>{const payload=areaPayload(area,new FormData(form),people),errors=validateArea(payload,areas,people);if(errors.length){root.querySelector('#area-feedback').textContent=errors.join('\n');return;}const button=e.submitter;button.disabled=true;try{await api('area_save',payload);onSaved();await reload();toast('Área interna salva. Vínculos atualizados e histórico preservado.');}finally{button.disabled=false;}});};
 }
 list();
}
