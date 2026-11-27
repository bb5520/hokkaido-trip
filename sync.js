(function(){"use strict";
var SB_URL="https://cpisljizfsovmygzhhpy.supabase.co",SB_KEY="sb_publishable_72orf9crARS0-Rfb67sFWA_x0i0GuhT"";
var KEYS=["trip_banner","trip_jpyRate","trip_itinerary","trip_flightExtras","trip_hotelExtras","trip_carRentals","trip_dayTours","trip_otherBookings","trip_shopping","trip_expenses","trip_souvenirs","trip_startDate","trip_days","souv","trip_todos","trip_taxEnts"];
var BUCKET="trip-files",DB="trip_blob_store",ST="blobs";
var rawSet=Storage.prototype.setItem,rawGet=Storage.prototype.getItem;
function lraw(k){return rawGet.call(localStorage,k)}
function lg(k,d){try{var v=JSON.parse(lraw(k));return v==null?d:v}catch(e){return d}}
function ls(k,v){rawSet.call(localStorage,k,JSON.stringify(v))}
var dirty=lg("sync_dirty",{}),meta=lg("sync_meta",{}),bq=lg("sync_blobq",[]),base=lg("sync_base",{}),stale={},chg=false,authed=false,busy=false,again=false,pt=0,sb=null,mode="",readyRes;
var ready=new Promise(function(r){readyRes=r});
try{sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}})}catch(e){}
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===localStorage&&KEYS.indexOf(k)>=0){dirty[k]=1;ls("sync_dirty",dirty);sched()}};
function sched(){clearTimeout(pt);pt=setTimeout(syncNow,2000)}

/* ================= 合併邏輯（三方合併：上次同步的版本 / 我的版本 / 雲端版本） ================= */
/* MERGE-START */
var KIND={trip_itinerary:"days",trip_flightExtras:"map",trip_hotelExtras:"map",trip_carRentals:"list",trip_dayTours:"list",trip_otherBookings:"list",trip_shopping:"list",trip_expenses:"list",trip_souvenirs:"list",trip_todos:"list",trip_taxEnts:"list"};
function canon(v){
 if(v===null||typeof v!=="object")return JSON.stringify(v);
 if(Array.isArray(v))return "["+v.map(canon).join(",")+"]";
 return "{"+Object.keys(v).sort().map(function(x){return JSON.stringify(x)+":"+canon(v[x])}).join(",")+"}"}
function same(a,b){return canon(a)===canon(b)}
function pj(s){try{return JSON.parse(s)}catch(e){return undefined}}
function eq(a,b){if(a===b)return true;var x=pj(a),y=pj(b);return x!==undefined&&y!==undefined&&same(x,y)}
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)}
function isObj(x){return !!x&&typeof x==="object"&&!Array.isArray(x)}
function isIdList(x){return Array.isArray(x)&&x.every(function(e){return isObj(e)&&e.id!==undefined&&e.id!==null})}
/* 舊資料沒有 id（例如退稅明細）：用內容算出固定的 id，每支手機算出來都一樣 */
function ensureIds(arr){
 var seen={};
 return arr.map(function(e){
  if(!isObj(e)||(e.id!==undefined&&e.id!==null))return e;
  var h="L"+hash(canon(e));seen[h]=(seen[h]||0)+1;
  var o=Object.assign({},e);o.id=h+"_"+seen[h];return o})}
function idx(arr){
 var o={};
 (arr||[]).forEach(function(e){if(!isObj(e)||e.id===undefined||e.id===null)throw new Error("item without id");o[String(e.id)]=e});
 return o}
/* 同一筆資料：逐欄位合併。我沒改的欄位用雲端的，雲端沒改的用我的，兩邊都改了就用我的（後同步的人） */
function mergeObj(b,m,t){
 if(!isObj(m)||!isObj(t))return m;
 var out={},keys={};
 [b,m,t].forEach(function(o){if(isObj(o))Object.keys(o).forEach(function(x){keys[x]=1})});
 Object.keys(keys).forEach(function(f){
  var bv=isObj(b)?b[f]:undefined,mv=m[f],tv=t[f],v;
  if(same(mv,bv))v=tv;
  else if(same(tv,bv))v=mv;
  else if(isIdList(mv)&&isIdList(tv)&&(bv===undefined||isIdList(bv)))v=mergeList(bv||[],mv,tv);
  else v=mv;
  if(v!==undefined)out[f]=v});
 return out}
