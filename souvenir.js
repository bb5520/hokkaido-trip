(function(){"use strict";
var KEY="trip_souvenirs",DB="trip_blob_store",ST="blobs";
var items=[],grp="store",view="list",fg="",cpos={},queue=[],qtot=0,ed=null,img="",rcp="",root=null,cache={};
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function on(e,ev,f){e.addEventListener(ev,f);return e}
function ib(c,ic){var b=h("button",c);b.appendChild(h("i","fa-solid "+ic));return b}
function load(){try{var v=JSON.parse(localStorage.getItem(KEY));items=Array.isArray(v)?v:[]}catch(e){items=[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(items));return true}catch(e){toast("儲存空間不足，請刪除部分資料");return false}}
function toast(m){var t=h("div","fixed left-1/2 -translate-x-1/2 bottom-28 z-[95] bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full",m);document.body.appendChild(t);setTimeout(function(){t.remove()},1800)}
function nurl(s){s=(s||"").trim();if(!s)return"";if(!/^https?:\/\//i.test(s))s="https://"+s;try{var u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:""}catch(e){return""}}
function host(u){try{return new URL(u).hostname.replace(/^www\./,"")}catch(e){return u}}
/* 圖片：存在與行程資料相同的 IndexedDB，並交給 sync.js 上傳雲端 */
function odb(){return new Promise(function(r,j){var q=indexedDB.open(DB,1);q.onupgradeneeded=function(){q.result.createObjectStore(ST)};q.onsuccess=function(){r(q.result)};q.onerror=function(){j(q.error)}})}
function iget(id){return odb().then(function(db){return new Promise(function(r){var q=db.transaction(ST).objectStore(ST).get(id);q.onsuccess=function(){r(q.result||null)};q.onerror=function(){r(null)}})}).catch(function(){return null})}
function iput(id,v){return odb().then(function(db){return new Promise(function(r,j){var t=db.transaction(ST,"readwrite");t.objectStore(ST).put(v,id);t.oncomplete=r;t.onerror=function(){j(t.error)}})})}
function blob(id){if(!id)return Promise.resolve(null);if(cache[id])return Promise.resolve(cache[id]);return iget(id).then(function(d){return d||(window.SYNC?window.SYNC.down(id):null)}).then(function(d){if(d)cache[id]=d;return d})}
function setImg(e,id){blob(id).then(function(d){if(d)e.src=d})}
function shrink(f){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var s=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.7))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(f)})}
function store(d){var id="souv_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);return iput(id,d).then(function(){cache[id]=d;if(window.SYNC)window.SYNC.up(id);return id})}
/* 對話框與放大檢視 */
function btn(label,cls,fn){return function(close){var b=h("button","flex-1 font-bold py-2.5 rounded-xl text-sm "+cls,label);on(b,"click",function(){close();if(fn)fn()});return b}}
function dlg(msg,btns){var ov=h("div","fixed inset-0 z-[98] bg-black/45 flex items-center justify-center p-5"),bx=h("div","bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl"),row=h("div","flex gap-2 mt-4");bx.appendChild(h("div","text-center font-bold text-slate-800 whitespace-pre-line break-all",msg));btns.forEach(function(b){row.appendChild(b(function(){ov.remove()}))});bx.appendChild(row);ov.appendChild(bx);document.body.appendChild(ov)}
function ask(msg,fn,label){dlg(msg,[btn("取消","bg-slate-100 text-slate-600"),btn(label||"刪除","bg-red-600 text-white",fn)])}
function askLink(u){dlg("即將開啟外部連結：\n"+host(u)+"\n要前往嗎？",[btn("取消","bg-slate-100 text-slate-600"),function(close){var a=h("a","flex-1 text-center font-bold py-2.5 rounded-xl text-sm bg-ice-600 text-white","前往");a.href=u;a.target="_blank";a.rel="noopener noreferrer";on(a,"click",function(){setTimeout(close,50)});return a}])}
function zoom(ids,i){var ov=h("div","fixed inset-0 z-[90] bg-black/85 flex items-center justify-center p-4"),im=h("img","max-w-full max-h-full rounded-xl"),sx=0,mv=false;
 function show(){blob(ids[i]).then(function(d){if(d)im.src=d})}
 function go(d){if(ids.length<2)return;i=(i+d+ids.length)%ids.length;show()}
 ov.appendChild(im);
 if(ids.length>1)[["‹",-1,"left-3"],["›",1,"right-3"]].forEach(function(a){var b=h("button","absolute top-1/2 -mt-5 "+a[2]+" w-10 h-10 rounded-full bg-white/25 text-white text-2xl",a[0]);on(b,"click",function(e){e.stopPropagation();go(a[1])});ov.appendChild(b)});
 on(ov,"touchstart",function(e){sx=e.changedTouches[0].clientX;mv=false});
 on(ov,"touchend",function(e){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50){mv=true;go(d>0?-1:1)}});
 on(ov,"click",function(){if(mv){mv=false;return}ov.remove()});
 document.body.appendChild(ov);show()}
