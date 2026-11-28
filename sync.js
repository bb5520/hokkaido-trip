(function(){"use strict";
var SB_URL="https://cpisljizfsovmygzhhpy.supabase.co",SB_KEY="sb_publishable_72orf9crARS0-Rfb67sFWA_x0i0GuhT";
var KEYS=["trip_banner","trip_jpyRate","trip_itinerary","trip_flightExtras","trip_hotelExtras","trip_carRentals","trip_dayTours","trip_otherBookings","trip_shopping","trip_expenses","trip_souvenirs","trip_startDate","trip_days","souv","trip_todos","trip_taxMine","trip_taxEnts"];
var BUCKET="trip-files",DB="trip_blob_store",ST="blobs";
var rawSet=Storage.prototype.setItem,rawGet=Storage.prototype.getItem;
function lraw(k){return rawGet.call(localStorage,k)}
function lg(k,d){try{var v=JSON.parse(lraw(k));return v==null?d:v}catch(e){return d}}
function ls(k,v){rawSet.call(localStorage,k,JSON.stringify(v))}
var dirty=lg("sync_dirty",{}),meta=lg("sync_meta",{}),bq=lg("sync_blobq",[]),authed=false,busy=false,again=false,pt=0,sb=null,mode="",readyRes;
var ready=new Promise(function(r){readyRes=r});
try{sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}})}catch(e){}
Storage.prototype.setItem=function(k,v){var same=this===localStorage&&lraw(k)===String(v);rawSet.call(this,k,v);if(!same&&this===localStorage&&KEYS.indexOf(k)>=0){dirty[k]=1;ls("sync_dirty",dirty);sched()}};
function sched(){clearTimeout(pt);pt=setTimeout(syncNow,800)}
/* ---------- UI ---------- */
function mk(t,s,x){var e=document.createElement(t);if(s)e.style.cssText=s;if(x!=null)e.textContent=x;return e}
var IN="width:100%;height:46px;border:1px solid #e2e8f0;background:#f8fafc;color:#1e293b;border-radius:12px;padding:0 12px;font:inherit;font-size:16px;box-sizing:border-box",MB="border:0;background:none;padding:8px 14px;font-size:13px;text-align:left;color:#334155";
var ov=mk("div","position:fixed;inset:0;z-index:1000;background:#eef4f8;display:none;align-items:center;justify-content:center;padding:24px"),
bx=mk("div","width:100%;max-width:340px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:10px"),
em=mk("input",IN),pw=mk("input",IN),msg=mk("div","font-size:12px;color:#dc2626;min-height:16px"),
lb=mk("button","height:46px;border:0;border-radius:12px;background:#0284c7;color:#fff;font:inherit;font-weight:700;font-size:15px","登入"),
chip=mk("button","position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);right:8px;z-index:45;border:0;border-radius:999px;padding:4px 10px;font-size:11px;background:rgba(255,255,255,.88);color:#475569;display:none;box-shadow:0 1px 4px rgba(0,0,0,.15)","…"),
mn=mk("div","position:fixed;top:calc(env(safe-area-inset-top,0px) + 38px);right:8px;z-index:46;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:6px;display:none;flex-direction:column;gap:4px;box-shadow:0 4px 14px rgba(0,0,0,.15)"),
b1=mk("button",MB,"立即同步"),b2=mk("button",MB+";color:#dc2626","登出");
em.type="email";em.placeholder="Email";em.autocomplete="username";em.setAttribute("autocapitalize","off");pw.type="password";pw.placeholder="密碼";pw.autocomplete="current-password";
bx.appendChild(mk("div","text-align:center;font-weight:700;font-size:18px;color:#1e293b","✈️ 北海道冰雪之旅"));[em,pw,msg,lb].forEach(function(e){bx.appendChild(e)});ov.appendChild(bx);[b1,b2].forEach(function(e){mn.appendChild(e)});
[ov,chip,mn].forEach(function(e){document.documentElement.appendChild(e)});
var hasTok=false,reloading=false,outFlag=lraw("sync_out")==="1";try{for(var ti=0;ti<localStorage.length;ti++){if(/^sb-.+-auth-token$/.test(localStorage.key(ti))){hasTok=true;break}}}catch(e){}
var stl=document.createElement("style");stl.textContent="html.sv-lock body{visibility:hidden!important}";document.head.appendChild(stl);
function lockOn(){document.documentElement.classList.add("sv-lock");ov.style.display="flex"}
function lockOff(){document.documentElement.classList.remove("sv-lock");ov.style.display="none"}
if(!hasTok||outFlag)lockOn();
function setSt(t,bad,upd){chip.textContent=t;chip.style.color=bad?"#dc2626":"#475569";chip.style.background=upd?"#fde68a":"rgba(255,255,255,.88)";mode=upd?"reload":""}
/* ---------- 本機圖片庫(IndexedDB) ---------- */
function odb(){return new Promise(function(r,j){var q=indexedDB.open(DB,1);q.onupgradeneeded=function(){q.result.createObjectStore(ST)};q.onsuccess=function(){r(q.result)};q.onerror=function(){j(q.error)}})}
function iget(id){return odb().then(function(db){return new Promise(function(r){var q=db.transaction(ST).objectStore(ST).get(id);q.onsuccess=function(){r(q.result||null)};q.onerror=function(){r(null)}})})}
function iput(id,v){return odb().then(function(db){return new Promise(function(r,j){var t=db.transaction(ST,"readwrite");t.objectStore(ST).put(v,id);t.oncomplete=r;t.onerror=function(){j(t.error)}})})}
function ikeys(){return odb().then(function(db){return new Promise(function(r){var q=db.transaction(ST).objectStore(ST).getAllKeys();q.onsuccess=function(){r(q.result||[])};q.onerror=function(){r([])}})})}
function toBlob(d){var i=d.indexOf(","),t=(/data:([^;,]+)/.exec(d.slice(0,i))||[])[1]||"application/octet-stream",b=atob(d.slice(i+1)),u=new Uint8Array(b.length);for(var j=0;j<b.length;j++)u[j]=b.charCodeAt(j);return new Blob([u],{type:t})}
function toUrl(b){return new Promise(function(r,j){var f=new FileReader();f.onload=function(){r(f.result)};f.onerror=j;f.readAsDataURL(b)})}
function drop(id){bq=bq.filter(function(x){return x!==id});ls("sync_blobq",bq)}
function flushBlobs(){
 if(!sb||!authed||!navigator.onLine||!bq.length)return Promise.resolve();
 var p=Promise.resolve();
 bq.slice().forEach(function(id){p=p.then(function(){return iget(id)}).then(function(d){if(!d){drop(id);return}var b=toBlob(d);
  return sb.storage.from(BUCKET).upload(id,b,{contentType:b.type,upsert:false}).then(function(r){if(r.error&&!/exist|duplicate/i.test(r.error.message||""))throw r.error;drop(id)})})});
 return p}