/* 清單：依每筆的 id 合併。各自新增的都保留；一邊刪除、另一邊沒動就刪除；一邊刪除、另一邊有改就保留 */
function mergeList(base,mine,theirs){
 base=base||[];mine=mine||[];theirs=theirs||[];
 var B=idx(base),M=idx(mine),T=idx(theirs),ids={},res={};
 [base,mine,theirs].forEach(function(a){a.forEach(function(e){ids[String(e.id)]=1})});
 Object.keys(ids).forEach(function(id){
  var b=B[id],m=M[id],t=T[id],r;
  if(!b){r=(m&&t)?mergeObj(undefined,m,t):(m||t)}
  else if(!m&&!t)r=null;
  else if(!m)r=same(t,b)?null:t;
  else if(!t)r=same(m,b)?null:m;
  else r=mergeObj(b,m,t);
  if(r)res[id]=r});
 var bi=base.map(function(e){return String(e.id)}),mi=mine.map(function(e){return String(e.id)}),ti=theirs.map(function(e){return String(e.id)});
 function inAll(i){return B[i]&&M[i]&&T[i]}
 var reordered=!same(bi.filter(inAll),mi.filter(inAll));
 var primary=reordered?mi:ti,secondary=reordered?ti:mi;
 var order=primary.filter(function(i){return res[i]});
 secondary.forEach(function(i,k){
  if(!res[i]||order.indexOf(i)>=0)return;
  var pos=-1;
  for(var j=k-1;j>=0;j--){var p=order.indexOf(secondary[j]);if(p>=0){pos=p;break}}
  order.splice(pos+1,0,i)});
 return order.map(function(i){return res[i]})}
/* 以 id 為 key 的物件（航班、住宿的補充資料） */
function mergeMap(b,m,t){
 var out={},keys={};
 [b,m,t].forEach(function(o){Object.keys(o).forEach(function(k){keys[k]=1})});
 Object.keys(keys).forEach(function(k){
  var bv=b[k],mv=m[k],tv=t[k],r;
  if(bv===undefined){r=(mv!==undefined&&tv!==undefined)?mergeObj(undefined,mv,tv):(mv!==undefined?mv:tv)}
  else if(mv===undefined&&tv===undefined)r=undefined;
  else if(mv===undefined)r=same(tv,bv)?undefined:tv;
  else if(tv===undefined)r=same(mv,bv)?undefined:mv;
  else r=mergeObj(bv,mv,tv);
  if(r!==undefined)out[k]=r});
 return out}
/* 行程：每一天各自是一份清單 */
function mergeDays(b,m,t){
 function arr(x){return Array.isArray(x)?x:[]}
 b=arr(b);m=arr(m);t=arr(t);
 var len=b.length===0?Math.max(m.length,t.length):(m.length!==b.length?m.length:t.length),out=[];
 for(var i=0;i<len;i++)out.push(mergeList(arr(b[i]),arr(m[i]),arr(t[i])));
 return out}
function mergeRaw(k,baseRaw,mineRaw,theirsRaw){
 var kd=KIND[k],m=pj(mineRaw),t=pj(theirsRaw),b=baseRaw==null?undefined:pj(baseRaw),out;
 if(m===undefined||t===undefined)throw new Error("bad json");
 if(kd==="map"){
  if(!isObj(m)||!isObj(t))throw new Error("bad shape");
  out=mergeMap(isObj(b)?b:{},m,t)}
 else if(kd==="days"){
  if(!Array.isArray(m)||!Array.isArray(t))throw new Error("bad shape");
  out=mergeDays(b,m,t)}
 else{
  if(!Array.isArray(m)||!Array.isArray(t))throw new Error("bad shape");
  out=mergeList(ensureIds(Array.isArray(b)?b:[]),ensureIds(m),ensureIds(t))}
 return JSON.stringify(out)}
