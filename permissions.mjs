export const modules={dashboard:'Visão geral',regulations:'Cadastro Regulatório',courses:'Cadastro de Cursos',matrices:'Matrizes Curriculares',approvals:'Aprovações',history:'Histórico e Versões',users:'Usuários e Permissões',areas:'Áreas Internas',notifications:'Notificações',ai:'Análise por IA',documents:'Documentos normativos',substitutions:'Substituições temporárias'};
export const actionNames={submit:'Enviar para aprovação',approve:'Aprovar etapa designada',return:'Devolver etapa designada',review:'Criar revisão',delete:'Excluir rascunho nunca enviado',export:'Exportar documentos',ai:'Executar análise por IA'};
export const institutionalProfiles=['coordinator','pedagogic','academic','regulation','secretariat','admin'];
const readOnly=new Set(['dashboard','history','notifications']);
export const approvedDefaults=Object.fromEntries([...institutionalProfiles,'area'].map(profile=>{
 const mod=Object.fromEntries(Object.keys(modules).map(k=>[k,k==='users'?0:1]));
 if(profile==='admin')for(const key of Object.keys(mod))mod[key]=readOnly.has(key)?1:2;
 if(profile==='coordinator')for(const key of ['courses','matrices','documents'])mod[key]=2;
 if(['pedagogic','academic','regulation','secretariat','area'].includes(profile))mod.approvals=2;
 if(profile==='regulation')for(const key of ['regulations','ai','documents'])mod[key]=2;
 if(profile==='academic')mod.substitutions=2;
 return [profile,{profile,modules:mod,actions:{submit:profile==='coordinator',approve:['pedagogic','academic','regulation','secretariat','area'].includes(profile),return:['pedagogic','academic','regulation','secretariat','area'].includes(profile),review:['coordinator','admin'].includes(profile),delete:['coordinator','admin'].includes(profile),export:false,ai:false},revision:1}];
}));
export function inheritedLevel(person,module,courseId){
 if(module==='audit')module='users';
 let result=0;
 for(const profile of person?.profiles||[]){
  if(courseId&&profile==='coordinator'&&!person.course_ids?.includes(courseId))continue;
  if(courseId&&profile==='area'&&!person._areaCourseIds?.includes(courseId)&&!person._actingStages?.some(s=>s.course===courseId&&s.stage==='area'))continue;
  const policy=(person._permissionDefaults||approvedDefaults)[profile];result=Math.max(result,Number(policy?.modules?.[module]||0));
 }
 return result;
}
export function moduleLevel(person,module,courseId){
 const admin=person?.profiles?.includes('admin')===true;
 if(module==='settings')return admin?2:0;
 if(['users','audit'].includes(module)&&!admin)return 0;
 if(module==='audit')module='users';
 if(!Object.hasOwn(modules,module))return 0;
 const override=person?.permissions?.modules?.[module];
 let result=[0,1,2].includes(override)?override:inheritedLevel(person,module,courseId);
 if(readOnly.has(module))result=Math.min(1,result);
 return result;
}
export function actionAllowed(person,action,courseId){
 if(action==='submit'&&!person?.profiles?.includes('coordinator'))return false;
 if(action==='submit'&&courseId&&!person?.course_ids?.includes(courseId))return false;
 if(['approve','return'].includes(action)&&!person?.profiles?.some(p=>['area','pedagogic','academic','regulation','secretariat'].includes(p)))return false;
 const override=person?.permissions?.actions?.[action];if(typeof override==='boolean')return override;
 return (person?.profiles||[]).some(profile=>{
  if(courseId&&profile==='coordinator'&&!person.course_ids?.includes(courseId))return false;
  if(courseId&&profile==='area'&&!person._areaCourseIds?.includes(courseId)&&!person._actingStages?.some(s=>s.course===courseId&&s.stage==='area'))return false;
  return (person._permissionDefaults||approvedDefaults)[profile]?.actions?.[action]===true;
 });
}
export function effectiveAction(person,action,courseId){const module=['approve','return'].includes(action)?'approvals':action==='ai'?'ai':'matrices';return moduleLevel(person,module,courseId)>=(action==='export'?1:2)&&actionAllowed(person,action,courseId);}