var pend={},neg={};
/* ---------- 逐筆合併（三方合併） ---------- */
var MKIND={trip_itinerary:"days",trip_flightExtras:"map",trip_hotelExtras:"map",trip_carRentals:"list",trip_dayTours:"list",trip_otherBookings:"list",trip_todos:"list",trip_expenses:"list",trip_taxEnts:"list",trip_souvenirs:"list"};
var base=lg("sync_base",{});
function setBase(k,v){
 if(!MKIND[k])return;
 base[k]=v;
 try{ls("sync_base",base)}catch(e){delete base[k];try{ls("sync_base",base)}catch(x){}}}
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function pj(s){try{return s==null?null:JSON.parse(s)}catch(e){return null}}
function byId(a){var m={};a.forEach(function(x){m[x.id]=x});return m}
function sub(a,keep){return a.filter(function(i){return keep.indexOf(i)>-1})}

/* 同一筆資料：逐欄合併，你沒動過的欄位換成雲端最新，你改過的欄位保留 */
function mItem(b,l,r){
 b=b||{};var o={},ks={};
 [b,l,r].forEach(function(x){Object.keys(x).forEach(function(k){ks[k]=1})});
 Object.keys(ks).forEach(function(k){
  var v=eq(l[k],b[k])?r[k]:l[k];
  if(v!==undefined)o[k]=v});
 return o}

