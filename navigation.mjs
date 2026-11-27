export function canShowPage(person,page,moduleLevel){
 const admin=person?.profiles?.includes('admin')===true;
 if(page==='settings')return admin;
 if(['users','audit'].includes(page)&&!admin)return false;
 return moduleLevel(page==='audit'?'users':page)>0;
}
export function navigationMarkup(titles,person,page,moduleLevel){
 const group=['regulations','courses','users','areas'];
 const names={users:'Cadastro de Usuários e Permissões',areas:'Cadastro de áreas internas'};
 const icons={dashboard:'▦',regulations:'▣',courses:'▤',users:'♙',areas:'▦',matrices:'▥',approvals:'✓',history:'◷',notifications:'✉',ai:'✦',settings:'⚙',documents:'▤',substitutions:'⇄',audit:'☷'};
 const visible=k=>canShowPage(person,k,moduleLevel);
 const button=k=>`<button data-nav="${k}" class="${k===page?'active':''}" ${k===page?'aria-current="page"':''}><span aria-hidden="true">${icons[k]||'▤'}</span><span class="nav-label">${names[k]||titles[k]}</span></button>`;
 const cadastros=group.filter(visible);
 return (visible('dashboard')?button('dashboard'):'')+(cadastros.length?`<details class="nav-cadastros" open><summary><span aria-hidden="true">▤</span><span class="nav-label">Cadastros</span></summary><div class="nav-subitems">${cadastros.map(button).join('')}</div></details>`:'')+Object.keys(titles).filter(k=>k!=='dashboard'&&!group.includes(k)&&visible(k)).map(button).join('');
}