/* MERGE-END */

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
function saveState(){ls("sync_meta",meta);ls("sync_dirty",dirty);ls("sync_base",base)}
function fetchRow(k){return sb.from("trip_kv").select("value,updated_at").eq("key",k).maybeSingle().then(function(r){if(r.error)throw r.error;return r.data})}
/* 單一數值（封面、匯率、日期）無法合併：後同步的人為準 */
function pushScalar(k){
 var sent=lraw(k);
 return sb.from("trip_kv").upsert([{key:k,value:sent}],{onConflict:"key"}).select("key,updated_at").then(function(r){
  if(r.error)throw r.error;
  r.data.forEach(function(x){meta[x.key]=x.updated_at;if(lraw(x.key)===sent)delete dirty[x.key]});
  saveState()})}
/* 同步完成後的收尾：result 是雲端現在的內容 */
function finish(k,ts,mine,result){
 meta[k]=ts;
 if(lraw(k)===mine){
  if(result!==mine){rawSet.call(localStorage,k,result);stale[k]=1;chg=true}   /* 別人的修改合併進來了 */
  else base[k]=result;                                                       /* 本機與雲端一致，記為新的「上次同步版本」 */
  delete dirty[k]}
 /* 同步途中本機又被改過：保持待同步，下一輪再合併 */
 saveState()}
/* 清單類資料：先合併再寫入；寫入時要求「雲端還是我剛剛看到的版本」，否則重來 */
function pushMerged(k,tries){
 if(tries>5)return Promise.reject(new Error("conflict"));
 var mine=lraw(k);
 if(mine==null){delete dirty[k];return Promise.resolve()}
 return fetchRow(k).then(function(row){
  if(!row){
   return sb.from("trip_kv").insert({key:k,value:mine}).select("key,updated_at").then(function(r){
    if(r.error){if(r.error.code==="23505")return pushMerged(k,tries+1);throw r.error}
    finish(k,r.data[0].updated_at,mine,mine)})}
  var merged=mergeRaw(k,base[k],mine,row.value);
  if(eq(merged,row.value)){                                   /* 雲端已包含我的修改，不用寫入 */
   finish(k,row.updated_at,mine,eq(mine,row.value)?mine:row.value);return}
  var result=eq(merged,mine)?mine:merged;
  return sb.from("trip_kv").update({value:result}).eq("key",k).eq("updated_at",row.updated_at).select("key,updated_at").then(function(r){
   if(r.error)throw r.error;
   if(!r.data||!r.data.length)return pushMerged(k,tries+1);   /* 這段時間有人改過，重新抓、重新合併 */
   finish(k,r.data[0].updated_at,mine,result)})})}
function pushDirty(){
 var p=Promise.resolve();
 Object.keys(dirty).forEach(function(k){p=p.then(function(){
  if(lraw(k)==null){delete dirty[k];return}
  return KIND[k]?pushMerged(k,0):pushScalar(k)})});
 return p.then(saveState)}
function remote(){return sb.from("trip_kv").select("key,updated_at").then(function(r){if(r.error)throw r.error;var m={};r.data.forEach(function(x){m[x.key]=x.updated_at});return m})}
function syncData(){
 chg=false;
 return remote().then(function(rem){
  var first=!Object.keys(meta).length,hasL=KEYS.some(function(k){return lraw(k)!=null}),hasR=Object.keys(rem).length>0,useLocal=false;
  if(first&&hasL&&hasR)useLocal=!confirm("雲端已有資料，這支手機也有本機資料。\n\n行程、待辦、購物、退稅、花費等清單會自動合併，不會互相覆蓋。\n封面、匯率、旅行日期只能二選一：\n\n按「確定」＝採用雲端的\n按「取消」＝採用這支手機的");
  KEYS.forEach(function(k){
   if(lraw(k)==null)return;
   if(!rem[k])dirty[k]=1;
   else if(first&&(KIND[k]||useLocal))dirty[k]=1});
  ls("sync_dirty",dirty);
  return pushDirty()}).then(remote).then(function(rem){
  var need=KEYS.filter(function(k){return rem[k]&&!dirty[k]&&meta[k]!==rem[k]});
  /* 本機與雲端一致的清單，記為「上次同步版本」；這個頁面剛拉過新資料的先不記，避免畫面還是舊的時被誤判成刪除 */
  KEYS.forEach(function(k){if(KIND[k]&&rem[k]&&!dirty[k]&&meta[k]===rem[k]&&!stale[k]&&lraw(k)!=null)base[k]=lraw(k)});
  ls("sync_base",base);
  if(!need.length)return;
  return sb.from("trip_kv").select("key,value,updated_at").in("key",need).then(function(v){
   if(v.error)throw v.error;
   v.data.forEach(function(x){if(!dirty[x.key]){rawSet.call(localStorage,x.key,x.value);meta[x.key]=x.updated_at;if(KIND[x.key])stale[x.key]=1;chg=true}});
   ls("sync_meta",meta)})}).then(function(){return chg})}