/* 一份清單（每筆有 id）；有任何一筆沒有 id 就回傳 null，改用舊的整份覆蓋 */
function mList(b,l,r){
 b=b||[];l=l||[];r=r||[];
 if(b.concat(l,r).some(function(x){return !x||x.id==null}))return null;
 var B=byId(b),L=byId(l),R=byId(r);
 function dec(id){
  var ib=id in B,il=id in L,ir=id in R;
  if(il&&ir)return mItem(B[id],L[id],R[id]);
  if(il)return(ib&&eq(L[id],B[id]))?null:L[id];   /* 雲端刪了：你沒改就刪，改過就留 */
  if(ir)return(ib&&eq(R[id],B[id]))?null:R[id];   /* 你刪了：雲端沒改就刪，改過就留 */
  return null}
 var bi=b.map(function(x){return x.id}),li=l.map(function(x){return x.id}),ri=r.map(function(x){return x.id});
 var lMoved=!eq(sub(li,bi),sub(bi,li)),rMoved=!eq(sub(ri,bi),sub(bi,ri));
 var first=(lMoved&&!rMoved)?li:ri,second=first===li?ri:li,seen={},out=[];
 first.concat(second).forEach(function(id){
  if(seen[id])return;seen[id]=1;
  var x=dec(id);if(x!==null&&x!==undefined)out.push(x)});
 return out}

/* 行程：天 → 行程，逐天合併 */
function mDays(b,l,r){
 b=b||[];l=l||[];r=r||[];
 var n=l.length!==b.length?l.length:r.length,out=[];
 for(var i=0;i<n;i++){var m=mList(b[i],l[i],r[i]);if(m===null)return null;out.push(m)}
 return out}

/* 航班／住宿補充資料：{id: {...}} 的物件 */
function mMap(b,l,r){
 function toL(o){return Object.keys(o||{}).map(function(k){return Object.assign({id:k},o[k])})}
 var m=mList(toL(b),toL(l),toL(r));if(m===null)return null;
 var o={};m.forEach(function(x){var id=x.id;delete x.id;o[id]=x});return o}

/* 回傳合併後的 JSON 字串；無法合併時回傳 null */
function mergeKey(k,bs,ls_,rs){
 var b=pj(bs),l=pj(ls_),r=pj(rs),kind=MKIND[k],m=null;
 if(l==null||r==null)return null;
 try{
  if(kind==="list"&&Array.isArray(l)&&Array.isArray(r))m=mList(Array.isArray(b)?b:[],l,r);
  else if(kind==="days"&&Array.isArray(l)&&Array.isArray(r))m=mDays(Array.isArray(b)?b:[],l,r);
  else if(kind==="map"&&!Array.isArray(l)&&!Array.isArray(r))m=mMap(b&&typeof b==="object"?b:{},l,r);
 }catch(e){m=null}
 return m==null?null:JSON.stringify(m)}
window.SYNC={
 touch:function(k){if(KEYS.indexOf(k)<0)return;dirty[k]=1;ls("sync_dirty",dirty);sched()},
 up:function(id){if(bq.indexOf(id)<0){bq.push(id);ls("sync_blobq",bq)}flushBlobs().catch(function(){})},
 down:function(id){return ready.then(function(){
  if(!sb||!authed)return null;
  if(neg[id]&&Date.now()-neg[id]<30000)return null;
  return pend[id]||(pend[id]=sb.storage.from(BUCKET).download(id).then(function(r){if(r.error||!r.data)throw 0;return toUrl(r.data)}).then(function(u){return iput(id,u).then(function(){return u})}).catch(function(){neg[id]=Date.now();return null}).then(function(u){delete pend[id];return u}))})}
};
/* ---------- 資料同步 ---------- */
function seed(){if(lraw("sync_seeded"))return Promise.resolve();return ikeys().then(function(ks){ks.forEach(function(id){if(bq.indexOf(id)<0)bq.push(id)});ls("sync_blobq",bq);rawSet.call(localStorage,"sync_seeded","1")}).catch(function(){})}
function plainPush(k,loc){
 return sb.from("trip_kv").upsert([{key:k,value:loc}],{onConflict:"key"}).select("key,updated_at").then(function(r){
  if(r.error)throw r.error;
  r.data.forEach(function(x){meta[x.key]=x.updated_at});
  setBase(k,loc);
  if(lraw(k)===loc)delete dirty[k];
  ls("sync_meta",meta);ls("sync_dirty",dirty);
  return[]})}

