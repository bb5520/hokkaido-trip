(function(){"use strict";
/* 所有按鈕按下時縮小（與「登出」按鈕一致），伴手禮頁面與彈出視窗都適用 */
if(!document.getElementById("sv-press")){var pst=document.createElement("style");pst.id="sv-press";pst.textContent="button{transition:transform .12s ease}button:not(:disabled):active,button.sv-down:not(:disabled){transform:scale(.95)}";(document.head||document.documentElement).appendChild(pst)}
/* iPhone 的 :active 常常不會觸發，所以用觸控事件手動加上「按下」狀態 */
var pb=null;
function pdown(e){var b=e.target&&e.target.closest?e.target.closest("button"):null;if(b&&!b.disabled){pb=b;b.classList.add("sv-down")}}
function pup(){if(pb){pb.classList.remove("sv-down");pb=null}}
document.addEventListener("touchstart",pdown,{passive:true});
document.addEventListener("touchend",pup,{passive:true});
document.addEventListener("touchcancel",pup,{passive:true});
document.addEventListener("touchmove",function(e){if(!pb)return;var t=e.touches[0],el=t&&document.elementFromPoint(t.clientX,t.clientY);if(!el||!pb.contains(el))pup()},{passive:true});
/* ===== 全域提醒（行程、資訊、花費、設定等所有分頁） ===== */
window.appToast=function(m){toast(m)};
var nalert=window.alert.bind(window);
window.alert=function(m){m=String(m==null?"":m);if(/重新載入/.test(m)){nalert(m);return}toast(m)};
document.addEventListener("click",function(e){
 var b=e.target&&e.target.closest?e.target.closest("button"):null;if(!b||b.disabled||b.closest("#souv-host"))return;
 var md=b.closest(".fixed.inset-0");if(md&&md.className.indexOf("z-[98]")>-1)return;
 var h3=md&&md.querySelector("h3"),ttl=h3?h3.textContent:"";if(/伴手禮/.test(ttl))return;
 var t=(b.textContent||"").trim(),msg="";
 if(md&&/^儲存/.test(t))msg=/^(新增|記錄)/.test(ttl)?"已新增":"已儲存";
 else if(md&&t==="刪除")msg="已刪除";
 else if(md&&/^更新.+/.test(t))msg=t.replace(/^更新/,"")+"已更新";
 else if(!md&&b.querySelector(".fa-trash"))msg="已刪除";
 if(!msg)return;
 setTimeout(function(){if(!document.body.contains(b))toast(msg)},350)});
var oclk=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(this.download&&/^TripBackup_/.test(this.download))toast("已匯出備份");return oclk.apply(this,arguments)};
var KEY="trip_souvenirs",DB="trip_blob_store",ST="blobs";
var items=[],grp="store",view="list",fg="",cpos={},queue=[],qtot=0,ed=null,img="",rcp="",root=null,cache={};
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function on(e,ev,f){e.addEventListener(ev,f);return e}
function fi(c){return h("i","fa-solid "+c)}
function ib(c,i){var b=h("button",c);b.appendChild(fi(i));return b}
function lab(c,i,t){var s=h("span",c);s.appendChild(fi(i));s.appendChild(h("span",null,t));return s}
function load(){try{var v=JSON.parse(localStorage.getItem(KEY));items=Array.isArray(v)?v:[]}catch(e){items=[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(items));return true}catch(e){toast("儲存空間不足，請刪除部分資料");return false}}
var tt=null,tto=0;
function toast(m){if(tt)tt.remove();clearTimeout(tto);m=String(m);var t=h("div","fixed left-1/2 -translate-x-1/2 bottom-28 z-[95] bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full max-w-[90vw] text-center",m);tt=t;document.body.appendChild(t);tto=setTimeout(function(){t.remove();if(tt===t)tt=null},1800+Math.min(2200,m.length*30))}
function nurl(s){s=(s||"").trim();if(!s)return"";if(!/^https?:\/\//i.test(s))s="https://"+s;try{var u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:""}catch(e){return""}}
function cp(o){return JSON.parse(JSON.stringify(o))}
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function idx(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return i;return -1}
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
function zoom(ids,i,cb){
 var ov=h("div","fixed inset-0 bg-black/85 z-[65] flex flex-col"),tp=h("div","flex justify-between items-center p-4 text-white flex-shrink-0"),ct=h("span","text-sm font-medium"),x=h("button","text-white"),mid=h("div","flex-1 relative overflow-hidden flex items-center justify-center px-2"),im=h("img","max-w-full max-h-full object-contain select-none"),dots=h("div","flex justify-center gap-1.5 p-4 flex-shrink-0"),
 z=1,px=0,py=0,pd=0,pz=1,ds=null,lt=0,sx=0,multi=false;
 x.appendChild(h("i","fa-solid fa-xmark text-2xl"));tp.appendChild(ct);tp.appendChild(x);
 mid.style.touchAction="none";im.draggable=false;im.style.transition="transform .12s ease-out";
 function clamp(){var iw=im.offsetWidth*z,ih=im.offsetHeight*z,mx=Math.max(0,(iw-mid.clientWidth)/2)+10,my=Math.max(0,(ih-mid.clientHeight)/2)+10;px=Math.min(mx,Math.max(-mx,px));py=Math.min(my,Math.max(-my,py))}
 function ap(){clamp();im.style.transform="translate("+px+"px,"+py+"px) scale("+z+")"}
 function rz(){z=1;px=0;py=0;ap()}
 function show(){rz();if(cb)cb(i);ct.textContent=(i+1)+" / "+ids.length;blob(ids[i]).then(function(d){if(d)im.src=d});dots.textContent="";if(ids.length>1)ids.forEach(function(_,k){var d=h("span","h-1.5 rounded-full cursor-pointer "+(k===i?"bg-white w-3":"bg-white/40 w-1.5"));on(d,"click",function(e){e.stopPropagation();i=k;show()});dots.appendChild(d)})}
 function go(d){if(ids.length<2||z>1)return;i=(i+d+ids.length)%ids.length;show()}
 function dist(t){var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy)}
 /* 雙指縮放、放大後單指拖曳、雙擊放大／還原；只有在未放大且單指時，左右滑動才會切換照片 */
 on(mid,"touchstart",function(e){
  if(e.touches.length===2){multi=true;pd=dist(e.touches);pz=z;ds=null;im.style.transition="none"}
  else if(e.touches.length===1){
   sx=e.touches[0].clientX;im.style.transition="none";
   if(!multi){var n=Date.now();if(n-lt<300){im.style.transition="transform .2s ease-out";if(z>1)rz();else{z=2.5;ap()}lt=0}else lt=n}
   if(z>1)ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}});
 mid.addEventListener("touchmove",function(e){
  if(e.touches.length===2){e.preventDefault();var r=dist(e.touches)/(pd||1);z=Math.min(4,Math.max(1,pz*r));if(z<=1){px=0;py=0}ap()}
  else if(e.touches.length===1&&z>1){e.preventDefault();if(!ds)ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py};px=e.touches[0].clientX-ds.x;py=e.touches[0].clientY-ds.y;ap();ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}
 },{passive:false});
 on(mid,"touchend",function(e){
  ds=null;
  if(e.touches.length===0){
   if(!multi&&z<=1&&e.changedTouches.length){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(d>0?-1:1)}
   multi=false;if(z<1.02)rz()}
  else if(e.touches.length===1&&z>1){ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}});
 on(x,"click",function(){ov.remove()});on(ov,"click",function(e){if(e.target===ov||e.target===mid)ov.remove()});
 mid.appendChild(im);ov.appendChild(tp);ov.appendChild(mid);ov.appendChild(dots);document.body.appendChild(ov);show()}

/* 用系統內建的 PDF 檢視器開啟（支援原生的雙指縮放） */
function openNative(u){try{var c=u.indexOf(","),mt=(/data:([^;,]+)/.exec(u.slice(0,c))||[])[1]||"application/pdf",bin=atob(u.slice(c+1)),arr=new Uint8Array(bin.length);for(var k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);var url=URL.createObjectURL(new Blob([arr],{type:mt}));var w=window.open(url,"_blank");if(!w)toast("無法開啟，請允許彈出視窗");setTimeout(function(){URL.revokeObjectURL(url)},120000)}catch(e){toast("無法開啟此檔案")}}
/* ===== 附件檢視器：點一下就直接看，圖片與 PDF 可自由切換（資訊分頁的迴紋針使用） ===== */
function openAttachments(title,docs,start){
 docs=(docs||[]).filter(Boolean);if(!docs.length){toast("沒有附件");return}
 var n=docs.length,i=Math.min(Math.max(0,start||0),n-1),
 ov=h("div","fixed inset-0 bg-black/85 z-[65] flex flex-col"),tp=h("div","flex justify-between items-center p-4 text-white flex-shrink-0"),
 ct=h("span","text-sm font-medium flex-shrink-0"),nm=h("span","flex-1 min-w-0 truncate text-xs text-slate-300 text-center"),
 dl=h("a","text-white flex-shrink-0 px-1"),x=h("button","text-white flex-shrink-0"),
 mid=h("div","flex-1 relative overflow-hidden flex items-center justify-center px-2"),
 im=h("img","max-w-full max-h-full object-contain select-none"),fr=h("iframe","w-full h-full border-0 bg-white rounded-lg"),
 um=h("div","text-xs text-slate-300 text-center px-6","此檔案類型無法預覽"),
 strip=h("div","flex gap-2 overflow-x-auto no-scrollbar p-3 justify-center flex-shrink-0"),
 z=1,px=0,py=0,pd=0,pz=1,ds=null,lt=0,sx=0,multi=false,curImg=true;
 dl.appendChild(h("i","fa-solid fa-download"));dl.setAttribute("aria-label","下載");x.appendChild(h("i","fa-solid fa-xmark text-2xl"));
 tp.appendChild(ct);tp.appendChild(x);
 var vm=document.querySelector('meta[name="viewport"]'),vm0=vm?vm.getAttribute("content"):"",curUrl="",
 ex=h("button","absolute top-2 right-2 z-10 bg-black/60 text-white text-xs font-bold rounded-full px-3 py-1.5 flex items-center gap-1.5");
 ex.appendChild(h("i","fa-solid fa-expand"));ex.appendChild(document.createTextNode("放大檢視"));ex.style.display="none";
 on(ex,"click",function(e){e.stopPropagation();if(curUrl)openNative(curUrl)});
 function vz(en){if(vm)vm.setAttribute("content",en?"width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover":vm0)}
 function closeV(){vz(false);ov.remove()}
 mid.style.touchAction="none";im.draggable=false;
 function clamp(){var iw=im.offsetWidth*z,ih=im.offsetHeight*z,mx=Math.max(0,(iw-mid.clientWidth)/2)+10,my=Math.max(0,(ih-mid.clientHeight)/2)+10;px=Math.min(mx,Math.max(-mx,px));py=Math.min(my,Math.max(-my,py))}
 function ap(){clamp();im.style.transform="translate("+px+"px,"+py+"px) scale("+z+")"}
 function rz(){z=1;px=0;py=0;ap()}
 function isImg(d){return !d.type||d.type.indexOf("image/")===0}
 function show(){
  rz();var d=docs[i],pdf=d.type==="application/pdf",img=isImg(d);curImg=img;
  ct.textContent=(i+1)+" / "+n;nm.textContent=(title?title+" · ":"")+(d.name||"");
  im.style.display=img?"":"none";fr.style.display=pdf?"":"none";um.style.display=(!img&&!pdf)?"":"none";mid.style.touchAction=img?"none":"auto";dl.style.display="none";ex.style.display="none";vz(pdf);
  [].forEach.call(strip.children,function(c,k){c.classList.toggle("border-white",k===i);c.classList.toggle("border-transparent",k!==i);c.classList.toggle("opacity-60",k!==i)});
  blob(d.id).then(function(u){if(docs[i]!==d||!u)return;if(img)im.src=u;else if(pdf){fr.src=u;curUrl=u;ex.style.display=""}dl.href=u;dl.download=d.name||"file";dl.style.display=""})}
 function go(k){if(n<2)return;i=(i+k+n)%n;show()}
 function dist(t){var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy)}
 on(mid,"touchstart",function(e){if(!curImg)return;
  if(e.touches.length===2){multi=true;pd=dist(e.touches);pz=z;ds=null;im.style.transition="none"}
  else if(e.touches.length===1){sx=e.touches[0].clientX;im.style.transition="none";
   if(!multi){var t=Date.now();if(t-lt<300){im.style.transition="transform .2s ease-out";if(z>1)rz();else{z=2.5;ap()}lt=0}else lt=t}
   if(z>1)ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}});
 mid.addEventListener("touchmove",function(e){if(!curImg)return;
  if(e.touches.length===2){e.preventDefault();z=Math.min(4,Math.max(1,pz*dist(e.touches)/(pd||1)));if(z<=1){px=0;py=0}ap()}
  else if(e.touches.length===1&&z>1){e.preventDefault();if(!ds)ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py};px=e.touches[0].clientX-ds.x;py=e.touches[0].clientY-ds.y;ap();ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}
 },{passive:false});
 on(mid,"touchend",function(e){if(!curImg)return;ds=null;
  if(e.touches.length===0){if(!multi&&z<=1&&e.changedTouches.length){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(d>0?-1:1)}multi=false;if(z<1.02)rz()}
  else if(e.touches.length===1&&z>1){ds={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}});
 docs.forEach(function(d,k){var b=h("button","flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 flex items-center justify-center");
  if(isImg(d)){var t=h("img","w-full h-full object-cover");setImg(t,d.id);b.appendChild(t)}
  else{b.className+=" bg-white/15";b.appendChild(h("i","fa-solid "+(d.type==="application/pdf"?"fa-file-pdf text-red-300":"fa-file text-slate-200")+" text-xl"))}
  on(b,"click",function(e){e.stopPropagation();i=k;show()});strip.appendChild(b)});
 mid.appendChild(im);mid.appendChild(fr);mid.appendChild(um);mid.appendChild(ex);
 if(n>1)[[-1,"fa-chevron-left","left-2"],[1,"fa-chevron-right","right-2"]].forEach(function(a){var b=ib("absolute top-1/2 -mt-4 "+a[2]+" w-9 h-9 rounded-full bg-white/20 text-white text-xs flex items-center justify-center z-10",a[1]);on(b,"click",function(e){e.stopPropagation();go(a[0])});mid.appendChild(b)});
 on(x,"click",closeV);on(ov,"click",function(e){if(e.target===ov||e.target===mid)closeV()});
 ov.appendChild(tp);ov.appendChild(mid);if(n>1)ov.appendChild(strip);document.body.appendChild(ov);show()}
