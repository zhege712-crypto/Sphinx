import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../server/worker.mjs';
import {sqliteAdapter} from '../server/local-storage.mjs';
import {publish,reconcile} from '../server/publication.mjs';
import {readerHiddenSource} from '../shared/reader-visibility.mjs';
const ORIGIN='http://127.0.0.1:5173';
const blocks=text=>[{type:'paragraph',content:text}];
async function fixture(t){
 const DB=sqliteAdapter();DB.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));t.after(()=>DB.close());
 const objects=new Map(),env={DB,FILES:{put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{body:objects.get(k),arrayBuffer:async()=>objects.get(k)}:null},APP_ORIGIN:ORIGIN,OWNER_GITHUB_ID:'owner',LOCAL_DEMO:true};
 async function req(path,{method='GET',body,cookie,csrf,origin=ORIGIN}={}){return worker.fetch(new Request(ORIGIN+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{})},...(body!==undefined?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{})}),env);}
 async function login(role){const r=await req('/api/local-session',{method:'POST',body:{role}}),cookie=r.headers.get('set-cookie').split(';')[0];const s=await(await req('/api/session',{cookie})).json();return{cookie,csrf:s.csrf};}
 const owner=await login('owner'),editor=await login('editor');
 const as=(auth,path,method='GET',body)=>req(path,{...auth,method,body});
 const create=async(extra={})=>{const r=await as(owner,'/api/documents','POST',{title:'Visibility test',...extra});assert.equal(r.status,201);return(await r.json()).document;};
 const get=async id=>(await(await as(owner,`/api/documents/${id}`)).json()).document;
 const catalog=async()=>(await(await req('/api/public/catalog')).json()).documents;
 const visibility=async(d,hidden,extra={})=>as(owner,`/api/documents/${d.id}/visibility`,'POST',{version:d.version,expectedHidden:!!d.readerHidden,hidden,...extra});
 const publishDoc=async d=>{const r=await as(editor,`/api/documents/${d.id}/publish`,'POST',{version:d.version});assert.equal(r.status,200,await r.clone().text());};
 return{DB,env,req,as,owner,editor,create,get,catalog,visibility,publishDoc};
}
test('隐藏和恢复只改变阅读可见性，保留正文、版本、历史和已发布快照',async t=>{
 const f=await fixture(t),d=await f.create();await f.publishDoc(d);
 const before=await f.DB.prepare('SELECT * FROM documents WHERE id=?').bind(d.id).first();
 assert.equal((await f.visibility(d,true)).status,200);
 assert.deepEqual(await f.catalog(),[]);
 const hidden=await f.get(d.id);assert.equal(hidden.readerHidden,true);assert.equal(hidden.version,d.version);
 const row=await f.DB.prepare('SELECT * FROM documents WHERE id=?').bind(d.id).first();
 assert.deepEqual({...row,reader_hidden:0},{...before});
 const save=await f.as(f.editor,`/api/documents/${d.id}`,'PUT',{title:'Secret revision',version:1,blocks:blocks('SECRET DRAFT')});assert.equal(save.status,200);
 const revised=(await save.json()).document;
 assert.equal(revised.readerHidden,true);
 assert.equal((await f.visibility(revised,false)).status,200);
 const restored=(await f.catalog())[0];assert.equal(restored.title,d.title);assert.equal(restored.version,1);assert.doesNotMatch(JSON.stringify(restored),/SECRET|Secret/);
 assert.equal((await f.get(d.id)).title,'Secret revision');
 assert.equal((await(await f.as(f.owner,`/api/documents/${d.id}/history`)).json()).revisions.length,1);
});
test('隐藏目录覆盖所有后代，恢复保留单独隐藏项，发布或排序不重新显示',async t=>{
 const f=await fixture(t),parent=await f.create({kind:'folder',title:'Parent'}),child=await f.create({parentId:parent.id,title:'Child'}),nested=await f.create({kind:'folder',parentId:parent.id}),grandchild=await f.create({parentId:nested.id,title:'Grandchild'}),independent=await f.create({title:'Independent'});
 for(const d of[parent,child,nested,grandchild,independent])await f.publishDoc(d);
 assert.equal((await f.visibility(child,true)).status,200);
 assert.equal((await f.visibility(parent,true)).status,200);
 assert.deepEqual((await f.catalog()).map(x=>x.id),[independent.id]);
 await f.publishDoc(grandchild);await f.publishDoc(independent);
 await publish(f.env,{id:'local-owner'},[{id:independent.id,expectedVersion:1,reorder:{position:40}}]);
 assert.deepEqual((await f.catalog()).map(x=>x.id),[independent.id]);
 assert.equal((await f.visibility(await f.get(parent.id),false)).status,200);
 const visible=(await f.catalog()).map(x=>x.id);assert.ok(visible.includes(grandchild.id));assert.ok(!visible.includes(child.id));
 const list=(await(await f.as(f.owner,'/api/documents')).json()).documents;
 assert.equal(list.length,5);assert.equal(readerHiddenSource(list.find(d=>d.id===child.id),list).id,child.id);
});
test('隐藏中的新发布和素材继续不对外暴露，恢复时只公开已确认的版本与图片',async t=>{
 const f=await fixture(t),d=await f.create({kind:'reference'});assert.equal((await f.visibility(d,true)).status,200);
 const image=await(await f.as(f.owner,'/api/assets','POST',Uint8Array.from([137,80,78,71,13,10,26,10,0,0]))).json();
 let r=await f.as(f.editor,`/api/documents/${d.id}`,'PUT',{title:d.title,version:1,blocks:[{type:'image',props:{url:image.url}},...blocks('Approved while hidden')],valhalla:{enabled:true,blocks:blocks('Hidden evaluation')}});assert.equal(r.status,200);
 await f.publishDoc((await r.json()).document);
 assert.deepEqual(await f.catalog(),[]);assert.equal((await f.req(`/assets/${image.id}.png`)).status,404);
 r=await f.as(f.editor,`/api/documents/${d.id}`,'PUT',{title:d.title,version:2,blocks:blocks('Unapproved revision')});assert.equal(r.status,200);
 assert.equal((await f.visibility((await r.json()).document,false)).status,200);
 const restored=(await f.catalog())[0];assert.match(restored.text,/Approved while hidden/);assert.match(restored.valhalla.text,/Hidden evaluation/);assert.doesNotMatch(JSON.stringify(restored),/Unapproved/);
 assert.equal((await f.req(`/assets/${image.id}.png`)).status,200);
});
test('匿名、伙伴、跨站、缺失令牌、无效参数和过期可见性均无法修改',async t=>{
 const f=await fixture(t),d=await f.create(),url=`/api/documents/${d.id}/visibility`,body={version:1,hidden:true,expectedHidden:false};
 assert.equal((await f.req(url,{method:'POST',body})).status,401);
 assert.equal((await f.as(f.editor,url,'POST',body)).status,403);
 assert.equal((await f.req(url,{method:'POST',body,cookie:f.owner.cookie})).status,403);
 assert.equal((await f.req(url,{method:'POST',body,...f.owner,origin:'https://elsewhere.example'})).status,403);
 for(const invalid of[{...body,hidden:'true'},{...body,expectedHidden:undefined}])assert.equal((await f.as(f.owner,url,'POST',invalid)).status,400);
 assert.equal((await f.as(f.owner,url,'POST',{...body,version:0})).status,409);
 assert.equal((await f.as(f.owner,url,'POST',body)).status,200);
 assert.equal((await f.as(f.owner,url,'POST',{...body,hidden:false})).status,409);
 assert.equal((await f.req(`/api/documents/${d.id}`)).status,401);
});
test('静态发布目录同样移除隐藏正文，恢复不夹带草稿；结果不明确时可持久恢复',async t=>{
 const f=await fixture(t),d=await f.create();await f.publishDoc(d);
 await f.as(f.owner,`/api/documents/${d.id}`,'PUT',{title:'Private title',version:1,blocks:blocks('PRIVATE')});
 f.env.LOCAL_DEMO=false;f.env.GITHUB_REPOSITORY='example/guide';f.env.GITHUB_PUBLISH_TOKEN='test-server-only';
 let submitted;
 f.env.GITHUB_FETCH=async(url,options)=>{const path=url.split('example/guide/')[1];if(path==='git/trees')submitted=JSON.parse(JSON.parse(options.body).tree.find(x=>x.path==='public/catalog.json').content);return new Response(JSON.stringify(path==='git/ref/heads/main'?{object:{sha:'old'}}:path==='git/commits/old'?{tree:{sha:'tree'}}:{sha:'next'}));};
 assert.equal((await f.visibility(await f.get(d.id),true)).status,200);assert.deepEqual(submitted.documents,[]);
 assert.equal((await f.visibility(await f.get(d.id),false)).status,200);assert.equal(submitted.documents[0].title,d.title);assert.doesNotMatch(JSON.stringify(submitted),/PRIVATE|Private title/);
 f.env.GITHUB_FETCH=async()=>{throw new Error('network');};
 assert.equal((await f.visibility(await f.get(d.id),true)).status,500);assert.equal((await f.get(d.id)).readerHidden,false);
 const job=await f.DB.prepare("SELECT * FROM publication_jobs WHERE status='pending'").first();assert.ok(job);
 assert.equal((await f.visibility(await f.get(d.id),true)).status,409);
 await f.DB.prepare('UPDATE publication_jobs SET created_at=? WHERE id=?').bind('2020-01-01T00:00:00Z',job.id).run();
 f.env.GITHUB_FETCH=async()=>new Response(JSON.stringify({content:btoa(JSON.stringify({publicationIds:[job.id]}))}));
 assert.equal((await reconcile(f.env)).recovered,1);assert.equal((await f.get(d.id)).readerHidden,true);assert.deepEqual(await f.catalog(),[]);
});
test('未发布项恢复仍不公开；移动时沿用新上级可见性；迁移不改变旧数据',async t=>{
 const f=await fixture(t),draft=await f.create();await f.visibility(draft,true);await f.visibility(await f.get(draft.id),false);assert.deepEqual(await f.catalog(),[]);
 const parent=await f.create({kind:'folder'}),child=await f.create({parentId:parent.id});await f.publishDoc(child);await f.visibility(parent,true);assert.deepEqual(await f.catalog(),[]);
 const snapshot=JSON.parse((await f.DB.prepare('SELECT published FROM documents WHERE id=?').bind(child.id).first()).published);
 await publish(f.env,{id:'local-owner'},[{id:child.id,expectedVersion:1,move:{parentId:null,position:1},snapshot:{...snapshot,parentId:null}}]);assert.equal((await f.catalog())[0].id,child.id);
 const DB=sqliteAdapter();t.after(()=>DB.close());const schema=(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8')).replace(',\n  reader_hidden INTEGER NOT NULL DEFAULT 0 CHECK(reader_hidden IN (0,1))','');DB.exec(schema);
 await DB.prepare('INSERT INTO documents(id,title,draft,published,version,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)').bind('old','Title','[]','{"title":"Snapshot"}',8,'original-time','owner').run();
 DB.exec(await readFile(new URL('../server/migrations/0004-reader-visibility.sql',import.meta.url),'utf8'));
 const old=await DB.prepare('SELECT * FROM documents WHERE id=?').bind('old').first();assert.equal(old.reader_hidden,0);assert.equal(old.version,8);assert.equal(old.updated_at,'original-time');assert.equal(old.published,'{"title":"Snapshot"}');
});
