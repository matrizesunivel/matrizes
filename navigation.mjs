export function canShowPage(person,page,moduleLevel){
 const admin=person?.profiles?.includes('admin')===true;
 if(page==='settings')return admin;
 if(['users','audit'].includes(page)&&!admin)return false;
 return moduleLevel(page==='audit'?'users':page)>0;
}