window.openAttachments=openAttachments;

/* 新增 / 編輯視窗（版型與其他分頁的新增視窗一致） */
var IC="w-full bg-slate-50 border p-2.5 rounded-xl outline-none";
function field(l,n){var d=h("div");d.appendChild(h("label","block font-bold text-slate-600 mb-1",l));d.appendChild(n);return d}
function combo(label,input,k){
 var w=h("div","relative"),dd=h("div","absolute left-0 right-0 top-full mt-1 z-[60] max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1 hidden");
 function vals(){var l=[];items.forEach(function(x){if(x[k]&&l.indexOf(x[k])<0)l.push(x[k])});return l}
 function show(all){dd.textContent="";var q=all?"":input.value.trim().toLowerCase(),l=vals().filter(function(v){return !q||v.toLowerCase().indexOf(q)>-1});if(!l.length){dd.classList.add("hidden");return}
  l.forEach(function(v){var r=h("div","px-2.5 py-2 rounded-lg text-sm text-slate-800 cursor-pointer hover:bg-ice-50 active:bg-ice-50",v);on(r,"mousedown",function(e){e.preventDefault()});on(r,"click",function(){input.value=v;dd.classList.add("hidden")});dd.appendChild(r)});dd.classList.remove("hidden")}
 on(input,"focus",function(){show(true);setTimeout(function(){try{var n=input.value.length;input.setSelectionRange(n,n)}catch(e){}},30)});on(input,"click",function(){show(true)});on(input,"input",function(){show(false)});on(input,"blur",function(){setTimeout(function(){dd.classList.add("hidden");input.value=input.value.trim()},150)});
 input.className+=" pr-8 focus:border-ice-500";var cv=h("i","fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none");w.appendChild(input);w.appendChild(cv);w.appendChild(dd);return field(label,w)}