/* 新增 / 編輯視窗 */
var IC="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none text-base focus:border-ice-500";
function field(l,n){var d=h("div");d.appendChild(h("label","block text-xs font-bold text-slate-600 mb-1",l));d.appendChild(n);return d}
function dl(id,k){var d=h("datalist"),seen={};d.id=id;items.forEach(function(x){if(x[k]&&!seen[x[k]]){seen[x[k]]=1;var o=h("option");o.value=x[k];d.appendChild(o)}});return d}
function tile(label,get,set){
 var w=h("div","relative"),b=h("button","w-full h-24 rounded-xl border-2 border-dashed border-ice-500 bg-ice-50 text-ice-600 text-xs font-bold bg-cover bg-center",label),f=h("input"),x=h("button","absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-800/75 text-white text-xs","✕");
 f.type="file";f.accept="image/*";f.hidden=true;
 function paint(){var id=get();x.style.display=id?"block":"none";b.style.backgroundImage="";b.textContent=id?"":label;if(id)blob(id).then(function(d){if(d&&get()===id)b.style.backgroundImage="url("+d+")"})}
 on(b,"click",function(){f.click()});on(x,"click",function(){set("");paint()});
 on(f,"change",function(){var file=f.files[0];f.value="";if(!file)return;shrink(file).then(store).then(function(id){set(id);paint()}).catch(function(){toast("無法讀取圖片")})});
 w.appendChild(b);w.appendChild(x);w.appendChild(f);paint();return w}
