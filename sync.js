(function(){"use strict";
var SB_URL="https://cpisljizfsovmygzhhpy.supabase.co",SB_KEY="sb_publishable_72orf9crARS0-Rfb67sFWA_x0i0GuhT";
var KEYS=["trip_banner","trip_jpyRate","trip_itinerary","trip_flightExtras","trip_hotelExtras","trip_carRentals","trip_dayTours","trip_otherBookings","trip_shopping","trip_expenses","trip_startDate","trip_days"];
var BUCKET="trip-files",DB="trip_blob_store",ST="blobs";
var rawSet=Storage.prototype.setItem,rawGet=Storage.prototype.getItem;
function lraw(k){return rawGet.call(localStorage,k)}
function lg(k,d){try{var v=JSON.parse(lraw(k));return v==null?d:v}catch(e){return d}}
function ls(k,v){rawSet.call(localStorage,k,JSON.stringify(v))}
var dirty=lg("sync_dirty",{}),meta=lg("sync_meta",{}),bq=lg("sync_blobq",[]),authed=false,busy=false,again=false,pt=0,sb=null,mode="",readyRes;
var ready=new Promise(function(r){readyRes=r});
try{sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}})}catch(e){}
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===localStorage&&KEYS.indexOf(k)>=0){dirty[k]=1;ls("sync_dirty",dirty);sched()}};
function sched(){clearTimeout(pt);pt=setTimeout(syncNow,2000)}
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
window.SYNC={
 up:function(id){if(bq.indexOf(id)<0){bq.push(id);ls("sync_blobq",bq)}flushBlobs().catch(function(){})},
 down:function(id){return ready.then(function(){
  if(!sb||!authed)return null;
  if(neg[id]&&Date.now()-neg[id]<30000)return null;
  return pend[id]||(pend[id]=sb.storage.from(BUCKET).download(id).then(function(r){if(r.error||!r.data)throw 0;return toUrl(r.data)}).then(function(u){return iput(id,u).then(function(){return u})}).catch(function(){neg[id]=Date.now();return null}).then(function(u){delete pend[id];return u}))})}
};
/* ---------- 資料同步 ---------- */
function seed(){if(lraw("sync_seeded"))return Promise.resolve();return ikeys().then(function(ks){ks.forEach(function(id){if(bq.indexOf(id)<0)bq.push(id)});ls("sync_blobq",bq);rawSet.call(localStorage,"sync_seeded","1")}).catch(function(){})}
function pushDirty(){
 var sent={},rows=[];
 Object.keys(dirty).forEach(function(k){var v=lraw(k);if(v==null)delete dirty[k];else{sent[k]=v;rows.push({key:k,value:v})}});
 if(!rows.length){ls("sync_dirty",dirty);return Promise.resolve()}
 return sb.from("trip_kv").upsert(rows,{onConflict:"key"}).select("key,updated_at").then(function(r){
  if(r.error)throw r.error;
  r.data.forEach(function(x){meta[x.key]=x.updated_at;if(lraw(x.key)===sent[x.key])delete dirty[x.key]});
  ls("sync_meta",meta);ls("sync_dirty",dirty)})}
function remote(){return sb.from("trip_kv").select("key,updated_at").then(function(r){if(r.error)throw r.error;var m={};r.data.forEach(function(x){m[x.key]=x.updated_at});return m})}
function pullChanges(){
 return remote().then(function(rem){
  var first=!Object.keys(meta).length,hasL=KEYS.some(function(k){return lraw(k)!=null}),hasR=Object.keys(rem).length>0,useLocal=false;
  if(first&&hasL&&hasR)useLocal=!confirm("雲端已有資料，這支手機也有本機資料。\n\n按「確定」＝用雲端資料取代本機\n按「取消」＝以本機資料覆蓋雲端");
  KEYS.forEach(function(k){if(lraw(k)!=null&&(!rem[k]||(first&&useLocal)))dirty[k]=1});
  ls("sync_dirty",dirty);return pushDirty()}).then(remote).then(function(rem){
  var need=KEYS.filter(function(k){return rem[k]&&!dirty[k]&&meta[k]!==rem[k]});
  if(!need.length)return false;
  return sb.from("trip_kv").select("key,value,updated_at").in("key",need).then(function(v){
   if(v.error)throw v.error;
   v.data.forEach(function(x){if(!dirty[x.key]){rawSet.call(localStorage,x.key,x.value);meta[x.key]=x.updated_at}});
   ls("sync_meta",meta);return true})})}
function applyUpdate(){
 var last=+sessionStorage.getItem("sync_rl")||0;
 if(!document.querySelector(".fixed.inset-0")&&Date.now()-last>20000){sessionStorage.setItem("sync_rl",String(Date.now()));location.reload()}
 else setSt("有新資料，點此更新",true,true)}
function syncNow(){
 if(!sb||!authed)return Promise.resolve();
 if(busy){again=true;return Promise.resolve()}
 busy=true;setSt("同步中…");
 return seed().then(pullChanges).then(function(ch){return flushBlobs().then(function(){return ch})}).then(function(ch){
  var n=new Date();setSt("已同步 "+n.getHours()+":"+("0"+n.getMinutes()).slice(-2));if(ch)applyUpdate()
 }).catch(function(){setSt("離線或同步失敗，點此選單",true)}).then(function(){busy=false;if(again){again=false;sched()}})}
/* ---------- 登入 / 登出 ---------- */
function onAuthed(){authed=true;ov.style.display="none";chip.style.display="block";setSt("同步中…");readyRes();syncNow()}
function login(){lb.disabled=true;msg.textContent="";
 sb.auth.signInWithPassword({email:em.value.trim(),password:pw.value}).then(function(r){lb.disabled=false;
  if(r.error){msg.textContent=/fetch|network/i.test(r.error.message)?"網路連線失敗":"帳號或密碼錯誤";return}
  pw.value="";onAuthed()}).catch(function(){lb.disabled=false;msg.textContent="網路連線失敗"})}
function wipeLocal(){KEYS.concat(["sync_dirty","sync_meta","sync_blobq","sync_seeded"]).forEach(function(k){localStorage.removeItem(k)});var q=indexedDB.deleteDatabase(DB);q.onsuccess=q.onerror=q.onblocked=function(){location.reload()}}
function logout(){syncNow().then(function(){var n=Object.keys(dirty).length+bq.length;
 if(!confirm(n?"還有 "+n+" 項資料尚未同步到雲端，登出會遺失它們。確定要登出嗎？":"登出會清除這支手機上的本機資料（雲端資料不受影響）。確定嗎？"))return;
 return sb.auth.signOut().catch(function(){}).then(wipeLocal)})}
chip.addEventListener("click",function(){if(mode==="reload"){location.reload();return}mn.style.display=mn.style.display==="flex"?"none":"flex"});
b1.addEventListener("click",function(){mn.style.display="none";syncNow()});
b2.addEventListener("click",function(){mn.style.display="none";logout()});
lb.addEventListener("click",function(){if(sb)login();else msg.textContent="尚未連線，請稍後再試"});
pw.addEventListener("keydown",function(e){if(e.key==="Enter")lb.click()});
document.addEventListener("visibilitychange",function(){if(!document.hidden)syncNow()});
window.addEventListener("online",syncNow);
if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
if(!sb){readyRes();chip.style.display="block";setSt("同步元件未載入，請重新整理",true)}else{
 sb.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_OUT"){authed=false;chip.style.display="none";ov.style.display="flex"}});
 sb.auth.getSession().then(function(r){if(r.data&&r.data.session)onAuthed();else{readyRes();ov.style.display="flex"}}).catch(function(){readyRes()})}
})();