function tile(label,icon,get,set,ui){
 var w=h("div","relative"),b=h("button","w-full aspect-square rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold bg-cover bg-center flex flex-col items-center justify-center gap-1.5"),f=h("input"),x=h("button","absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-800/75 text-white text-xs flex items-center justify-center");
 b.type="button";x.type="button";f.type="file";f.accept="image/*";f.hidden=true;x.appendChild(h("i","fa-solid fa-xmark"));
 function paint(){var id=get();x.style.display=id?"flex":"none";b.style.backgroundImage="";b.textContent="";b.classList.toggle("border-dashed",!id);b.classList.toggle("border-solid",!!id);
  if(!id){b.appendChild(h("i","fa-solid "+icon+" text-2xl"));b.appendChild(h("span",null,label));return}
  blob(id).then(function(d){if(d&&get()===id)b.style.backgroundImage="url("+d+")"})}
 on(b,"click",function(){f.click()});on(x,"click",function(){set("");paint()});
 on(f,"change",function(){var file=f.files[0];f.value="";if(!file)return;ui.n++;ui.upd();shrink(file).then(store).then(function(id){set(id);paint()}).catch(function(){toast("無法讀取圖片")}).then(function(){ui.n--;ui.upd()})});
 w.appendChild(b);w.appendChild(x);w.appendChild(f);paint();w.paint=paint;return w}