function openSheet(x,hdr){
 ed=x||null;img=x?x.img||"":"";rcp=x?x.rcpt||"":"";
 var ov=h("div","fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"),bx=h("div","bg-white w-full max-w-md rounded-3xl p-5 max-h-[88vh] overflow-y-auto space-y-3");
 var fs=h("input",IC),fw=h("input",IC),fk=h("input",IC),fq=h("input",IC+" text-center"),fn=h("textarea",IC);
 fs.value=x?x.store:(grp==="store"?fg:"");fw.value=x?x.who:(grp==="who"?fg:"");fk.value=x?x.link:"";fq.value=x?x.qty:1;fn.value=x?x.note:"";
 fs.placeholder="例：唐吉訶德";fw.placeholder="例：媽媽";fk.placeholder="https://";fk.type="url";fq.inputMode="numeric";fn.rows=2;fn.placeholder="口味、尺寸、注意事項…";
 fs.maxLength=40;fw.maxLength=20;fk.maxLength=500;fn.maxLength=200;fs.setAttribute("list","sv-stores");fw.setAttribute("list","sv-whos");
 function qv(){var v=parseInt(String(fq.value).replace(/\D/g,""),10);return isFinite(v)&&v>0?Math.min(v,999):1}
 var qr=h("div","flex gap-1.5 items-center"),qm=h("button","w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-xl flex-none","−"),qp=h("button","w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-xl flex-none","＋");
 on(qm,"click",function(){fq.value=Math.max(1,qv()-1)});on(qp,"click",function(){fq.value=Math.min(999,qv()+1)});qr.appendChild(qm);qr.appendChild(fq);qr.appendChild(qp);
 if(hdr)bx.appendChild(h("div","font-bold text-slate-800",hdr));
 bx.appendChild(dl("sv-stores","store"));bx.appendChild(dl("sv-whos","who"));
 bx.appendChild(field("店家",fs));
 var g2=h("div","grid grid-cols-2 gap-2");g2.appendChild(field("數量",qr));g2.appendChild(field("誰要買",fw));bx.appendChild(g2);
 bx.appendChild(field("連結",fk));
 var g3=h("div","grid grid-cols-2 gap-2");g3.appendChild(field("圖片",tile("📷 上傳圖片",function(){return img},function(v){img=v})));g3.appendChild(field("收據",tile("🧾 上傳收據",function(){return rcp},function(v){rcp=v})));bx.appendChild(g3);
 bx.appendChild(field("備註",fn));
 var row=h("div","flex gap-2 pt-1"),cc=h("button","flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl","取消"),sv=h("button","flex-1 bg-ice-600 text-white font-bold py-2.5 rounded-xl",ed?(queue.length?"儲存並下一張":"儲存"):"新增");
 on(cc,"click",function(){queue=[];ov.remove()});on(ov,"click",function(e){if(e.target===ov){queue=[];ov.remove()}});
 on(sv,"click",function(){
  var raw=fk.value.trim(),lk=nurl(raw);if(raw&&!lk){toast("連結格式不正確");return}
  var d={store:fs.value.trim(),qty:qv(),who:fw.value.trim(),link:lk,img:img,rcpt:rcp,note:fn.value.trim()},old=ed?Object.assign({},ed):null,isNew=!ed;
  if(ed)Object.assign(ed,d);else{d.id=Date.now();d.done=false;items.push(d)}
  if(!save()){if(old)Object.assign(ed,old);else if(isNew)items.pop();return}
  ov.remove();draw();if(queue.length)nextQ();else toast(isNew?"已新增":"已儲存")});
 row.appendChild(cc);row.appendChild(sv);bx.appendChild(row);ov.appendChild(bx);document.body.appendChild(ov)}
function nextQ(){var x=queue.shift();if(x)openSheet(x,"📷 第 "+(qtot-queue.length)+" / "+qtot+" 張")}
function batch(files){var fs=files.slice(0,30),added=[],i=0;if(!fs.length)return;toast("處理 "+fs.length+" 張照片…");
 function fin(){if(!added.length){toast("無法讀取圖片");return}added.forEach(function(a){items.push(a)});if(!save())return;draw();queue=added.slice();qtot=added.length;nextQ()}
 (function nx(){if(i>=fs.length)return fin();shrink(fs[i++]).then(store).then(function(id){added.push({id:Date.now()+added.length,store:"",qty:1,who:"",link:"",img:id,rcpt:"",note:"",done:false});nx()}).catch(nx)})()}