/* 推送單一 key；回傳「本機內容被合併改動」的 key 清單 */
function sendKey(k,n){
 var loc=lraw(k);
 if(loc==null){delete dirty[k];return Promise.resolve([])}
 if(!MKIND[k]||n>3)return plainPush(k,loc);
 return sb.from("trip_kv").select("value,updated_at").eq("key",k).maybeSingle().then(function(r){
  if(r.error)throw r.error;
  var row=r.data;
  if(!row)return plainPush(k,loc);
  var out=loc;
  /* 雲端在你上次同步後被別台改過 → 合併；meta 不存在代表首次同步，維持「覆蓋」 */
  if(meta[k]!=null&&row.updated_at!==meta[k]){
   var m=mergeKey(k,base[k],loc,row.value);
   if(m!=null)out=m}
  return sb.from("trip_kv").update({value:out}).eq("key",k).eq("updated_at",row.updated_at).select("key,updated_at").then(function(w){
   if(w.error)throw w.error;
   if(!w.data||!w.data.length)return sendKey(k,n+1);   /* 中途又被別台寫入 → 重新合併 */
   meta[k]=w.data[0].updated_at;setBase(k,out);
   var changed=[];
   if(out!==loc){
    var now=lraw(k);
    if(now===loc){rawSet.call(localStorage,k,out);delete dirty[k]}
    else{                                              /* 合併期間你又改了 → 再合併一次，仍標記為待上傳 */
     var nl=mergeKey(k,loc,now,out);
     rawSet.call(localStorage,k,nl!=null?nl:now)}
    changed.push(k)
   }else if(lraw(k)===loc)delete dirty[k];
   ls("sync_meta",meta);ls("sync_dirty",dirty);
   return changed})})}

function pushDirty(){
 var keys=Object.keys(dirty),all=[],p=Promise.resolve();
 if(!keys.length)return Promise.resolve([]);
 keys.forEach(function(k){p=p.then(function(){return sendKey(k,0)}).then(function(c){all=all.concat(c)})});
 return p.then(function(){ls("sync_dirty",dirty);return all})}
function remote(){return sb.from("trip_kv").select("key,updated_at").then(function(r){if(r.error)throw r.error;var m={};r.data.forEach(function(x){m[x.key]=x.updated_at});return m})}
function pullChanges(){
 var pushed=[];
 return remote().then(function(rem){
  var first=!Object.keys(meta).length,hasL=KEYS.some(function(k){return lraw(k)!=null}),hasR=Object.keys(rem).length>0,useLocal=false;
  if(first&&hasL&&hasR)useLocal=!confirm("雲端已有資料，這支手機也有本機資料。\n\n按「確定」＝用雲端資料取代本機\n按「取消」＝以本機資料覆蓋雲端");
  KEYS.forEach(function(k){if(lraw(k)!=null&&(!rem[k]||(first&&useLocal)))dirty[k]=1});
  ls("sync_dirty",dirty);return pushDirty()}).then(function(p){pushed=p;return remote()}).then(function(rem){
  /* 升級後第一次：已與雲端一致的 key，把目前內容記成合併基準 */
  KEYS.forEach(function(k){if(MKIND[k]&&!base[k]&&!dirty[k]&&lraw(k)!=null&&rem[k]&&meta[k]===rem[k])setBase(k,lraw(k))});
  var need=KEYS.filter(function(k){return rem[k]&&!dirty[k]&&meta[k]!==rem[k]});
  if(!need.length)return pushed;
  var chg=pushed.slice();
  return sb.from("trip_kv").select("key,value,updated_at").in("key",need).then(function(v){
   if(v.error)throw v.error;
   v.data.forEach(function(x){if(!dirty[x.key]){rawSet.call(localStorage,x.key,x.value);meta[x.key]=x.updated_at;setBase(x.key,x.value);chg.push(x.key)}});
   ls("sync_meta",meta);return chg})})}
function applyUpdate(keys){
 if(window.TRIP_LIVE){window.dispatchEvent(new CustomEvent("trip-sync-update",{detail:{keys:keys||[]}}));return}
 var last=+sessionStorage.getItem("sync_rl")||0;
 if(!document.querySelector(".fixed.inset-0")&&Date.now()-last>20000){sessionStorage.setItem("sync_rl",String(Date.now()));reloading=true;location.reload()}
 else setSt("有新資料，點此更新",true,true)}
function syncNow(){
 if(!sb||!authed)return Promise.resolve();
 if(busy){again=true;return Promise.resolve()}
 busy=true;setSt("同步中…");
 return seed().then(pullChanges).then(function(ch){return flushBlobs().then(function(){return ch})}).then(function(ch){
  var n=new Date();setSt("已同步 "+n.getHours()+":"+("0"+n.getMinutes()).slice(-2));if(ch&&ch.length)applyUpdate(ch)
 }).catch(function(){setSt("離線或同步失敗，點此選單",true)}).then(function(){busy=false;if(again){again=false;sched()}})}