function openSheet(x,sub){
 ed=x||null;img=x?x.img||"":"";rcp=x?x.rcpt||"":"";
 var eid=x?x.id:null,wasEdit=!!x,gone=false,base=x?cp(x):null,rb=x?cp(x):null,
 ov=h("div","fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"),bx=h("div","bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"),hd=h("div","flex justify-between items-center border-b pb-2"),xb=h("button","text-slate-400"),body=h("div","space-y-3 text-xs");
 hd.appendChild(h("h3","font-bold text-slate-800",sub?"批次新增伴手禮（"+sub+"）":(ed?"編輯伴手禮":"新增伴手禮")));xb.appendChild(h("i","fa-solid fa-xmark text-lg"));hd.appendChild(xb);
 var fs=h("input",IC),fw=h("input",IC),fk=h("input",IC),fq=h("input",IC),fn=h("textarea",IC);
 fs.value=x?x.store:(grp==="store"?fg:"");fw.value=x?x.who:(grp==="who"?fg:"");fk.value=x?x.link:"";fq.value=x?x.qty:1;fn.value=x?x.note:"";
 fs.type="text";fw.type="text";fk.type="url";fq.type="number";fq.min="1";fs.placeholder="例：唐吉訶德";fw.placeholder="例：媽媽";fs.autocomplete="off";fw.autocomplete="off";fk.placeholder="https://";fq.placeholder="1";fn.rows=2;
 fs.maxLength=40;fw.maxLength=20;fk.maxLength=500;fn.maxLength=200;
 function qv(){var v=parseInt(String(fq.value).replace(/\D/g,""),10);return isFinite(v)&&v>0?Math.min(v,999):1}
 var sp=h("div","text-[11px] text-ice-600 mt-1"),ui={n:0,upd:function(){sp.style.display=ui.n?"block":"none";sv.disabled=ui.n>0;sv.className="flex-1 font-bold py-2.5 rounded-xl "+(ui.n?"bg-slate-300 text-slate-500 cursor-not-allowed":"bg-ice-600 text-white");sv.textContent=ui.n?"讀取中...":lab}};
 sp.appendChild(h("i","fa-solid fa-spinner fa-spin mr-1"));sp.appendChild(document.createTextNode("檔案讀取中，請稍候..."));sp.style.display="none";
 var lab=ed?(queue.length?"儲存並下一張":"儲存"):"儲存",sv=h("button","flex-1 bg-ice-600 text-white font-bold py-2.5 rounded-xl",lab),ft=h("div","flex gap-2 pt-2");
 var ti=tile("上傳圖片","fa-image",function(){return img},function(v){img=v},ui),tr=tile("上傳收據","fa-receipt",function(){return rcp},function(v){rcp=v},ui);
 body.appendChild(combo("店家",fs,"store"));
 var g2=h("div","grid grid-cols-2 gap-2");g2.appendChild(field("數量",fq));g2.appendChild(combo("誰要買",fw,"who"));body.appendChild(g2);
 body.appendChild(field("連結",fk));
 var g3=h("div","grid grid-cols-2 gap-2");g3.appendChild(field("圖片",ti));g3.appendChild(field("收據",tr));body.appendChild(g3);body.appendChild(sp);
 body.appendChild(field("備註",fn));

 /* ===== 即時合併：其他裝置修改時，把你沒動過的欄位換成最新值 ===== */
 var LB={store:"店家",who:"誰要買",qty:"數量",link:"連結",img:"圖片",rcpt:"收據",note:"備註"},
 FD={
  store:{get:function(){return fs.value.trim()},set:function(v){fs.value=v||""}},
  who:{get:function(){return fw.value.trim()},set:function(v){fw.value=v||""}},
  qty:{get:qv,set:function(v){fq.value=v}},
  link:{get:function(){return fk.value.trim()},set:function(v){fk.value=v||""}},
  img:{get:function(){return img},set:function(v){img=v||"";ti.paint()}},
  rcpt:{get:function(){return rcp},set:function(v){rcp=v||"";tr.paint()}},
  note:{get:function(){return fn.value.trim()},set:function(v){fn.value=v||""}}
 };
 function onRemote(e){
  if(!wasEdit||gone||!e.detail||e.detail.keys.indexOf(KEY)<0)return;
  load();var i=idx(eid);
  if(i<0){gone=true;toast("這筆伴手禮已被其他裝置刪除，儲存後會重新建立");return}
  var rem=items[i],mg=[],cf=[];
  Object.keys(FD).forEach(function(k){
   var r=rem[k],b=base[k],c=FD[k].get();
   if(eq(r,rb[k]))return;                       /* 其他裝置沒改這欄 */
   if(eq(c,r)){base[k]=r;return}                /* 兩邊一樣 */
   if(eq(c,b)){FD[k].set(r);base[k]=r;mg.push(LB[k])}  /* 你沒動過 → 換成最新 */
   else cf.push(LB[k])});                       /* 兩邊都改 → 保留你的 */
  rb=cp(rem);
  var m=[];
  if(mg.length)m.push("其他裝置剛修改了「"+mg.join("、")+"」，已自動同步");
  if(cf.length)m.push("「"+cf.join("、")+"」與其他裝置的修改衝突，儲存後會以你的內容為準");
  if(m.length)toast(m.join("｜"))}
 window.addEventListener("trip-sync-update",onRemote);
 function shut(){window.removeEventListener("trip-sync-update",onRemote);ov.remove()}

 if(wasEdit&&!sub){var del=h("button","flex-1 bg-red-100 text-red-600 font-bold py-2.5 rounded-xl","刪除");on(del,"click",function(){ask("確定刪除這筆嗎？",function(){load();var i=idx(eid);if(i>-1)items.splice(i,1);save();shut();draw();toast("已刪除")})});ft.appendChild(del)}
 on(xb,"click",function(){queue=[];shut()});
 on(sv,"click",function(){
  var raw=fk.value.trim(),lk=nurl(raw);if(raw&&!lk){toast("連結格式不正確");return}
  var d={store:fs.value.trim(),qty:qv(),who:fw.value.trim(),link:lk,img:img,rcpt:rcp,note:fn.value.trim()};
  load();  /* 以最新資料為底，不會用過期的整份清單蓋掉別台的修改 */
  var i=wasEdit?idx(eid):-1,cur=i>-1?items[i]:null,old=cur?Object.assign({},cur):null,isNew=!cur;
  if(cur)Object.assign(cur,d);else{d.id=wasEdit?eid:Date.now();d.done=false;items.push(d)}
  if(!save()){if(old)Object.assign(cur,old);else items.pop();return}
  shut();draw();if(queue.length)nextQ();else toast(isNew&&!wasEdit?"已新增":"已儲存")});
 ft.appendChild(sv);bx.appendChild(hd);bx.appendChild(body);bx.appendChild(ft);ov.appendChild(bx);document.body.appendChild(ov)}