/* 畫面 */
function slide(x,idx,arr,sc){
 var c=h("div","flex-none w-full snap-center"),ph=h("div","relative aspect-[4/3] rounded-2xl bg-ice-100 overflow-hidden flex items-center justify-center text-5xl cursor-pointer");
 if(x.img){var im=h("img","w-full h-full object-cover"+(x.done?" opacity-50":""));setImg(im,x.img);ph.appendChild(im);on(ph,"click",function(){var ids=arr.filter(function(y){return y.img}).map(function(y){return y.img});zoom(ids,ids.indexOf(x.img))})}else ph.textContent="🎁";
 ph.appendChild(h("span","absolute left-2.5 bottom-2.5 bg-slate-800/80 text-white text-xs font-bold rounded-lg px-2 py-0.5","× "+x.qty));
 var k=h("button","absolute top-2.5 right-2.5 w-8 h-8 rounded-lg border-2 text-white text-lg leading-none "+(x.done?"bg-emerald-600 border-emerald-600":"bg-white/80 border-slate-300"),x.done?"✓":"");k.setAttribute("aria-label","已購買");
 on(k,"click",function(e){e.stopPropagation();x.done=!x.done;save();draw()});ph.appendChild(k);
 [[-1,"‹","left-2"],[1,"›","right-2"]].forEach(function(d){var j=idx+d[0];if(j<0||j>=arr.length)return;var b=h("button","absolute top-1/2 -mt-4 "+d[2]+" w-8 h-8 rounded-full bg-slate-800/60 text-white text-xl leading-none",d[1]);on(b,"click",function(e){e.stopPropagation();sc.scrollTo({left:j*sc.clientWidth,behavior:"smooth"})});ph.appendChild(b)});
 c.appendChild(ph);
 var si=h("div","flex gap-2 items-start pt-2"),inf=h("div","flex-1 min-w-0 flex flex-col items-start gap-1.5"),bv=grp==="who"?x.store:x.who;
 inf.appendChild(h("span","bg-ice-100 text-ice-700 text-sm font-bold rounded-lg px-2.5 py-1",(grp==="who"?"🏪 ":"👤 ")+(bv||"未填")));
 if(x.note)inf.appendChild(h("div","text-xs text-slate-500",x.note));
 var rw=h("div","flex flex-wrap gap-3");
 if(x.link){var a=h("button","text-xs text-ice-600 font-bold underline","🔗 "+host(x.link));on(a,"click",function(){askLink(x.link)});rw.appendChild(a)}
 if(x.rcpt){var r=h("button","text-xs text-ice-600 font-bold underline","🧾 收據");on(r,"click",function(){var ids=arr.filter(function(y){return y.rcpt}).map(function(y){return y.rcpt});zoom(ids,ids.indexOf(x.rcpt))});rw.appendChild(r)}
 if(rw.children.length)inf.appendChild(rw);
 var col=h("div","flex flex-col"),eb=ib("p-2 text-ice-600","fa-pen"),xb=ib("p-2 text-red-500","fa-trash");eb.setAttribute("aria-label","編輯");xb.setAttribute("aria-label","刪除");
 on(eb,"click",function(){openSheet(x)});on(xb,"click",function(){ask("確定刪除這筆嗎？",function(){var i=items.indexOf(x);if(i>-1)items.splice(i,1);save();draw();toast("已刪除")})});
 col.appendChild(eb);col.appendChild(xb);si.appendChild(inf);si.appendChild(col);c.appendChild(si);return c}
function group(s,arr){
 var key=grp+":"+s,dn=arr.filter(function(x){return x.done}).length,card=h("div","bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100"),hd=h("div","flex justify-between text-sm font-bold text-slate-800 mb-2"),sc=h("div","flex overflow-x-auto snap-x snap-mandatory no-scrollbar");
 hd.appendChild(h("span",null,(grp==="who"?"👤 ":"🏪 ")+s));hd.appendChild(h("span","text-xs text-slate-500 font-medium","已買 "+dn+" / "+arr.length+" 款"));card.appendChild(hd);
 arr.forEach(function(x,i){sc.appendChild(slide(x,i,arr,sc))});card.appendChild(sc);root.appendChild(card);
 var p=Math.min(Math.max(0,cpos[key]||0),arr.length-1);cpos[key]=p;sc.scrollLeft=p*sc.clientWidth;
 on(sc,"scroll",function(){if(sc.clientWidth)cpos[key]=Math.round(sc.scrollLeft/sc.clientWidth)})}
