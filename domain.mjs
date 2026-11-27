export const roles={admin:'Administrador',coordinator:'Coordenador de Curso',area:'Coordenador de Área',pedagogic:'Coordenação Pedagógica',academic:'Direção Acadêmica',regulation:'Diretoria de Regulação',secretariat:'Secretaria Acadêmica'};
export const stages=['area','pedagogic','academic','regulation','secretariat'];
export const formats={presencial:'Presencial',ead:'EaD',semi:'Semipresencial'};
export const cols=f=>f==='presencial'?['ead','tp','prat','ext','est']:['eadAssincrona','eadSincronaMediada','eadSincrona','tp','prat','ext','est','prova'];
export const labels={ch:'CH TOTAL',ead:'CH TEÓRICA EaD',tp:'CH TEÓRICA PRESENCIAL',prat:'CH PRÁTICA PRESENCIAL',ext:'CH EXTENSÃO',est:'CH ESTÁGIO',prova:'CH PROVA PRESENCIAL',eadAssincrona:'CH EaD ASSÍNCRONA',eadSincronaMediada:'CH SÍNCRONA MEDIADA',eadSincrona:'CH EaD SÍNCRONA'};
export const normal=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
export function distribution(name,cfg,format){
 const n=normal(name),exclusive=['direito','medicina','enfermagem','odontologia','psicologia'].some(x=>new RegExp('(^|[^a-z])'+x+'([^a-z]|$)').test(n));
 if(exclusive&&format!=='presencial')return {blocked:true,pres:0,comp:0};
 if(format==='ead'&&(normal(cfg.degree)==='licenciatura'||['01','05','07','08','09'].includes(String(cfg.area))))return {blocked:true,pres:0,comp:0};
 if(/(^|[^a-z])medicina([^a-z]|$)/.test(n))return {pres:100,comp:0};
 if(format==='presencial')return {pres:70,comp:0};
 if(format==='ead')return {pres:10,comp:10};
 if(normal(cfg.degree)==='licenciatura')return {pres:30,comp:20};
 return {pres:['07','08','09'].includes(String(cfg.area))?40:30,comp:20};
}
export const allowedFormats=(name,cfg)=>['presencial','semi','ead'].filter(f=>!distribution(name,cfg,f).blocked);
export function totals(data,format){
 const rows=data.rows||[],sum=k=>rows.reduce((a,r)=>a+Number(r[k]||0),0),ac=Number(data.ac||0),total=sum('ch')+ac;
 return {total,ac,extension:sum('ext'),internship:sum('est'),practice:sum('prat'),presential:format==='presencial'?sum('tp')+sum('prat')+sum('ext')+sum('est')+ac:sum('tp')+sum('prova')+sum('ext')+sum('est'),distance:format==='presencial'?sum('ead'):sum('eadAssincrona')+sum('eadSincronaMediada')+sum('eadSincrona')+ac,mediated:sum('eadSincronaMediada')};
}
export function validateData(data,format,reg,{submit=false,name=''}={}){
 const errors=[],rows=data?.rows;
 if(!Array.isArray(rows)||rows.length>2000)return ['Estrutura de disciplinas inválida.'];
 if(!Number.isSafeInteger(Number(data.ac))||Number(data.ac)<0)errors.push('AC deve ser inteira e não negativa.');
 if(!Number.isInteger(Number(data.semesters))||Number(data.semesters)<1||Number(data.semesters)>30)errors.push('Duração inválida.');
 const max=Number(data.semesters)*(format==='presencial'?1:2),names=new Set();
 if(data.certs!==undefined){
  if(!data.certs||typeof data.certs!=='object'||Array.isArray(data.certs))errors.push('Certificações inválidas.');
  else for(const [period,text] of Object.entries(data.certs))if(!/^[1-9][0-9]*$/.test(period)||Number(period)>max||typeof text!=='string'||text.length>2000)errors.push('Certificação deve pertencer a um período válido e conter texto.');
 }
 for(const row of rows){
  if(typeof row.name!=='string'||row.name.length>2000)errors.push('Nome de disciplina inválido.');
  if(row.tc!==undefined&&typeof row.tc!=='boolean'||row.online!==undefined&&typeof row.online!=='boolean')errors.push('TC e DO devem ser indicações SIM/NÃO.');
  if(format!=='presencial'&&row.online)errors.push('DO é permitido somente no Presencial.');
  if(!Number.isInteger(Number(row.period))||Number(row.period)<1||Number(row.period)>max)errors.push('Período inválido.');
  for(const k of ['ch',...cols(format)])if(!Number.isSafeInteger(Number(row[k]||0))||Number(row[k]||0)<0)errors.push(`${row.name||'Disciplina'}: ${labels[k]} deve ser inteira e não negativa.`);
  if(submit){
   if(!normal(row.name)||Number(row.ch)<=0)errors.push('Informe nome e CH total positiva para toda disciplina.');
   if(cols(format).reduce((n,k)=>n+Number(row[k]||0),0)!==Number(row.ch))errors.push(`${row.name}: distribuição diferente da CH TOTAL.`);
   if(names.has(normal(row.name)))errors.push(`${row.name}: nome duplicado.`);names.add(normal(row.name));
   if(normal(reg.degree)==='licenciatura'&&!['I','II','III','IV'].includes(row.nucleus))errors.push(`${row.name}: núcleo obrigatório.`);
  }
 }
 if(submit){
  const t=totals(data,format),dist=distribution(name,reg,format);
  if(Object.values(t).some(n=>!Number.isSafeInteger(n)))errors.push('Os totais ultrapassam o limite de cálculo exato.');
  if(reg.degree!=='Tecnólogo'&&Object.values(data.certs||{}).some(text=>String(text).trim()))errors.push('Certificações intermediárias são exclusivas dos cursos Tecnólogos.');
  if(!rows.length)errors.push('Inclua disciplinas.');
  if(!formats[format]||dist.blocked)errors.push('Formato não permitido ao curso/grau/área.');
  if(Number(data.semesters)<Number(reg.semMin)||Number(data.semesters)>Number(reg.semMax))errors.push('Duração fora dos limites de integralização.');
  if(t.total<Number(reg.minHours))errors.push('CH do curso abaixo do mínimo legal cadastrado.');
  if(t.extension<Math.ceil(t.total/10))errors.push(`Extensão insuficiente: mínimo ${Math.ceil(t.total/10)}h, incluindo AC na base.`);
  if(reg.internshipPercent!==null&&t.internship<Math.ceil(t.total*Number(reg.internshipPercent)/100))errors.push('Estágio abaixo do mínimo cadastrado sobre CH total + AC.');
  if(reg.practicePercent!==null&&t.practice<Math.ceil(t.total*Number(reg.practicePercent)/100))errors.push('Prática abaixo do mínimo cadastrado.');
  const minimum=Math.ceil(t.total*dist.pres/100);
  if(t.presential<minimum)errors.push(`Presencialidade mínima: ${minimum}h.`);
  if(t.mediated+Math.max(0,t.presential-t.total*dist.pres/100)<Math.ceil(t.total*dist.comp/100))errors.push('Mínimo complementar presencial/síncrono mediado não atendido.');
  if(normal(reg.degree)==='licenciatura'){for(const [n,minimum] of Object.entries(reg.nuclei||{})){const hours=rows.filter(r=>r.nucleus===n).reduce((total,r)=>total+Number(r.ch||0),0);if(hours<Number(minimum))errors.push('Núcleo '+n+': mínimo '+minimum+'h.');}}
  if(normal(reg.degree)==='licenciatura'&&!names.has('libras'))errors.push('Licenciatura exige LIBRAS.');
 }
 return [...new Set(errors)];
}
export function validateRegulation(payload){
 const c=payload.config||{},errors=[];
 if(!payload.name?.trim())errors.push('Informe o nome do curso.');
 if(!Number.isSafeInteger(Number(c.minHours))||Number(c.minHours)<1)errors.push('CH mínima legal deve ser inteira e positiva.');
 if(!c.cine||!c.area||!c.source)errors.push('Informe CINE, área e fonte normativa.');
 if(!/^(0[0-9]|10)$/.test(String(c.area??'')))errors.push('Selecione uma área CINE válida, de 00 a 10.');
 return errors;
}
export function courseParameters(course){const r=course.regulation?.config||{},c=course.config||{};return {...r,...c,minHours:r.minHours,area:r.area,cine:r.cine};}
export function validateCourse(config){
 const errors=[];
 if(!['Bacharelado','Licenciatura','Tecnólogo'].includes(config.degree))errors.push('Selecione o grau acadêmico.');
 for(const k of ['semMin','semMax'])if(!Number.isInteger(Number(config[k]))||Number(config[k])<1||Number(config[k])>30)errors.push('Integralização deve ser inteira, entre 1 e 30 semestres.');
 if(Number(config.semMax)<Number(config.semMin))errors.push('Integralização máxima inferior à mínima.');
 for(const k of ['internshipPercent','practicePercent'])if(config[k]!==null&&(config[k]===''||config[k]===undefined||!Number.isFinite(Number(config[k]))||Number(config[k])<0||Number(config[k])>100))errors.push('Informe o percentual de estágio/prática, de 0 a 100, ou marque Não se aplica.');
 if(!Array.isArray(config.axes)||config.axes.length>100||config.axes.some(a=>typeof a!=='string'||!a.trim()||a.length>200)||new Set(config.axes.map(normal)).size!==config.axes.length)errors.push('Eixos devem ter nomes únicos, com até 200 caracteres.');
 if(Object.values(config.axisColors||{}).some(color=>!/^#[0-9a-f]{6}$/i.test(color)))errors.push('Cor de eixo inválida.');
 return [...new Set(errors)];
}