function nextQ(){var x=queue.shift();if(x)openSheet(x,"批次上傳 第 "+(qtot-queue.length)+" / "+qtot+" 張")}
function batch(files){var fs=files.slice(0,30),added=[],i=0;if(!fs.length)return;toast("處理 "+fs.length+" 張照片…");
 function fin(){if(!added.length){toast("無法讀取圖片");return}added.forEach(function(a){items.push(a)});if(!save())return;draw();queue=added.slice();qtot=added.length;nextQ()}
 (function nx(){if(i>=fs.length)return fin();shrink(fs[i++]).then(store).then(function(id){added.push({id:Date.now()+added.length,store:"",qty:1,who:"",link:"",img:id,rcpt:"",note:"",done:false});nx()}).catch(nx)})()}
/* 畫面 */
function ico(c,i,t){var e=h(c.tag||"span",c.cls),k=h("i","fa-solid "+i+(t?" mr-1":""));e.appendChild(k);if(t)e.appendChild(document.createTextNode(t));return e}
function slide(x,idx,arr,sc,key){
 var c=h("div","flex-none w-full snap-center"),ph=h("div","relative aspect-[4/3] rounded-2xl bg-ice-100 overflow-hidden flex items-center justify-center text-5xl cursor-pointer");
 if(x.img){var im=h("img","w-full h-full object-cover"+(x.done?" opacity-50":""));setImg(im,x.img);ph.appendChild(im);on(ph,"click",function(){var pl=arr.filter(function(y){return y.img}),ids=pl.map(function(y){return y.img});zoom(ids,ids.indexOf(x.img),function(k){var j=arr.indexOf(pl[k]);cpos[key]=j;sc.scrollLeft=j*sc.clientWidth})})}else ph.appendChild(h("i","fa-solid fa-gift text-ice-500"));
 ph.appendChild(h("span","absolute left-2.5 bottom-2.5 bg-slate-800/80 text-white text-xs font-bold rounded-lg px-2 py-0.5","× "+x.qty));
 var k=h("button","absolute top-2.5 right-2.5 w-8 h-8 rounded-lg border-2 flex items-center justify-center "+(x.done?"bg-ice-600 border-ice-600 text-white":"bg-white/80 border-slate-300"));k.setAttribute("aria-label","已購買");if(x.done)k.appendChild(h("i","fa-solid fa-check text-sm"));
 on(k,"click",function(e){e.stopPropagation();x.done=!x.done;save();draw()});ph.appendChild(k);
 [[-1,"fa-chevron-left","left-2"],[1,"fa-chevron-right","right-2"]].forEach(function(d){var j=idx+d[0];if(j<0||j>=arr.length)return;var b=ib("absolute top-1/2 -mt-4 "+d[2]+" w-8 h-8 rounded-full bg-slate-800/60 text-white text-xs flex items-center justify-center",d[1]);on(b,"click",function(e){e.stopPropagation();sc.scrollTo({left:j*sc.clientWidth,behavior:"smooth"})});ph.appendChild(b)});
 c.appendChild(ph);
 var si=h("div","flex gap-2 items-start pt-2.5"),inf=h("div","flex-1 min-w-0 flex flex-col items-start gap-1.5 text-xs"),bv=grp==="who"?x.store:x.who,bd=h("span","bg-ice-100 text-ice-700 text-xs font-bold rounded-lg px-2.5 py-1");
 bd.appendChild(h("i","fa-solid "+(grp==="who"?"fa-store":"fa-user")+" mr-1"));bd.appendChild(document.createTextNode(bv||"未填"));var rw=h("div","flex flex-wrap items-center gap-x-3 gap-y-1.5");rw.appendChild(bd);inf.appendChild(rw);
 if(x.note){var nt=h("div","flex items-start text-slate-600");nt.appendChild(h("i","fa-regular fa-sticky-note w-4 text-slate-400 mt-0.5"));nt.appendChild(document.createTextNode("備註: "+x.note));inf.appendChild(nt)}
 if(x.link){var a=h("button","text-ice-600 font-bold flex items-center gap-1");a.appendChild(h("i","fa-solid fa-link"));a.appendChild(document.createTextNode(host(x.link)));on(a,"click",function(){askLink(x.link)});inf.appendChild(a)}
 if(x.rcpt){var r=h("button","text-ice-600 font-bold flex items-center gap-1");r.appendChild(h("i","fa-solid fa-receipt"));r.appendChild(document.createTextNode("查看收據"));on(r,"click",function(){var pl=arr.filter(function(y){return y.rcpt}),ids=pl.map(function(y){return y.rcpt});zoom(ids,ids.indexOf(x.rcpt),function(k){var j=arr.indexOf(pl[k]);cpos[key]=j;sc.scrollLeft=j*sc.clientWidth})});rw.appendChild(r)}
 var col=h("div","flex flex-col items-center gap-3 flex-shrink-0 pt-1"),eb=ib("text-slate-400 hover:text-ice-600","fa-pen text-xs"),xb=ib("text-red-400 hover:text-red-600","fa-trash text-xs");eb.setAttribute("aria-label","編輯");xb.setAttribute("aria-label","刪除");
 on(eb,"click",function(){openSheet(x)});on(xb,"click",function(){ask("確定刪除這筆嗎？",function(){var i=items.indexOf(x);if(i>-1)items.splice(i,1);save();draw();toast("已刪除")})});
 col.appendChild(eb);col.appendChild(xb);si.appendChild(inf);si.appendChild(col);c.appendChild(si);return c}
