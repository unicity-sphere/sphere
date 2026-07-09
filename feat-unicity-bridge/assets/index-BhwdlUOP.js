import{j as se,l as ae,m as w,r as ke,C as fe,a2 as F,a as xe,R as Ce,O as Fe,E as Re,t as Ne,W as Le}from"./index-SHvJ_SIR.js";import{U as De,n as D,r as Q,c as oe,o as je}from"./index-lwM0RWb1.js";import{g as ye}from"./index-Ttt2c_he.js";import"./index-DqHLZmPZ.js";import"./index-CEHtedo2.js";import"./index-DB4xTj6r.js";import"./index-BuT9c-wq.js";var he={exports:{}},ze=he.exports,_e;function Ue(){return _e||(_e=1,(function(e,t){(function(i,r){e.exports=r()})(ze,(function(){var i=1e3,r=6e4,s=36e5,n="millisecond",o="second",c="minute",g="hour",m="day",v="week",$="month",k="quarter",C="year",R="date",Y="Invalid Date",X=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,ee=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,te={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(f){var l=["th","st","nd","rd"],a=f%100;return"["+f+(l[(a-20)%10]||l[a]||l[0])+"]"}},ie=function(f,l,a){var d=String(f);return!d||d.length>=l?f:""+Array(l+1-d.length).join(a)+f},q={s:ie,z:function(f){var l=-f.utcOffset(),a=Math.abs(l),d=Math.floor(a/60),u=a%60;return(l<=0?"+":"-")+ie(d,2,"0")+":"+ie(u,2,"0")},m:function f(l,a){if(l.date()<a.date())return-f(a,l);var d=12*(a.year()-l.year())+(a.month()-l.month()),u=l.clone().add(d,$),p=a-u<0,h=l.clone().add(d+(p?-1:1),$);return+(-(d+(a-u)/(p?u-h:h-u))||0)},a:function(f){return f<0?Math.ceil(f)||0:Math.floor(f)},p:function(f){return{M:$,y:C,w:v,d:m,D:R,h:g,m:c,s:o,ms:n,Q:k}[f]||String(f||"").toLowerCase().replace(/s$/,"")},u:function(f){return f===void 0}},M="en",S={};S[M]=te;var V="$isDayjsObject",B=function(f){return f instanceof le||!(!f||!f[V])},ce=function f(l,a,d){var u;if(!l)return M;if(typeof l=="string"){var p=l.toLowerCase();S[p]&&(u=p),a&&(S[p]=a,u=p);var h=l.split("-");if(!u&&h.length>1)return f(h[0])}else{var x=l.name;S[x]=l,u=x}return!d&&u&&(M=u),u||!d&&M},I=function(f,l){if(B(f))return f.clone();var a=typeof l=="object"?l:{};return a.date=f,a.args=arguments,new le(a)},y=q;y.l=ce,y.i=B,y.w=function(f,l){return I(f,{locale:l.$L,utc:l.$u,x:l.$x,$offset:l.$offset})};var le=(function(){function f(a){this.$L=ce(a.locale,null,!0),this.parse(a),this.$x=this.$x||a.x||{},this[V]=!0}var l=f.prototype;return l.parse=function(a){this.$d=(function(d){var u=d.date,p=d.utc;if(u===null)return new Date(NaN);if(y.u(u))return new Date;if(u instanceof Date)return new Date(u);if(typeof u=="string"&&!/Z$/i.test(u)){var h=u.match(X);if(h){var x=h[2]-1||0,b=(h[7]||"0").substring(0,3);return p?new Date(Date.UTC(h[1],x,h[3]||1,h[4]||0,h[5]||0,h[6]||0,b)):new Date(h[1],x,h[3]||1,h[4]||0,h[5]||0,h[6]||0,b)}}return new Date(u)})(a),this.init()},l.init=function(){var a=this.$d;this.$y=a.getFullYear(),this.$M=a.getMonth(),this.$D=a.getDate(),this.$W=a.getDay(),this.$H=a.getHours(),this.$m=a.getMinutes(),this.$s=a.getSeconds(),this.$ms=a.getMilliseconds()},l.$utils=function(){return y},l.isValid=function(){return this.$d.toString()!==Y},l.isSame=function(a,d){var u=I(a);return this.startOf(d)<=u&&u<=this.endOf(d)},l.isAfter=function(a,d){return I(a)<this.startOf(d)},l.isBefore=function(a,d){return this.endOf(d)<I(a)},l.$g=function(a,d,u){return y.u(a)?this[d]:this.set(u,a)},l.unix=function(){return Math.floor(this.valueOf()/1e3)},l.valueOf=function(){return this.$d.getTime()},l.startOf=function(a,d){var u=this,p=!!y.u(d)||d,h=y.p(a),x=function(P,O){var z=y.w(u.$u?Date.UTC(u.$y,O,P):new Date(u.$y,O,P),u);return p?z:z.endOf(m)},b=function(P,O){return y.w(u.toDate()[P].apply(u.toDate("s"),(p?[0,0,0,0]:[23,59,59,999]).slice(O)),u)},T=this.$W,_=this.$M,A=this.$D,J="set"+(this.$u?"UTC":"");switch(h){case C:return p?x(1,0):x(31,11);case $:return p?x(1,_):x(0,_+1);case v:var W=this.$locale().weekStart||0,re=(T<W?T+7:T)-W;return x(p?A-re:A+(6-re),_);case m:case R:return b(J+"Hours",0);case g:return b(J+"Minutes",1);case c:return b(J+"Seconds",2);case o:return b(J+"Milliseconds",3);default:return this.clone()}},l.endOf=function(a){return this.startOf(a,!1)},l.$set=function(a,d){var u,p=y.p(a),h="set"+(this.$u?"UTC":""),x=(u={},u[m]=h+"Date",u[R]=h+"Date",u[$]=h+"Month",u[C]=h+"FullYear",u[g]=h+"Hours",u[c]=h+"Minutes",u[o]=h+"Seconds",u[n]=h+"Milliseconds",u)[p],b=p===m?this.$D+(d-this.$W):d;if(p===$||p===C){var T=this.clone().set(R,1);T.$d[x](b),T.init(),this.$d=T.set(R,Math.min(this.$D,T.daysInMonth())).$d}else x&&this.$d[x](b);return this.init(),this},l.set=function(a,d){return this.clone().$set(a,d)},l.get=function(a){return this[y.p(a)]()},l.add=function(a,d){var u,p=this;a=Number(a);var h=y.p(d),x=function(_){var A=I(p);return y.w(A.date(A.date()+Math.round(_*a)),p)};if(h===$)return this.set($,this.$M+a);if(h===C)return this.set(C,this.$y+a);if(h===m)return x(1);if(h===v)return x(7);var b=(u={},u[c]=r,u[g]=s,u[o]=i,u)[h]||1,T=this.$d.getTime()+a*b;return y.w(T,this)},l.subtract=function(a,d){return this.add(-1*a,d)},l.format=function(a){var d=this,u=this.$locale();if(!this.isValid())return u.invalidDate||Y;var p=a||"YYYY-MM-DDTHH:mm:ssZ",h=y.z(this),x=this.$H,b=this.$m,T=this.$M,_=u.weekdays,A=u.months,J=u.meridiem,W=function(O,z,ne,de){return O&&(O[z]||O(d,p))||ne[z].slice(0,de)},re=function(O){return y.s(x%12||12,O,"0")},P=J||function(O,z,ne){var de=O<12?"AM":"PM";return ne?de.toLowerCase():de};return p.replace(ee,(function(O,z){return z||(function(ne){switch(ne){case"YY":return String(d.$y).slice(-2);case"YYYY":return y.s(d.$y,4,"0");case"M":return T+1;case"MM":return y.s(T+1,2,"0");case"MMM":return W(u.monthsShort,T,A,3);case"MMMM":return W(A,T);case"D":return d.$D;case"DD":return y.s(d.$D,2,"0");case"d":return String(d.$W);case"dd":return W(u.weekdaysMin,d.$W,_,2);case"ddd":return W(u.weekdaysShort,d.$W,_,3);case"dddd":return _[d.$W];case"H":return String(x);case"HH":return y.s(x,2,"0");case"h":return re(1);case"hh":return re(2);case"a":return P(x,b,!0);case"A":return P(x,b,!1);case"m":return String(b);case"mm":return y.s(b,2,"0");case"s":return String(d.$s);case"ss":return y.s(d.$s,2,"0");case"SSS":return y.s(d.$ms,3,"0");case"Z":return h}return null})(O)||h.replace(":","")}))},l.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},l.diff=function(a,d,u){var p,h=this,x=y.p(d),b=I(a),T=(b.utcOffset()-this.utcOffset())*r,_=this-b,A=function(){return y.m(h,b)};switch(x){case C:p=A()/12;break;case $:p=A();break;case k:p=A()/3;break;case v:p=(_-T)/6048e5;break;case m:p=(_-T)/864e5;break;case g:p=_/s;break;case c:p=_/r;break;case o:p=_/i;break;default:p=_}return u?p:y.a(p)},l.daysInMonth=function(){return this.endOf($).$D},l.$locale=function(){return S[this.$L]},l.locale=function(a,d){if(!a)return this.$L;var u=this.clone(),p=ce(a,d,!0);return p&&(u.$L=p),u},l.clone=function(){return y.w(this.$d,this)},l.toDate=function(){return new Date(this.valueOf())},l.toJSON=function(){return this.isValid()?this.toISOString():null},l.toISOString=function(){return this.$d.toISOString()},l.toString=function(){return this.$d.toUTCString()},f})(),Te=le.prototype;return I.prototype=Te,[["$ms",n],["$s",o],["$m",c],["$H",g],["$W",m],["$M",$],["$y",C],["$D",R]].forEach((function(f){Te[f[1]]=function(l){return this.$g(l,f[0],f[1])}})),I.extend=function(f,l){return f.$i||(f(l,le,I),f.$i=!0),I},I.locale=ce,I.isDayjs=B,I.unix=function(f){return I(1e3*f)},I.en=S[M],I.Ls=S,I.p={},I}))})(he)),he.exports}var Ee=Ue();const K=ye(Ee);var me={exports:{}},Ye=me.exports,Me;function qe(){return Me||(Me=1,(function(e,t){(function(i,r){e.exports=r()})(Ye,(function(){return{name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(i){var r=["th","st","nd","rd"],s=i%100;return"["+i+(r[(s-20)%10]||r[s]||r[0])+"]"}}}))})(me)),me.exports}var Be=qe();const We=ye(Be);var ge={exports:{}},Pe=ge.exports,Se;function He(){return Se||(Se=1,(function(e,t){(function(i,r){e.exports=r()})(Pe,(function(){return function(i,r,s){i=i||{};var n=r.prototype,o={future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"};function c(m,v,$,k){return n.fromToBase(m,v,$,k)}s.en.relativeTime=o,n.fromToBase=function(m,v,$,k,C){for(var R,Y,X,ee=$.$locale().relativeTime||o,te=i.thresholds||[{l:"s",r:44,d:"second"},{l:"m",r:89},{l:"mm",r:44,d:"minute"},{l:"h",r:89},{l:"hh",r:21,d:"hour"},{l:"d",r:35},{l:"dd",r:25,d:"day"},{l:"M",r:45},{l:"MM",r:10,d:"month"},{l:"y",r:17},{l:"yy",d:"year"}],ie=te.length,q=0;q<ie;q+=1){var M=te[q];M.d&&(R=k?s(m).diff($,M.d,!0):$.diff(m,M.d,!0));var S=(i.rounding||Math.round)(Math.abs(R));if(X=R>0,S<=M.r||!M.r){S<=1&&q>0&&(M=te[q-1]);var V=ee[M.l];C&&(S=C(""+S)),Y=typeof V=="string"?V.replace("%d",S):V(S,v,M.l,X);break}}if(v)return Y;var B=X?ee.future:ee.past;return typeof B=="function"?B(Y):B.replace("%s",Y)},n.to=function(m,v){return c(m,v,this,!0)},n.from=function(m,v){return c(m,v,this)};var g=function(m){return m.$u?s.utc():s()};n.toNow=function(m){return this.to(g(this),m)},n.fromNow=function(m){return this.from(g(this),m)}}}))})(ge)),ge.exports}var Ge=He();const Ve=ye(Ge);var we={exports:{}},Je=we.exports,Oe;function Ze(){return Oe||(Oe=1,(function(e,t){(function(i,r){e.exports=r()})(Je,(function(){return function(i,r,s){s.updateLocale=function(n,o){var c=s.Ls[n];if(c)return(o?Object.keys(o):[]).forEach((function(g){c[g]=o[g]})),c}}}))})(we)),we.exports}var Ke=Ze();const Qe=ye(Ke);K.extend(Ve);K.extend(Qe);const Xe={...We,name:"en-web3-modal",relativeTime:{future:"in %s",past:"%s ago",s:"%d sec",m:"1 min",mm:"%d min",h:"1 hr",hh:"%d hrs",d:"1 d",dd:"%d d",M:"1 mo",MM:"%d mo",y:"1 yr",yy:"%d yr"}},et=["January","February","March","April","May","June","July","August","September","October","November","December"];K.locale("en-web3-modal",Xe);const $e={getMonthNameByIndex(e){return et[e]},getYear(e=new Date().toISOString()){return K(e).year()},getRelativeDateFromNow(e){return K(e).locale("en-web3-modal").fromNow(!0)},formatDate(e,t="DD MMM"){return K(e).format(t)}},tt=3,pe=.1,it=["receive","deposit","borrow","claim"],rt=["withdraw","repay","burn"],Z={getTransactionGroupTitle(e,t){const i=$e.getYear(),r=$e.getMonthNameByIndex(t);return e===i?r:`${r} ${e}`},getTransactionImages(e){const[t]=e;return e?.length>1?e.map(r=>this.getTransactionImage(r)):[this.getTransactionImage(t)]},getTransactionImage(e){return{type:Z.getTransactionTransferTokenType(e),url:Z.getTransactionImageURL(e)}},getTransactionImageURL(e){let t;const i=!!e?.nft_info,r=!!e?.fungible_info;return e&&i?t=e?.nft_info?.content?.preview?.url:e&&r&&(t=e?.fungible_info?.icon?.url),t},getTransactionTransferTokenType(e){if(e?.fungible_info)return"FUNGIBLE";if(e?.nft_info)return"NFT"},getTransactionDescriptions(e,t){const i=e?.metadata?.operationType,r=t||e?.transfers,s=r&&r.length>0,n=r&&r.length>1,o=s&&r.every(k=>!!k?.fungible_info),[c,g]=r||[];let m=this.getTransferDescription(c),v=this.getTransferDescription(g);if(!s)return(i==="send"||i==="receive")&&o?(m=De.getTruncateString({string:e?.metadata.sentFrom,charsStart:4,charsEnd:6,truncate:"middle"}),v=De.getTruncateString({string:e?.metadata.sentTo,charsStart:4,charsEnd:6,truncate:"middle"}),[m,v]):[e.metadata.status];if(n)return r?.map(k=>this.getTransferDescription(k));let $="";return it.includes(i)?$="+":rt.includes(i)&&($="-"),m=$.concat(m),[m]},getTransferDescription(e){let t="";return e&&(e?.nft_info?t=e?.nft_info?.name||"-":e?.fungible_info&&(t=this.getFungibleTransferDescription(e)||"-")),t},getFungibleTransferDescription(e){return e?[this.getQuantityFixedValue(e?.quantity.numeric),e?.fungible_info?.symbol].join(" ").trim():null},mergeTransfers(e){if(e?.length<=1)return e;const i=this.filterGasFeeTransfers(e).reduce((s,n)=>{const o=n?.fungible_info?.name,c=s.find(({fungible_info:g,direction:m})=>o&&o===g?.name&&m===n.direction);if(c){const g=Number(c.quantity.numeric)+Number(n.quantity.numeric);c.quantity.numeric=g.toString(),c.value=(c.value||0)+(n.value||0)}else s.push(n);return s},[]);let r=i;return i.length>2&&(r=i.sort((s,n)=>(n.value||0)-(s.value||0)).slice(0,2)),r=r.sort((s,n)=>s.direction==="out"&&n.direction==="in"?-1:s.direction==="in"&&n.direction==="out"?1:0),r},filterGasFeeTransfers(e){const t=e?.reduce((r,s)=>{const n=s?.fungible_info?.name;return n&&(r[n]||(r[n]=[]),r[n].push(s)),r},{}),i=[];return Object.values(t??{}).forEach(r=>{if(r.length===1){const s=r[0];s&&i.push(s)}else{const s=r.filter(o=>o.direction==="in"),n=r.filter(o=>o.direction==="out");if(s.length===1&&n.length===1){const o=s[0],c=n[0];let g=!1;if(o&&c){const m=Number(o.quantity.numeric),v=Number(c.quantity.numeric);v<m*pe?(i.push(o),g=!0):m<v*pe&&(i.push(c),g=!0)}g||i.push(...r)}else{const o=this.filterGasFeesFromTokenGroup(r);i.push(...o)}}}),e?.forEach(r=>{r?.fungible_info?.name||i.push(r)}),i},filterGasFeesFromTokenGroup(e){if(e.length<=1)return e;const t=e?.map(c=>Number(c.quantity.numeric)),i=Math.max(...t),r=Math.min(...t),s=.01;if(r<i*s)return e?.filter(g=>Number(g.quantity.numeric)>=i*s);const n=e?.filter(c=>c.direction==="in"),o=e?.filter(c=>c.direction==="out");if(n.length===1&&o.length===1){const c=n[0],g=o[0];if(c&&g){const m=Number(c.quantity.numeric),v=Number(g.quantity.numeric);if(v<m*pe)return[c];if(m<v*pe)return[g]}}return e},getQuantityFixedValue(e){return e?parseFloat(e).toFixed(tt):null}};var be;(function(e){e.approve="approved",e.bought="bought",e.borrow="borrowed",e.burn="burnt",e.cancel="canceled",e.claim="claimed",e.deploy="deployed",e.deposit="deposited",e.execute="executed",e.mint="minted",e.receive="received",e.repay="repaid",e.send="sent",e.sell="sold",e.stake="staked",e.trade="swapped",e.unstake="unstaked",e.withdraw="withdrawn"})(be||(be={}));const nt=se`
  :host > wui-flex {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 40px;
    height: 40px;
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.core.glass010};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-no-images='true']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[3]} !important;
  }

  :host > wui-flex wui-image {
    display: block;
  }

  :host > wui-flex,
  :host > wui-flex wui-image,
  .swap-images-container,
  .swap-images-container.nft,
  wui-image.nft {
    border-top-left-radius: var(--local-left-border-radius);
    border-top-right-radius: var(--local-right-border-radius);
    border-bottom-left-radius: var(--local-left-border-radius);
    border-bottom-right-radius: var(--local-right-border-radius);
  }

  .swap-images-container {
    position: relative;
    width: 40px;
    height: 40px;
    overflow: hidden;
  }

  .swap-images-container wui-image:first-child {
    position: absolute;
    width: 40px;
    height: 40px;
    top: 0;
    left: 0%;
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-images-container wui-image:last-child {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  .swap-fallback-container {
    position: absolute;
    inset: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .swap-fallback-container.first {
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-fallback-container.last {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  wui-flex.status-box {
    position: absolute;
    right: 0;
    bottom: 0;
    transform: translate(20%, 20%);
    border-radius: ${({borderRadius:e})=>e[4]};
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.backgroundPrimary};
    overflow: hidden;
    width: 16px;
    height: 16px;
  }
`;var U=function(e,t,i,r){var s=arguments.length,n=s<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var c=e.length-1;c>=0;c--)(o=e[c])&&(n=(s<3?o(n):s>3?o(t,i,n):o(t,i))||n);return s>3&&n&&Object.defineProperty(t,i,n),n};let N=class extends ae{constructor(){super(...arguments),this.images=[],this.secondImage={type:void 0,url:""},this.failedImageUrls=new Set}handleImageError(t){return i=>{i.stopPropagation(),this.failedImageUrls.add(t),this.requestUpdate()}}render(){const[t,i]=this.images;this.images.length||(this.dataset.noImages="true");const r=t?.type==="NFT",s=i?.url?i.type==="NFT":r,n=r?"var(--apkt-borderRadius-3)":"var(--apkt-borderRadius-5)",o=s?"var(--apkt-borderRadius-3)":"var(--apkt-borderRadius-5)";return this.style.cssText=`
    --local-left-border-radius: ${n};
    --local-right-border-radius: ${o};
    `,w`<wui-flex> ${this.templateVisual()} ${this.templateIcon()} </wui-flex>`}templateVisual(){const[t,i]=this.images;return this.images.length===2&&(t?.url||i?.url)?this.renderSwapImages(t,i):t?.url&&!this.failedImageUrls.has(t.url)?this.renderSingleImage(t):t?.type==="NFT"?this.renderPlaceholderIcon("nftPlaceholder"):this.renderPlaceholderIcon("coinPlaceholder")}renderSwapImages(t,i){return w`<div class="swap-images-container">
      ${t?.url?this.renderImageOrFallback(t,"first",!0):null}
      ${i?.url?this.renderImageOrFallback(i,"last",!0):null}
    </div>`}renderSingleImage(t){return this.renderImageOrFallback(t,void 0,!1)}renderImageOrFallback(t,i,r=!1){return t.url?this.failedImageUrls.has(t.url)?r&&i?this.renderFallbackIconInContainer(i):this.renderFallbackIcon():w`<wui-image
      src=${t.url}
      alt="Transaction image"
      @onLoadError=${this.handleImageError(t.url)}
    ></wui-image>`:null}renderFallbackIconInContainer(t){return w`<div class="swap-fallback-container ${t}">${this.renderFallbackIcon()}</div>`}renderFallbackIcon(){return w`<wui-icon
      size="xl"
      weight="regular"
      color="default"
      name="networkPlaceholder"
    ></wui-icon>`}renderPlaceholderIcon(t){return w`<wui-icon size="xl" weight="regular" color="default" name=${t}></wui-icon>`}templateIcon(){let t="accent-primary",i;return i=this.getIcon(),this.status&&(t=this.getStatusColor()),i?w`
      <wui-flex alignItems="center" justifyContent="center" class="status-box">
        <wui-icon-box size="sm" color=${t} icon=${i}></wui-icon-box>
      </wui-flex>
    `:null}getDirectionIcon(){switch(this.direction){case"in":return"arrowBottom";case"out":return"arrowTop";default:return}}getIcon(){return this.onlyDirectionIcon?this.getDirectionIcon():this.type==="trade"?"swapHorizontal":this.type==="approve"?"checkmark":this.type==="cancel"?"close":this.getDirectionIcon()}getStatusColor(){switch(this.status){case"confirmed":return"success";case"failed":return"error";case"pending":return"inverse";default:return"accent-primary"}}};N.styles=[nt];U([D()],N.prototype,"type",void 0);U([D()],N.prototype,"status",void 0);U([D()],N.prototype,"direction",void 0);U([D({type:Boolean})],N.prototype,"onlyDirectionIcon",void 0);U([D({type:Array})],N.prototype,"images",void 0);U([D({type:Object})],N.prototype,"secondImage",void 0);U([Q()],N.prototype,"failedImageUrls",void 0);N=U([oe("wui-transaction-visual")],N);const st=se`
  :host {
    width: 100%;
  }

  :host > wui-flex:first-child {
    align-items: center;
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    width: 100%;
  }

  :host > wui-flex:first-child wui-text:nth-child(1) {
    text-transform: capitalize;
  }

  wui-transaction-visual {
    width: 40px;
    height: 40px;
  }

  wui-flex {
    flex: 1;
  }

  :host wui-flex wui-flex {
    overflow: hidden;
  }

  :host .description-container wui-text span {
    word-break: break-all;
  }

  :host .description-container wui-text {
    overflow: hidden;
  }

  :host .description-separator-icon {
    margin: 0px 6px;
  }

  :host wui-text > span {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
`;var E=function(e,t,i,r){var s=arguments.length,n=s<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var c=e.length-1;c>=0;c--)(o=e[c])&&(n=(s<3?o(n):s>3?o(t,i,n):o(t,i))||n);return s>3&&n&&Object.defineProperty(t,i,n),n};let L=class extends ae{constructor(){super(...arguments),this.type="approve",this.onlyDirectionIcon=!1,this.images=[]}render(){return w`
      <wui-flex>
        <wui-transaction-visual
          .status=${this.status}
          direction=${je(this.direction)}
          type=${this.type}
          .onlyDirectionIcon=${this.onlyDirectionIcon}
          .images=${this.images}
        ></wui-transaction-visual>
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="lg-medium" color="primary">
            ${be[this.type]||this.type}
          </wui-text>
          <wui-flex class="description-container">
            ${this.templateDescription()} ${this.templateSecondDescription()}
          </wui-flex>
        </wui-flex>
        <wui-text variant="sm-medium" color="secondary"><span>${this.date}</span></wui-text>
      </wui-flex>
    `}templateDescription(){const t=this.descriptions?.[0];return t?w`
          <wui-text variant="md-regular" color="secondary">
            <span>${t}</span>
          </wui-text>
        `:null}templateSecondDescription(){const t=this.descriptions?.[1];return t?w`
          <wui-icon class="description-separator-icon" size="sm" name="arrowRight"></wui-icon>
          <wui-text variant="md-regular" color="secondary">
            <span>${t}</span>
          </wui-text>
        `:null}};L.styles=[ke,st];E([D()],L.prototype,"type",void 0);E([D({type:Array})],L.prototype,"descriptions",void 0);E([D()],L.prototype,"date",void 0);E([D({type:Boolean})],L.prototype,"onlyDirectionIcon",void 0);E([D()],L.prototype,"status",void 0);E([D()],L.prototype,"direction",void 0);E([D({type:Array})],L.prototype,"images",void 0);L=E([oe("wui-transaction-list-item")],L);const at=se`
  wui-flex {
    position: relative;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e[128]};
  }

  .fallback-icon {
    color: ${({tokens:e})=>e.theme.iconInverse};
    border-radius: ${({borderRadius:e})=>e[3]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .direction-icon,
  .status-image {
    position: absolute;
    right: 0;
    bottom: 0;
    border-radius: ${({borderRadius:e})=>e[128]};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .direction-icon {
    padding: ${({spacing:e})=>e["01"]};
    color: ${({tokens:e})=>e.core.iconSuccess};

    background-color: color-mix(
      in srgb,
      ${({tokens:e})=>e.core.textSuccess} 30%,
      ${({tokens:e})=>e.theme.backgroundPrimary} 70%
    );
  }

  /* -- Sizes --------------------------------------------------- */
  :host([data-size='sm']) > wui-image:not(.status-image),
  :host([data-size='sm']) > wui-flex {
    width: 24px;
    height: 24px;
  }

  :host([data-size='lg']) > wui-image:not(.status-image),
  :host([data-size='lg']) > wui-flex {
    width: 40px;
    height: 40px;
  }

  :host([data-size='sm']) .fallback-icon {
    height: 16px;
    width: 16px;
    padding: ${({spacing:e})=>e[1]};
  }

  :host([data-size='lg']) .fallback-icon {
    height: 32px;
    width: 32px;
    padding: ${({spacing:e})=>e[1]};
  }

  :host([data-size='sm']) .direction-icon,
  :host([data-size='sm']) .status-image {
    transform: translate(40%, 30%);
  }

  :host([data-size='lg']) .direction-icon,
  :host([data-size='lg']) .status-image {
    transform: translate(40%, 10%);
  }

  :host([data-size='sm']) .status-image {
    height: 14px;
    width: 14px;
  }

  :host([data-size='lg']) .status-image {
    height: 20px;
    width: 20px;
  }

  /* -- Crop effects --------------------------------------------------- */
  .swap-crop-left-image,
  .swap-crop-right-image {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .swap-crop-left-image {
    left: 0;
    clip-path: inset(0px calc(50% + 1.5px) 0px 0%);
  }

  .swap-crop-right-image {
    right: 0;
    clip-path: inset(0px 0px 0px calc(50% + 1.5px));
  }
`;var ue=function(e,t,i,r){var s=arguments.length,n=s<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var c=e.length-1;c>=0;c--)(o=e[c])&&(n=(s<3?o(n):s>3?o(t,i,n):o(t,i))||n);return s>3&&n&&Object.defineProperty(t,i,n),n};const ve={sm:"xxs",lg:"md"};let H=class extends ae{constructor(){super(...arguments),this.type="approve",this.size="lg",this.statusImageUrl="",this.images=[]}render(){return w`<wui-flex>${this.templateVisual()} ${this.templateIcon()}</wui-flex>`}templateVisual(){switch(this.dataset.size=this.size,this.type){case"trade":return this.swapTemplate();case"fiat":return this.fiatTemplate();case"unknown":return this.unknownTemplate();default:return this.tokenTemplate()}}swapTemplate(){const[t,i]=this.images;return this.images.length===2&&(t||i)?w`
        <wui-image class="swap-crop-left-image" src=${t} alt="Swap image"></wui-image>
        <wui-image class="swap-crop-right-image" src=${i} alt="Swap image"></wui-image>
      `:t?w`<wui-image src=${t} alt="Swap image"></wui-image>`:null}fiatTemplate(){return w`<wui-icon
      class="fallback-icon"
      size=${ve[this.size]}
      name="dollar"
    ></wui-icon>`}unknownTemplate(){return w`<wui-icon
      class="fallback-icon"
      size=${ve[this.size]}
      name="questionMark"
    ></wui-icon>`}tokenTemplate(){const[t]=this.images;return t?w`<wui-image src=${t} alt="Token image"></wui-image> `:w`<wui-icon
      class="fallback-icon"
      name=${this.type==="nft"?"image":"coinPlaceholder"}
    ></wui-icon>`}templateIcon(){return this.statusImageUrl?w`<wui-image
        class="status-image"
        src=${this.statusImageUrl}
        alt="Status image"
      ></wui-image>`:w`<wui-icon
      class="direction-icon"
      size=${ve[this.size]}
      name=${this.getTemplateIcon()}
    ></wui-icon>`}getTemplateIcon(){return this.type==="trade"?"arrowClockWise":"arrowBottom"}};H.styles=[at];ue([D()],H.prototype,"type",void 0);ue([D()],H.prototype,"size",void 0);ue([D()],H.prototype,"statusImageUrl",void 0);ue([D({type:Array})],H.prototype,"images",void 0);H=ue([oe("wui-transaction-thumbnail")],H);const ot=se`
  :host > wui-flex:first-child {
    gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
  }

  wui-flex {
    display: flex;
    flex: 1;
  }
`;var ut=function(e,t,i,r){var s=arguments.length,n=s<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var c=e.length-1;c>=0;c--)(o=e[c])&&(n=(s<3?o(n):s>3?o(t,i,n):o(t,i))||n);return s>3&&n&&Object.defineProperty(t,i,n),n};let Ie=class extends ae{render(){return w`
      <wui-flex alignItems="center" .padding=${["1","2","1","2"]}>
        <wui-shimmer width="40px" height="40px" rounded></wui-shimmer>
        <wui-flex flexDirection="column" gap="1">
          <wui-shimmer width="124px" height="16px" rounded></wui-shimmer>
          <wui-shimmer width="60px" height="14px" rounded></wui-shimmer>
        </wui-flex>
        <wui-shimmer width="24px" height="12px" rounded></wui-shimmer>
      </wui-flex>
    `}};Ie.styles=[ke,ot];Ie=ut([oe("wui-transaction-list-item-loader")],Ie);const ct=se`
  :host {
    min-height: 100%;
  }

  .group-container[last-group='true'] {
    padding-bottom: ${({spacing:e})=>e[3]};
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:e})=>e[3]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }

  .emptyContainer {
    height: 100%;
  }
`;var G=function(e,t,i,r){var s=arguments.length,n=s<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var c=e.length-1;c>=0;c--)(o=e[c])&&(n=(s<3?o(n):s>3?o(t,i,n):o(t,i))||n);return s>3&&n&&Object.defineProperty(t,i,n),n};const Ae="last-transaction",lt=7;let j=class extends ae{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.page="activity",this.caipAddress=fe.state.activeCaipAddress,this.transactionsByYear=F.state.transactionsByYear,this.loading=F.state.loading,this.empty=F.state.empty,this.next=F.state.next,F.clearCursor(),this.unsubscribe.push(fe.subscribeKey("activeCaipAddress",t=>{t&&this.caipAddress!==t&&(F.resetTransactions(),F.fetchTransactions(t)),this.caipAddress=t}),fe.subscribeKey("activeCaipNetwork",()=>{this.updateTransactionView()}),F.subscribe(t=>{this.transactionsByYear=t.transactionsByYear,this.loading=t.loading,this.empty=t.empty,this.next=t.next}))}firstUpdated(){this.updateTransactionView(),this.createPaginationObserver()}updated(){this.setPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return w` ${this.empty?null:this.templateTransactionsByYear()}
    ${this.loading?this.templateLoading():null}
    ${!this.loading&&this.empty?this.templateEmpty():null}`}updateTransactionView(){F.resetTransactions(),this.caipAddress&&F.fetchTransactions(xe.getPlainAddress(this.caipAddress))}templateTransactionsByYear(){return Object.keys(this.transactionsByYear).sort().reverse().map(i=>{const r=parseInt(i,10),s=new Array(12).fill(null).map((n,o)=>{const c=Z.getTransactionGroupTitle(r,o),g=this.transactionsByYear[r]?.[o];return{groupTitle:c,transactions:g}}).filter(({transactions:n})=>n).reverse();return s.map(({groupTitle:n,transactions:o},c)=>{const g=c===s.length-1;return o?w`
          <wui-flex
            flexDirection="column"
            class="group-container"
            last-group="${g?"true":"false"}"
            data-testid="month-indexes"
          >
            <wui-flex
              alignItems="center"
              flexDirection="row"
              .padding=${["2","3","3","3"]}
            >
              <wui-text variant="md-medium" color="secondary" data-testid="group-title">
                ${n}
              </wui-text>
            </wui-flex>
            <wui-flex flexDirection="column" gap="2">
              ${this.templateTransactions(o,g)}
            </wui-flex>
          </wui-flex>
        `:null})})}templateRenderTransaction(t,i){const{date:r,descriptions:s,direction:n,images:o,status:c,type:g,transfers:m,isAllNFT:v}=this.getTransactionListItemProps(t);return w`
      <wui-transaction-list-item
        date=${r}
        .direction=${n}
        id=${i&&this.next?Ae:""}
        status=${c}
        type=${g}
        .images=${o}
        .onlyDirectionIcon=${v||m.length===1}
        .descriptions=${s}
      ></wui-transaction-list-item>
    `}templateTransactions(t,i){return t.map((r,s)=>{const n=i&&s===t.length-1;return w`${this.templateRenderTransaction(r,n)}`})}emptyStateActivity(){return w`<wui-flex
      class="emptyContainer"
      flexGrow="1"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      .padding=${["10","5","10","5"]}
      gap="5"
      data-testid="empty-activity-state"
    >
      <wui-icon-box color="default" icon="wallet" size="xl"></wui-icon-box>
      <wui-flex flexDirection="column" alignItems="center" gap="2">
        <wui-text align="center" variant="lg-medium" color="primary">No Transactions yet</wui-text>
        <wui-text align="center" variant="lg-regular" color="secondary"
          >Start trading on dApps <br />
          to grow your wallet!</wui-text
        >
      </wui-flex>
    </wui-flex>`}emptyStateAccount(){return w`<wui-flex
      class="contentContainer"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap="4"
      data-testid="empty-account-state"
    >
      <wui-icon-box icon="swapHorizontal" size="lg" color="default"></wui-icon-box>
      <wui-flex
        class="textContent"
        gap="2"
        flexDirection="column"
        justifyContent="center"
        flexDirection="column"
      >
        <wui-text variant="md-regular" align="center" color="primary">No activity yet</wui-text>
        <wui-text variant="sm-regular" align="center" color="secondary"
          >Your next transactions will appear here</wui-text
        >
      </wui-flex>
      <wui-link @click=${this.onReceiveClick.bind(this)}>Trade</wui-link>
    </wui-flex>`}templateEmpty(){return this.page==="account"?w`${this.emptyStateAccount()}`:w`${this.emptyStateActivity()}`}templateLoading(){return this.page==="activity"?w` <wui-flex flexDirection="column" width="100%">
        <wui-flex .padding=${["2","3","3","3"]}>
          <wui-shimmer width="70px" height="16px" rounded></wui-shimmer>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2" width="100%">
          ${Array(lt).fill(w` <wui-transaction-list-item-loader></wui-transaction-list-item-loader> `).map(t=>t)}
        </wui-flex>
      </wui-flex>`:null}onReceiveClick(){Ce.push("WalletReceive")}createPaginationObserver(){const{projectId:t}=Fe.state;this.paginationObserver=new IntersectionObserver(([i])=>{i?.isIntersecting&&!this.loading&&(F.fetchTransactions(xe.getPlainAddress(this.caipAddress)),Re.sendEvent({type:"track",event:"LOAD_MORE_TRANSACTIONS",properties:{address:xe.getPlainAddress(this.caipAddress),projectId:t,cursor:this.next,isSmartAccount:Ne(fe.state.activeChain)===Le.ACCOUNT_TYPES.SMART_ACCOUNT}}))},{}),this.setPaginationObserver()}setPaginationObserver(){this.paginationObserver?.disconnect();const t=this.shadowRoot?.querySelector(`#${Ae}`);t&&this.paginationObserver?.observe(t)}getTransactionListItemProps(t){const i=$e.formatDate(t?.metadata?.minedAt),r=Z.mergeTransfers(t?.transfers||[]),s=Z.getTransactionDescriptions(t,r),n=r?.[0],o=!!n&&r?.every(g=>!!g.nft_info),c=Z.getTransactionImages(r);return{date:i,direction:n?.direction,descriptions:s,isAllNFT:o,images:c,status:t.metadata?.status,transfers:r,type:t.metadata?.operationType}}};j.styles=ct;G([D()],j.prototype,"page",void 0);G([Q()],j.prototype,"caipAddress",void 0);G([Q()],j.prototype,"transactionsByYear",void 0);G([Q()],j.prototype,"loading",void 0);G([Q()],j.prototype,"empty",void 0);G([Q()],j.prototype,"next",void 0);j=G([oe("w3m-activity-list")],j);