/* ---------- 登入 / 登出 ---------- */
function onAuthed(fresh){authed=true;chip.style.display="block";setSt("同步中…");readyRes();startRealtime();
 if(fresh){lb.disabled=true;msg.style.color="#64748b";msg.textContent="同步資料中…"}else lockOff();
 syncNow().then(function(){if(fresh&&!reloading){lockOff();lb.disabled=false;msg.textContent="";msg.style.color="#dc2626"}})}
function login(){lb.disabled=true;msg.textContent="";
 sb.auth.signInWithPassword({email:em.value.trim(),password:pw.value}).then(function(r){lb.disabled=false;
  if(r.error){msg.textContent=/fetch|network/i.test(r.error.message)?"網路連線失敗":"帳號或密碼錯誤";return}
  pw.value="";localStorage.removeItem("sync_out");onAuthed(true)}).catch(function(){lb.disabled=false;msg.textContent="網路連線失敗"})}
function wipeLocal(){KEYS.concat(["sync_dirty","sync_meta","sync_blobq","sync_seeded","sync_base"]).forEach(function(k){localStorage.removeItem(k)});for(var wi=localStorage.length-1;wi>=0;wi--){var wk=localStorage.key(wi);if(wk&&wk.indexOf("sb-")===0)localStorage.removeItem(wk)}var q=indexedDB.deleteDatabase(DB);q.onsuccess=q.onerror=q.onblocked=function(){location.reload()}}
function manual(){syncNow().then(function(){if(window.appToast)window.appToast(chip.textContent)})}
function logout(){syncNow().then(function(){var n=Object.keys(dirty).length+bq.length;
 if(!confirm(n?"還有 "+n+" 項資料尚未同步到雲端，登出會遺失它們。確定要登出嗎？":"登出會清除這支手機上的本機資料（雲端資料不受影響）。確定嗎？"))return;
 rawSet.call(localStorage,"sync_out","1");stopRealtime();lockOn();mn.style.display="none";chip.style.display="none";em.value="";pw.value="";msg.textContent="";return sb.auth.signOut({scope:"local"}).catch(function(){}).then(wipeLocal)})}
chip.addEventListener("click",function(){if(mode==="reload"){location.reload();return}mn.style.display=mn.style.display==="flex"?"none":"flex"});
b1.addEventListener("click",function(){mn.style.display="none";manual()});
b2.addEventListener("click",function(){mn.style.display="none";logout()});
lb.addEventListener("click",function(){if(sb)login();else msg.textContent="尚未連線，請稍後再試"});
pw.addEventListener("keydown",function(e){if(e.key==="Enter")lb.click()});
document.addEventListener("visibilitychange",function(){if(!document.hidden)syncNow()});
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-sync]");if(!t)return;var a=t.getAttribute("data-sync");if(a==="logout")logout();else if(a==="now")manual()});
window.addEventListener("online",syncNow);
var rt=null,rtTimer=0;
function startRealtime(){
 if(!sb||rt)return;
 rt=sb.channel("trip_kv_live").on("postgres_changes",{event:"*",schema:"public",table:"trip_kv"},function(){
  clearTimeout(rtTimer);rtTimer=setTimeout(syncNow,300);
 }).subscribe(function(st){if(st==="SUBSCRIBED")syncNow()});
}
function stopRealtime(){if(rt&&sb){try{sb.removeChannel(rt)}catch(e){}}rt=null}
setInterval(function(){if(!document.hidden&&authed)syncNow()},60000);
window.addEventListener("message",function(e){if(e.origin!==location.origin||!e.data||typeof e.data.souvFs!=="boolean")return;var f=document.querySelector('iframe[src="souvenir.html"]');if(!f)return;if(e.data.souvFs){if(f.dataset.o==null)f.dataset.o=f.style.cssText;f.style.cssText="position:fixed;inset:0;width:100%;height:100dvh;z-index:60;border:0;background:transparent"}else if(f.dataset.o!=null){f.style.cssText=f.dataset.o;delete f.dataset.o}});
if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
if(!sb){readyRes();chip.style.display="block";setSt("同步元件未載入，請重新整理",true)}else{
 if(outFlag){sb.auth.signOut({scope:"local"}).catch(function(){});readyRes();lockOn();return}
 sb.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_OUT"){stopRealtime();authed=false;chip.style.display="none";lockOn()}});
 sb.auth.getSession().then(function(r){if(r.data&&r.data.session)onAuthed();else{readyRes();lockOn()}}).catch(function(){readyRes()})}
})();


