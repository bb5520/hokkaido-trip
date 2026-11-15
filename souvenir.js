(function(){"use strict";
var KEY="trip_souvenirs",DB="trip_blob_store",ST="blobs";
var items=[],grp="store",view="list",fg="",cpos={},queue=[],qtot=0,ed=null,img="",rcp="",root=null,cache={};
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function on(e,ev,f){e.addEventListener(ev,f);return e}
function fi(c){return h("i","fa-solid "+c)}
function ib(c,i){var b=h("button",c);b.appendChild(fi(i));return b}
function lab(c,i,t){var s=h("span",c);s.appendChild(fi(i));s.appendChild(h("span",null,t));return s}
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
function dlg(msg,btns){var ov=h("div","fixed inset-0 z-[98] bg-black/45 flex items-center justify-center p-5"),bx=h("div","bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl"),row=h("div","flex gap-2 mt-4");bx.appendChild(h("div","text-center font-bold text-slate-800 text-sm whitespace-pre-line break-all",msg));btns.forEach(function(b){row.appendChild(b(function(){ov.remove()}))});bx.appendChild(row);ov.appendChild(bx);document.body.appendChild(ov)}
function ask(msg,fn,label){dlg(msg,[btn("取消","bg-slate-100 text-slate-600"),btn(label||"刪除","bg-red-600 text-white",fn)])}
function askLink(u){dlg("即將開啟外部連結：\n"+host(u)+"\n要前往嗎？",[btn("取消","bg-slate-100 text-slate-600"),function(close){var a=h("a","flex-1 text-center font-bold py-2.5 rounded-xl text-sm bg-ice-600 text-white","前往");a.href=u;a.target="_blank";a.rel="noopener noreferrer";on(a,"click",function(){setTimeout(close,50)});return a}])}
function zoom(ids,i){
 var ov=h("div","fixed inset-0 bg-black/85 z-[65] flex flex-col"),tp=h("div","flex justify-between items-center p-4 text-white flex-shrink-0"),ct=h("span","text-sm font-medium"),x=h("button","text-white"),mid=h("div","flex-1 relative overflow-hidden flex items-center justify-center px-2"),im=h("img","max-w-full max-h-full object-contain select-none"),dots=h("div","flex justify-center gap-1.5 p-4 flex-shrink-0"),sx=0;
 x.appendChild(h("i","fa-solid fa-xmark text-2xl"));tp.appendChild(ct);tp.appendChild(x);
 function show(){ct.textContent=(i+1)+" / "+ids.length;blob(ids[i]).then(function(d){if(d)im.src=d});dots.textContent="";if(ids.length>1)ids.forEach(function(_,k){var d=h("span","h-1.5 rounded-full cursor-pointer "+(k===i?"bg-white w-3":"bg-white/40 w-1.5"));on(d,"click",function(e){e.stopPropagation();i=k;show()});dots.appendChild(d)})}
 function go(d){if(ids.length<2)return;i=(i+d+ids.length)%ids.length;show()}
 on(mid,"touchstart",function(e){sx=e.changedTouches[0].clientX});
 on(mid,"touchend",function(e){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(d>0?-1:1)});
 on(x,"click",function(){ov.remove()});on(ov,"click",function(e){if(e.target===ov||e.target===mid)ov.remove()});
 mid.appendChild(im);ov.appendChild(tp);ov.appendChild(mid);ov.appendChild(dots);document.body.appendChild(ov);show()}
/* 新增 / 編輯視窗（版型與其他分頁的新增視窗一致） */
var IC="w-full bg-slate-50 border p-2.5 rounded-xl outline-none";
function field(l,n){var d=h("div");d.appendChild(h("label","block font-bold text-slate-600 mb-1",l));d.appendChild(n);return d}
function dl(id,k){var d=h("datalist"),seen={};d.id=id;items.forEach(function(x){if(x[k]&&!seen[x[k]]){seen[x[k]]=1;var o=h("option");o.value=x[k];d.appendChild(o)}});return d}
function tile(label,icon,get,set,ui){
 var w=h("div","relative"),b=h("button","w-full aspect-square rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold bg-cover bg-center flex flex-col items-center justify-center gap-1.5"),f=h("input"),x=h("button","absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-800/75 text-white text-xs flex items-center justify-center");
 b.type="button";x.type="button";f.type="file";f.accept="image/*";f.hidden=true;x.appendChild(h("i","fa-solid fa-xmark"));
 function paint(){var id=get();x.style.display=id?"flex":"none";b.style.backgroundImage="";b.textContent="";b.classList.toggle("border-dashed",!id);b.classList.toggle("border-solid",!!id);
  if(!id){b.appendChild(h("i","fa-solid "+icon+" text-2xl"));b.appendChild(h("span",null,label));return}
  blob(id).then(function(d){if(d&&get()===id)b.style.backgroundImage="url("+d+")"})}
 on(b,"click",function(){f.click()});on(x,"click",function(){set("");paint()});
 on(f,"change",function(){var file=f.files[0];f.value="";if(!file)return;ui.n++;ui.upd();shrink(file).then(store).then(function(id){set(id);paint()}).catch(function(){toast("無法讀取圖片")}).then(function(){ui.n--;ui.upd()})});
 w.appendChild(b);w.appendChild(x);w.appendChild(f);paint();return w}
function openSheet(x,sub){
 ed=x||null;img=x?x.img||"":"";rcp=x?x.rcpt||"":"";
 var ov=h("div","fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"),bx=h("div","bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"),hd=h("div","flex justify-between items-center border-b pb-2"),xb=h("button","text-slate-400"),body=h("div","space-y-3 text-xs");
 hd.appendChild(h("h3","font-bold text-slate-800",sub?"批次新增伴手禮（"+sub+"）":(ed?"編輯伴手禮":"新增伴手禮")));xb.appendChild(h("i","fa-solid fa-xmark text-lg"));hd.appendChild(xb);
 var fs=h("input",IC),fw=h("input",IC),fk=h("input",IC),fq=h("input",IC),fn=h("textarea",IC);
 fs.value=x?x.store:(grp==="store"?fg:"");fw.value=x?x.who:(grp==="who"?fg:"");fk.value=x?x.link:"";fq.value=x?x.qty:1;fn.value=x?x.note:"";
 fs.type="text";fw.type="text";fk.type="url";fq.type="number";fq.min="1";fs.placeholder="例如: 唐吉訶德";fw.placeholder="例如: 媽媽";fk.placeholder="https://";fq.placeholder="1";fn.rows=2;
 fs.maxLength=40;fw.maxLength=20;fk.maxLength=500;fn.maxLength=200;fs.setAttribute("list","sv-stores");fw.setAttribute("list","sv-whos");
 function qv(){var v=parseInt(String(fq.value).replace(/\D/g,""),10);return isFinite(v)&&v>0?Math.min(v,999):1}
 var sp=h("div","text-[11px] text-ice-600 mt-1"),ui={n:0,upd:function(){sp.style.display=ui.n?"block":"none";sv.disabled=ui.n>0;sv.className="flex-1 font-bold py-2.5 rounded-xl "+(ui.n?"bg-slate-300 text-slate-500 cursor-not-allowed":"bg-ice-600 text-white");sv.textContent=ui.n?"讀取中...":lab}};
 sp.appendChild(h("i","fa-solid fa-spinner fa-spin mr-1"));sp.appendChild(document.createTextNode("檔案讀取中，請稍候..."));sp.style.display="none";
 var lab=ed?(queue.length?"儲存並下一張":"儲存"):"儲存",sv=h("button","flex-1 bg-ice-600 text-white font-bold py-2.5 rounded-xl",lab),ft=h("div","flex gap-2 pt-2");
 body.appendChild(dl("sv-stores","store"));body.appendChild(dl("sv-whos","who"));
 body.appendChild(field("店家",fs));
 var g2=h("div","grid grid-cols-2 gap-2");g2.appendChild(field("數量",fq));g2.appendChild(field("誰要買",fw));body.appendChild(g2);
 body.appendChild(field("連結",fk));
 var g3=h("div","grid grid-cols-2 gap-2");g3.appendChild(field("圖片",tile("上傳圖片","fa-image",function(){return img},function(v){img=v},ui)));g3.appendChild(field("收據",tile("上傳收據","fa-receipt",function(){return rcp},function(v){rcp=v},ui)));body.appendChild(g3);body.appendChild(sp);
 
 body.appendChild(field("備註",fn));
 if(ed&&!sub){var del=h("button","flex-1 bg-red-100 text-red-600 font-bold py-2.5 rounded-xl","刪除");on(del,"click",function(){ask("確定刪除這筆嗎？",function(){var i=items.indexOf(ed);if(i>-1)items.splice(i,1);save();ov.remove();draw();toast("已刪除")})});ft.appendChild(del)}
 on(xb,"click",function(){queue=[];ov.remove()});
 on(sv,"click",function(){
  var raw=fk.value.trim(),lk=nurl(raw);if(raw&&!lk){toast("連結格式不正確");return}
  var d={store:fs.value.trim(),qty:qv(),who:fw.value.trim(),link:lk,img:img,rcpt:rcp,note:fn.value.trim()},old=ed?Object.assign({},ed):null,isNew=!ed;
  if(ed)Object.assign(ed,d);else{d.id=Date.now();d.done=false;items.push(d)}
  if(!save()){if(old)Object.assign(ed,old);else if(isNew)items.pop();return}
  ov.remove();draw();if(queue.length)nextQ();else toast(isNew?"已新增":"已儲存")});
 ft.appendChild(sv);bx.appendChild(hd);bx.appendChild(body);bx.appendChild(ft);ov.appendChild(bx);document.body.appendChild(ov)}
function nextQ(){var x=queue.shift();if(x)openSheet(x,"批次上傳 第 "+(qtot-queue.length)+" / "+qtot+" 張")}
function batch(files){var fs=files.slice(0,30),added=[],i=0;if(!fs.length)return;toast("處理 "+fs.length+" 張照片…");
 function fin(){if(!added.length){toast("無法讀取圖片");return}added.forEach(function(a){items.push(a)});if(!save())return;draw();queue=added.slice();qtot=added.length;nextQ()}
 (function nx(){if(i>=fs.length)return fin();shrink(fs[i++]).then(store).then(function(id){added.push({id:Date.now()+added.length,store:"",qty:1,who:"",link:"",img:id,rcpt:"",note:"",done:false});nx()}).catch(nx)})()}
/* 畫面 */
function ico(c,i,t){var e=h(c.tag||"span",c.cls),k=h("i","fa-solid "+i+(t?" mr-1":""));e.appendChild(k);if(t)e.appendChild(document.createTextNode(t));return e}
function slide(x,idx,arr,sc){
 var c=h("div","flex-none w-full snap-center"),ph=h("div","relative aspect-[4/3] rounded-2xl bg-ice-100 overflow-hidden flex items-center justify-center text-5xl cursor-pointer");
 if(x.img){var im=h("img","w-full h-full object-cover"+(x.done?" opacity-50":""));setImg(im,x.img);ph.appendChild(im);on(ph,"click",function(){var ids=arr.filter(function(y){return y.img}).map(function(y){return y.img});zoom(ids,ids.indexOf(x.img))})}else ph.appendChild(h("i","fa-solid fa-gift text-ice-500"));
 ph.appendChild(h("span","absolute left-2.5 bottom-2.5 bg-slate-800/80 text-white text-xs font-bold rounded-lg px-2 py-0.5","× "+x.qty));
 var k=h("button","absolute top-2.5 right-2.5 w-8 h-8 rounded-lg border-2 flex items-center justify-center "+(x.done?"bg-ice-600 border-ice-600 text-white":"bg-white/80 border-slate-300"));k.setAttribute("aria-label","已購買");if(x.done)k.appendChild(h("i","fa-solid fa-check text-sm"));
 on(k,"click",function(e){e.stopPropagation();x.done=!x.done;save();draw()});ph.appendChild(k);
 [[-1,"fa-chevron-left","left-2"],[1,"fa-chevron-right","right-2"]].forEach(function(d){var j=idx+d[0];if(j<0||j>=arr.length)return;var b=ib("absolute top-1/2 -mt-4 "+d[2]+" w-8 h-8 rounded-full bg-slate-800/60 text-white text-xs flex items-center justify-center",d[1]);on(b,"click",function(e){e.stopPropagation();sc.scrollTo({left:j*sc.clientWidth,behavior:"smooth"})});ph.appendChild(b)});
 c.appendChild(ph);
 var si=h("div","flex gap-2 items-start pt-2.5"),inf=h("div","flex-1 min-w-0 flex flex-col items-start gap-1.5 text-xs"),bv=grp==="who"?x.store:x.who,bd=h("span","bg-ice-100 text-ice-700 text-xs font-bold rounded-lg px-2.5 py-1");
 bd.appendChild(h("i","fa-solid "+(grp==="who"?"fa-store":"fa-user")+" mr-1"));bd.appendChild(document.createTextNode(bv||"未填"));inf.appendChild(bd);
 if(x.note){var nt=h("div","flex items-start text-slate-600");nt.appendChild(h("i","fa-regular fa-sticky-note w-4 text-slate-400 mt-0.5"));nt.appendChild(document.createTextNode("備註: "+x.note));inf.appendChild(nt)}
 if(x.link){var a=h("button","text-ice-600 font-bold flex items-center gap-1");a.appendChild(h("i","fa-solid fa-link"));a.appendChild(document.createTextNode(host(x.link)));on(a,"click",function(){askLink(x.link)});inf.appendChild(a)}
 if(x.rcpt){var r=h("button","text-ice-600 font-bold flex items-center gap-1");r.appendChild(h("i","fa-solid fa-receipt"));r.appendChild(document.createTextNode("查看收據"));on(r,"click",function(){var ids=arr.filter(function(y){return y.rcpt}).map(function(y){return y.rcpt});zoom(ids,ids.indexOf(x.rcpt))});inf.appendChild(r)}
 var col=h("div","flex items-center gap-3 flex-shrink-0 pt-1"),eb=ib("text-slate-400 hover:text-ice-600","fa-pen text-xs"),xb=ib("text-red-400 hover:text-red-600","fa-trash text-xs");eb.setAttribute("aria-label","編輯");xb.setAttribute("aria-label","刪除");
 on(eb,"click",function(){openSheet(x)});on(xb,"click",function(){ask("確定刪除這筆嗎？",function(){var i=items.indexOf(x);if(i>-1)items.splice(i,1);save();draw();toast("已刪除")})});
 col.appendChild(eb);col.appendChild(xb);si.appendChild(inf);si.appendChild(col);c.appendChild(si);return c}
function group(s,arr){
 var key=grp+":"+s,dn=arr.filter(function(x){return x.done}).length,card=h("div","bg-white rounded-2xl p-4 shadow-sm border border-slate-100"),hd=h("div","flex justify-between items-center mb-3"),t=h("h2","text-sm font-bold text-slate-800 flex items-center gap-2"),sc=h("div","flex overflow-x-auto snap-x snap-mandatory no-scrollbar");
 t.appendChild(h("i","fa-solid "+(grp==="who"?"fa-user":"fa-store")+" text-ice-600"));t.appendChild(document.createTextNode(s));hd.appendChild(t);hd.appendChild(h("span","text-[11px] text-slate-400","已買 "+dn+" / "+arr.length+" 款"));card.appendChild(hd);
 arr.forEach(function(x,i){sc.appendChild(slide(x,i,arr,sc))});card.appendChild(sc);root.appendChild(card);
 var p=Math.min(Math.max(0,cpos[key]||0),arr.length-1);cpos[key]=p;sc.scrollLeft=p*sc.clientWidth;
 on(sc,"scroll",function(){if(sc.clientWidth)cpos[key]=Math.round(sc.scrollLeft/sc.clientWidth)})}
function list(){
 var g={},order=[];items.forEach(function(x){var s=x[grp]||(grp==="who"?"未指定":"未填店家");if(!g[s]){g[s]=[];order.push(s)}g[s].push(x)});
 if(!order.length){root.appendChild(h("div","text-slate-400 text-center py-6 text-sm","尚未新增伴手禮"));return}
 if(fg&&!g[fg])fg="";
 if(order.length>1){var fl=h("div","flex gap-2 overflow-x-auto no-scrollbar py-1");[""].concat(order).forEach(function(n){var p=h("button","flex-none px-3 py-1.5 rounded-xl text-xs font-medium "+(n===fg?"bg-ice-600 text-white font-bold shadow-sm":"bg-white text-slate-600 border border-slate-100 shadow-sm"),n||"全部");on(p,"click",function(){fg=n;draw()});fl.appendChild(p)});root.appendChild(fl)}
 order.forEach(function(s){if(!fg||s===fg)group(s,g[s])})}
function stats(){[["who","未指定","fa-user","依人統計"],["store","未填店家","fa-store","依店家統計"]].forEach(function(s){
 var m={},o=[],c=h("div","bg-white rounded-2xl p-4 shadow-sm border border-slate-100"),t=h("h2","text-sm font-bold text-slate-800 mb-3 flex items-center gap-2");items.forEach(function(x){var k=x[s[0]]||s[1];if(!(k in m)){m[k]=0;o.push(k)}m[k]++});
 t.appendChild(h("i","fa-solid "+s[2]+" text-ice-600"));t.appendChild(document.createTextNode(s[3]));c.appendChild(t);if(!o.length)c.appendChild(h("div","text-xs text-slate-400 text-center py-2","尚無資料"));
 o.sort(function(a,b){return m[b]-m[a]}).forEach(function(k){var l=h("div","py-2 border-b border-dashed border-slate-100 last:border-0 text-xs"),r=h("div","flex justify-between"),bar=h("div","h-1.5 rounded bg-ice-100 mt-1 overflow-hidden"),i=h("div","h-full bg-ice-600");r.appendChild(h("span","text-slate-600",k));r.appendChild(h("b","text-slate-800",m[k]+" 款"));i.style.width=(m[k]/items.length*100)+"%";bar.appendChild(i);l.appendChild(r);l.appendChild(bar);c.appendChild(l)});
 root.appendChild(c)})}
function draw(){
 if(!root)return;root.textContent="";
 var up=h("button","w-full flex items-center justify-center gap-1.5 bg-ice-50 text-ice-700 font-bold py-2.5 rounded-xl text-sm border border-ice-100 hover:bg-ice-100 active:scale-95 transition"),fm=h("input"),sg=h("div","flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm");
 up.appendChild(h("i","fa-solid fa-camera"));up.appendChild(document.createTextNode("批次上傳照片"));
 fm.type="file";fm.accept="image/*";fm.multiple=true;fm.hidden=true;
 on(up,"click",function(){fm.click()});on(fm,"change",function(){var a=[].slice.call(fm.files);fm.value="";batch(a)});
 [["store","fa-store","依店家"],["who","fa-user","依人"],["stats","fa-chart-bar","統計"]].forEach(function(m){var act=m[0]==="stats"?view==="stats":(view==="list"&&grp===m[0]),b=h("button","flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 "+(act?"bg-ice-600 text-white font-bold":"text-slate-500 font-medium"));b.appendChild(h("i","fa-solid "+m[1]));b.appendChild(document.createTextNode(m[2]));on(b,"click",function(){if(m[0]==="stats")view="stats";else{view="list";grp=m[0];fg=""}draw()});sg.appendChild(b)});
 root.appendChild(up);root.appendChild(fm);root.appendChild(sg);
 if(view==="stats")stats();else list();
 var f=ib("fixed bottom-24 right-6 w-14 h-14 bg-ice-600 text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-ice-700 active:scale-95 transition z-40","fa-plus");f.setAttribute("aria-label","新增伴手禮");on(f,"click",function(){openSheet(null)});root.appendChild(f)}
/* 切到「伴手禮」分頁時，Vue 會建立 #souv-host，這裡偵測到就接手畫面 */
function tryMount(){var r=document.getElementById("souv-host");if(r&&r!==root){root=r;load();draw()}else if(!r)root=null}
new MutationObserver(tryMount).observe(document.documentElement,{childList:true,subtree:true});
})();