function group(s,arr){
 var key=grp+":"+s,dn=arr.filter(function(x){return x.done}).length,card=h("div","bg-white rounded-2xl p-4 shadow-sm border border-slate-100"),hd=h("div","flex justify-between items-center mb-3"),t=h("h2","text-sm font-bold text-slate-800 flex items-center gap-2"),sc=h("div","flex overflow-x-auto snap-x snap-mandatory no-scrollbar");
 t.appendChild(h("i","fa-solid "+(grp==="who"?"fa-user":"fa-store")+" text-ice-600"));t.appendChild(document.createTextNode(s));hd.appendChild(t);hd.appendChild(h("span","text-[11px] text-slate-400","已買 "+dn+" / "+arr.length+" 款"));card.appendChild(hd);
 arr.forEach(function(x,i){sc.appendChild(slide(x,i,arr,sc,key))});card.appendChild(sc);root.appendChild(card);
 var p=Math.min(Math.max(0,cpos[key]||0),arr.length-1);cpos[key]=p;sc.scrollLeft=p*sc.clientWidth;
 on(sc,"scroll",function(){if(sc.clientWidth)cpos[key]=Math.round(sc.scrollLeft/sc.clientWidth)})}
function list(){
 var g={},order=[];items.forEach(function(x){var s=x[grp]||(grp==="who"?"未指定":"未填店家");if(!g[s]){g[s]=[];order.push(s)}g[s].push(x)});
 if(!order.length){root.appendChild(h("div","bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 text-center py-6 text-sm","尚未新增伴手禮"));return}
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
 var up=h("button","w-full flex items-center justify-center gap-1.5 bg-ice-600 text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition"),fm=h("input"),sg=h("div","flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm");
 up.appendChild(h("i","fa-solid fa-camera"));up.appendChild(document.createTextNode("批次上傳照片"));
 fm.type="file";fm.accept="image/*";fm.multiple=true;fm.hidden=true;
 on(up,"click",function(){fm.click()});on(fm,"change",function(){var a=[].slice.call(fm.files);fm.value="";batch(a)});
 [["store","fa-store","依店家"],["who","fa-user","依人"],["stats","fa-chart-bar","統計"]].forEach(function(m){var act=m[0]==="stats"?view==="stats":(view==="list"&&grp===m[0]),b=h("button","flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 "+(act?"bg-ice-600 text-white font-bold":"text-slate-500 font-medium"));b.appendChild(h("i","fa-solid "+m[1]));b.appendChild(document.createTextNode(m[2]));on(b,"click",function(){if(m[0]==="stats")view="stats";else{view="list";grp=m[0];fg=""}draw()});sg.appendChild(b)});
 root.appendChild(up);root.appendChild(fm);root.appendChild(sg);
 if(view==="stats")stats();else list();
 var f=ib("fixed bottom-24 right-6 w-14 h-14 bg-ice-600 text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-ice-700 active:scale-95 transition z-40","fa-plus");f.setAttribute("aria-label","新增伴手禮");on(f,"click",function(){openSheet(null)});root.appendChild(f)}
/* 切到「伴手禮」分頁時，Vue 會建立 #souv-host，這裡偵測到就接手畫面 */
function tryMount(){var r=document.getElementById("souv-host");if(r&&r!==root){root=r;load();draw()}else if(!r)root=null}
var pendingSouv=false;
function souvApply(){
 if(!root){pendingSouv=false;return}
 if(document.querySelector('.fixed.inset-0[class*="z-50"],.fixed.inset-0[class*="z-[98]"]')){setTimeout(souvApply,1000);return}
 pendingSouv=false;load();draw()}
window.addEventListener("trip-sync-update",function(e){
 if(!e.detail||e.detail.keys.indexOf("trip_souvenirs")<0||pendingSouv)return;
 pendingSouv=true;souvApply()});
new MutationObserver(tryMount).observe(document.documentElement,{childList:true,subtree:true});
})();