function applyUpdate(){
 var last=+sessionStorage.getItem("sync_rl")||0;
 if(!document.querySelector(".fixed.inset-0")&&Date.now()-last>20000){sessionStorage.setItem("sync_rl",String(Date.now()));reloading=true;location.reload()}
 else setSt("有新資料，點此更新",true,true)}
function syncNow(){
 if(!sb||!authed)return Promise.resolve();
 if(busy){again=true;return Promise.resolve()}
 busy=true;setSt("同步中…");
 return seed().then(syncData).then(function(ch){return flushBlobs().then(function(){return ch})}).then(function(ch){
  var n=new Date();setSt("已同步 "+n.getHours()+":"+("0"+n.getMinutes()).slice(-2));if(ch)applyUpdate()
 }).catch(function(){setSt("離線或同步失敗，點此選單",true)}).then(function(){busy=false;if(again){again=false;sched()}})}
/* ---------- 登入 / 登出 ---------- */
function onAuthed(fresh){authed=true;chip.style.display="block";setSt("同步中…");readyRes();
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
 rawSet.call(localStorage,"sync_out","1");lockOn();mn.style.display="none";chip.style.display="none";em.value="";pw.value="";msg.textContent="";return sb.auth.signOut({scope:"local"}).catch(function(){}).then(wipeLocal)})}
chip.addEventListener("click",function(){if(mode==="reload"){location.reload();return}mn.style.display=mn.style.display==="flex"?"none":"flex"});
b1.addEventListener("click",function(){mn.style.display="none";manual()});
b2.addEventListener("click",function(){mn.style.display="none";logout()});
lb.addEventListener("click",function(){if(sb)login();else msg.textContent="尚未連線，請稍後再試"});
pw.addEventListener("keydown",function(e){if(e.key==="Enter")lb.click()});
document.addEventListener("visibilitychange",function(){if(!document.hidden)syncNow()});
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-sync]");if(!t)return;var a=t.getAttribute("data-sync");if(a==="logout")logout();else if(a==="now")manual()});
window.addEventListener("online",syncNow);
window.addEventListener("message",function(e){if(e.origin!==location.origin||!e.data||typeof e.data.souvFs!=="boolean")return;var f=document.querySelector('iframe[src="souvenir.html"]');if(!f)return;if(e.data.souvFs){if(f.dataset.o==null)f.dataset.o=f.style.cssText;f.style.cssText="position:fixed;inset:0;width:100%;height:100dvh;z-index:60;border:0;background:transparent"}else if(f.dataset.o!=null){f.style.cssText=f.dataset.o;delete f.dataset.o}});
if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
if(!sb){readyRes();chip.style.display="block";setSt("同步元件未載入，請重新整理",true)}else{
 if(outFlag){sb.auth.signOut({scope:"local"}).catch(function(){});readyRes();lockOn();return}
 sb.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_OUT"){authed=false;chip.style.display="none";lockOn()}});
 sb.auth.getSession().then(function(r){if(r.data&&r.data.session)onAuthed();else{readyRes();lockOn()}}).catch(function(){readyRes()})}
})();