function list(){
 var g={},order=[];items.forEach(function(x){var s=x[grp]||(grp==="who"?"未指定":"未填店家");if(!g[s]){g[s]=[];order.push(s)}g[s].push(x)});
 if(!order.length){root.appendChild(h("div","text-center text-slate-400 text-sm py-8","還沒有項目，點右下角「＋」或「批次上傳照片」開始"));return}
 if(fg&&!g[fg])fg="";
 if(order.length>1){var fl=h("div","flex gap-2 overflow-x-auto no-scrollbar");[""].concat(order).forEach(function(n){var p=h("button","flex-none px-3.5 py-1.5 rounded-2xl text-sm border "+(n===fg?"bg-ice-600 text-white border-ice-600 font-bold":"bg-white text-slate-500 border-slate-100"),n||"全部");on(p,"click",function(){fg=n;draw()});fl.appendChild(p)});root.appendChild(fl)}
 order.forEach(function(s){if(!fg||s===fg)group(s,g[s])})}
function stats(){[["who","未指定","👤 依人統計"],["store","未填店家","🏪 依店家統計"]].forEach(function(s){
 var m={},o=[],c=h("div","bg-white rounded-2xl p-4 shadow-sm border border-slate-100");items.forEach(function(x){var k=x[s[0]]||s[1];if(!(k in m)){m[k]=0;o.push(k)}m[k]++});
 c.appendChild(h("div","text-sm font-bold text-slate-800 mb-2",s[2]));if(!o.length)c.appendChild(h("div","text-xs text-slate-400","尚無資料"));
 o.sort(function(a,b){return m[b]-m[a]}).forEach(function(k){var l=h("div","py-2 border-b border-dashed border-slate-100 last:border-0"),r=h("div","flex justify-between text-sm"),bar=h("div","h-1.5 rounded bg-ice-100 mt-1 overflow-hidden"),i=h("div","h-full bg-ice-600");r.appendChild(h("span",null,k));r.appendChild(h("b",null,m[k]+" 款"));i.style.width=(m[k]/items.length*100)+"%";bar.appendChild(i);l.appendChild(r);l.appendChild(bar);c.appendChild(l)});
 root.appendChild(c)})}
function draw(){
 if(!root)return;root.textContent="";
 var up=h("button","w-full bg-ice-100 text-ice-700 font-bold py-2.5 rounded-xl text-sm","📷 批次上傳照片"),fm=h("input"),sg=h("div","flex gap-1 bg-white border border-slate-100 rounded-2xl p-1");
 fm.type="file";fm.accept="image/*";fm.multiple=true;fm.hidden=true;
 on(up,"click",function(){fm.click()});on(fm,"change",function(){var a=[].slice.call(fm.files);fm.value="";batch(a)});
 [["store","🏪 依店家"],["who","👤 依人"],["stats","📊 統計"]].forEach(function(m){var act=m[0]==="stats"?view==="stats":(view==="list"&&grp===m[0]),b=h("button","flex-1 py-2 rounded-xl text-sm "+(act?"bg-ice-600 text-white font-bold":"text-slate-500"),m[1]);on(b,"click",function(){if(m[0]==="stats")view="stats";else{view="list";grp=m[0];fg=""}draw()});sg.appendChild(b)});
 root.appendChild(up);root.appendChild(fm);root.appendChild(sg);
 if(view==="stats")stats();else list();
 var f=h("button","fixed bottom-24 right-6 w-14 h-14 bg-ice-600 text-white rounded-full shadow-xl flex items-center justify-center text-2xl z-40","＋");f.setAttribute("aria-label","新增伴手禮");on(f,"click",function(){openSheet(null)});root.appendChild(f)}
/* 切到「伴手禮」分頁時，Vue 會建立 #souv-host，這裡偵測到就接手畫面 */
function tryMount(){var r=document.getElementById("souv-host");if(r&&r!==root){root=r;load();draw()}else if(!r)root=null}
new MutationObserver(tryMount).observe(document.documentElement,{childList:true,subtree:true});
})();
