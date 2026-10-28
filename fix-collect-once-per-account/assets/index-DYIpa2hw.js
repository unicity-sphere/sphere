const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/PhArrowCircleDown-BtlNV0TZ.js","assets/property-CnFDNXw5.js","assets/PhArrowClockwise-mOiWYLMV.js","assets/PhArrowDown-CkoOD89h.js","assets/PhArrowLeft-C0jlxVhM.js","assets/PhArrowRight-BI-V03Xf.js","assets/PhArrowSquareOut-DnQ7n_B4.js","assets/PhArrowsDownUp-PZosTqZG.js","assets/PhArrowsLeftRight-CYsRQ2qh.js","assets/PhArrowUp-izKvURUW.js","assets/PhArrowUpRight-Bn-JhHsY.js","assets/PhArrowsClockwise-Brtx2Re-.js","assets/PhBank-hhPAIPVb.js","assets/PhBrowser-BjzAmrHO.js","assets/PhCaretDown-ddSjwcwm.js","assets/PhCaretLeft-B7YLoNEF.js","assets/PhCaretRight-BY8D5MIg.js","assets/PhCaretUp-BG10nSut.js","assets/PhCheck-DrKd7pBC.js","assets/PhCircleHalf-Bk9C4DvT.js","assets/PhClock-Sj17weCB.js","assets/PhCompass-Df1ugFO-.js","assets/PhCopy-rgttky8E.js","assets/PhCreditCard-CZpdid2n.js","assets/PhCurrencyDollar-B6IKKjue.js","assets/PhDesktop-BuCDXYJj.js","assets/PhDeviceMobile-CnybhXY-.js","assets/PhDotsThree-CSAEcba1.js","assets/PhVault-B8m1usHw.js","assets/PhEnvelope-SmaNeXoQ.js","assets/PhFunnelSimple-DKx35ITq.js","assets/PhGlobe-q1mqj65V.js","assets/PhIdentificationCard-BeLXJpfZ.js","assets/PhImage-BYrKfN9k.js","assets/PhInfo-X33f06Ej.js","assets/PhLightbulb-DMZJsowR.js","assets/PhMagnifyingGlass-B6D0sWFL.js","assets/PhPaperPlaneRight-Dvo-nXr9.js","assets/PhPlus-CBvZvLax.js","assets/PhPower-D8-AcNM6.js","assets/PhPuzzlePiece-C-7mYqGO.js","assets/PhQrCode-uIXlI5ER.js","assets/PhQuestion-rUoqC2sC.js","assets/PhQuestionMark-W55Txvvb.js","assets/PhSealCheck-BeVLq9PH.js","assets/PhSignOut-Cq2PivQ6.js","assets/PhSpinner-CZMtAFdX.js","assets/PhTrash-BamrmMsN.js","assets/PhUser-A2fxqIV0.js","assets/PhWallet-WVAuHGpA.js","assets/PhWarning-CpkID9oi.js","assets/PhWarningCircle-Cm58gXb9.js","assets/PhX-C3b4cCEy.js"])))=>i.map(i=>d[i]);
import{$ as ae,a0 as le,u as J,r as b,i as v,d as h,t as se,w as d,Y as u,a1 as ce,e as L,k as B}from"./core-kVX_dzo0.js";import{aQ as c}from"./index-z78fTwNj.js";const G=".",I={getSpacingStyles(e,t){if(Array.isArray(e))return e[t]?`var(--apkt-spacing-${e[t]})`:void 0;if(typeof e=="string")return`var(--apkt-spacing-${e})`},getFormattedDate(e){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(e)},formatCurrency(e=0,t={}){const o=Number(e);return isNaN(o)?"$0.00":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2,...t}).format(o)},getHostName(e){try{return new URL(e).hostname}catch{return""}},getTruncateString({string:e,charsStart:t,charsEnd:o,truncate:r}){return e.length<=t+o?e:r==="end"?`${e.substring(0,t)}...`:r==="start"?`...${e.substring(e.length-o)}`:`${e.substring(0,Math.floor(t))}...${e.substring(e.length-Math.floor(o))}`},generateAvatarColors(e){const o=e.toLowerCase().replace(/^0x/iu,"").replace(/[^a-f0-9]/gu,"").substring(0,6).padEnd(6,"0"),r=this.hexToRgb(o),n=getComputedStyle(document.documentElement).getPropertyValue("--w3m-border-radius-master"),a=100-3*Number(n?.replace("px","")),s=`${a}% ${a}% at 65% 40%`,p=[];for(let _=0;_<5;_+=1){const E=this.tintColor(r,.15*_);p.push(`rgb(${E[0]}, ${E[1]}, ${E[2]})`)}return`
    --local-color-1: ${p[0]};
    --local-color-2: ${p[1]};
    --local-color-3: ${p[2]};
    --local-color-4: ${p[3]};
    --local-color-5: ${p[4]};
    --local-radial-circle: ${s}
   `},hexToRgb(e){const t=parseInt(e,16),o=t>>16&255,r=t>>8&255,n=t&255;return[o,r,n]},tintColor(e,t){const[o,r,n]=e,i=Math.round(o+(255-o)*t),a=Math.round(r+(255-r)*t),s=Math.round(n+(255-n)*t);return[i,a,s]},isNumber(e){return{number:/^[0-9]+$/u}.number.test(e)},getColorTheme(e){return e||(typeof window<"u"&&window.matchMedia&&typeof window.matchMedia=="function"?window.matchMedia("(prefers-color-scheme: dark)")?.matches?"dark":"light":"dark")},splitBalance(e){const t=e.split(".");return t.length===2?[t[0],t[1]]:["0","00"]},roundNumber(e,t,o){return e.toString().length>=t?Number(e).toFixed(o):e},cssDurationToNumber(e){return e.endsWith("s")?Number(e.replace("s",""))*1e3:e.endsWith("ms")?Number(e.replace("ms","")):0},maskInput({value:e,decimals:t,integers:o}){if(e=e.replace(",","."),e===G)return`0${G}`;const[r="",n]=e.split(G).map(E=>E.replace(/[^0-9]/gu,"")),i=o?r.substring(0,o):r,a=i.length===2?String(Number(i)):i,s=typeof t=="number"?n?.substring(0,t):n,p=typeof t!="number"||t>0;return(typeof s=="string"&&p?[a,s].join(G):a)??""},capitalize(e){return e?e.charAt(0).toUpperCase()+e.slice(1):""}};function he(e,t){const{kind:o,elements:r}=t;return{kind:o,elements:r,finisher(n){customElements.get(e)||customElements.define(e,n)}}}function de(e,t){return customElements.get(e)||customElements.define(e,t),t}function w(e){return function(o){return typeof o=="function"?de(e,o):he(e,o)}}const ue={attribute:!0,type:String,converter:le,reflect:!1,hasChanged:ae},pe=(e=ue,t,o)=>{const{kind:r,metadata:n}=o;let i=globalThis.litPropertyMetadata.get(n);if(i===void 0&&globalThis.litPropertyMetadata.set(n,i=new Map),r==="setter"&&((e=Object.create(e)).wrapped=!0),i.set(o.name,e),r==="accessor"){const{name:a}=o;return{set(s){const p=t.get.call(this);t.set.call(this,s),this.requestUpdate(a,p,e,!0,s)},init(s){return s!==void 0&&this.C(a,void 0,e,s),s}}}if(r==="setter"){const{name:a}=o;return function(s){const p=this[a];t.call(this,s),this.requestUpdate(a,p,e,!0,s)}}throw Error("Unsupported decorator location: "+r)};function l(e){return(t,o)=>typeof o=="object"?pe(e,t,o):((r,n,i)=>{const a=n.hasOwnProperty(i);return n.constructor.createProperty(i,r),a?Object.getOwnPropertyDescriptor(n,i):void 0})(e,t,o)}function xt(e){return l({...e,state:!0,attribute:!1})}const ge=J`
  :host {
    display: flex;
    width: inherit;
    height: inherit;
    box-sizing: border-box;
  }
`;var $=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let g=class extends v{render(){return this.style.cssText=`
      flex-direction: ${this.flexDirection};
      flex-wrap: ${this.flexWrap};
      flex-basis: ${this.flexBasis};
      flex-grow: ${this.flexGrow};
      flex-shrink: ${this.flexShrink};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&I.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&I.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&I.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&I.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&I.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&I.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&I.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&I.getSpacingStyles(this.margin,3)};
      width: ${this.width};
    `,h`<slot></slot>`}};g.styles=[b,ge];$([l()],g.prototype,"flexDirection",void 0);$([l()],g.prototype,"flexWrap",void 0);$([l()],g.prototype,"flexBasis",void 0);$([l()],g.prototype,"flexGrow",void 0);$([l()],g.prototype,"flexShrink",void 0);$([l()],g.prototype,"alignItems",void 0);$([l()],g.prototype,"justifyContent",void 0);$([l()],g.prototype,"columnGap",void 0);$([l()],g.prototype,"rowGap",void 0);$([l()],g.prototype,"gap",void 0);$([l()],g.prototype,"padding",void 0);$([l()],g.prototype,"margin",void 0);$([l()],g.prototype,"width",void 0);g=$([w("wui-flex")],g);const P=e=>e??se;const re=Symbol.for(""),fe=e=>{if(e?.r===re)return e?._$litStatic$},me=e=>({_$litStatic$:e,r:re}),te=new Map,ve=e=>(t,...o)=>{const r=o.length;let n,i;const a=[],s=[];let p,_=0,E=!1;for(;_<r;){for(p=t[_];_<r&&(i=o[_],(n=fe(i))!==void 0);)p+=n+t[++_],E=!0;_!==r&&s.push(i),a.push(p),_++}if(_===r&&a.push(t[r]),E){const ee=a.join("$$lit$$");(t=te.get(ee))===void 0&&(a.raw=a,te.set(ee,t=a)),o=s}return e(t,...o)},ie=ve(h),we=d`<svg width="30" height="30" viewBox="0 0 30 30" fill="none">
  <g clip-path="url(#clip0_87_33)">
    <path d="M23.9367 2.29447e-07H6.05917C5.26333 -0.000218805 4.47526 0.156384 3.73997 0.46086C3.00469 0.765337 2.33661 1.21172 1.77391 1.7745C1.21121 2.33727 0.764917 3.00542 0.460542 3.74074C0.156167 4.47607 -0.000327963 5.26417 5.16031e-07 6.06V23.9433C4.48257e-07 24.7389 0.156744 25.5267 0.461276 26.2617C0.765808 26.9967 1.21216 27.6645 1.77484 28.2269C2.33752 28.7894 3.0055 29.2355 3.74061 29.5397C4.47573 29.8439 5.26358 30.0003 6.05917 30H23.9417C25.5486 29.9996 27.0895 29.3609 28.2257 28.2245C29.3618 27.0881 30 25.5469 30 23.94V6.06C29.9993 4.45241 29.3602 2.91091 28.2232 1.77449C27.0861 0.638064 25.5443 -0.000220881 23.9367 2.29447e-07Z" fill="url(#paint0_linear_87_33)"/>
    <path d="M14.8708 6.89259L15.4783 5.84259C15.5679 5.68703 15.6873 5.55064 15.8296 5.44122C15.9719 5.3318 16.1344 5.25148 16.3078 5.20486C16.4812 5.15824 16.662 5.14622 16.8401 5.1695C17.0181 5.19277 17.1898 5.25088 17.3453 5.34051C17.5009 5.43013 17.6373 5.54952 17.7467 5.69186C17.8561 5.83419 17.9364 5.99669 17.9831 6.17006C18.0297 6.34344 18.0417 6.5243 18.0184 6.70232C17.9952 6.88034 17.9371 7.05203 17.8474 7.20759L11.9949 17.3401H16.2283C17.5999 17.3401 18.3691 18.9526 17.7724 20.0701H5.36159C5.18215 20.0707 5.00436 20.0359 4.83845 19.9675C4.67254 19.8992 4.5218 19.7986 4.39492 19.6718C4.26803 19.5449 4.16751 19.3941 4.09915 19.2282C4.03079 19.0623 3.99593 18.8845 3.99659 18.7051C3.99659 17.9476 4.60492 17.3401 5.36159 17.3401H8.84159L13.2958 9.61926L11.9041 7.20426C11.738 6.89096 11.7 6.52543 11.7982 6.18469C11.8963 5.84395 12.1229 5.5546 12.4301 5.37763C12.7374 5.20065 13.1014 5.14987 13.4454 5.23599C13.7893 5.3221 14.0864 5.53838 14.2741 5.83926L14.8708 6.89259ZM9.60659 21.4759L8.29409 23.7526C8.20446 23.9082 8.08506 24.0446 7.94271 24.1541C7.80035 24.2636 7.63783 24.344 7.46441 24.3906C7.291 24.4373 7.11009 24.4493 6.93202 24.4261C6.75395 24.4028 6.58221 24.3447 6.42659 24.2551C6.27097 24.1655 6.13454 24.0461 6.02506 23.9037C5.91559 23.7613 5.83523 23.5988 5.78857 23.4254C5.74191 23.252 5.72986 23.0711 5.75311 22.893C5.77637 22.715 5.83446 22.5432 5.92409 22.3876L6.89909 20.7001C8.00159 20.3584 8.89742 20.6209 9.60659 21.4759ZM20.9066 17.3476H24.4583C25.2158 17.3476 25.8233 17.9551 25.8233 18.7126C25.8233 19.4701 25.2149 20.0776 24.4583 20.0776H22.4858L23.8166 22.3876C24.1916 23.0443 23.9708 23.8726 23.3149 24.2551C23.0006 24.4359 22.6274 24.4845 22.2772 24.3903C21.927 24.2961 21.6286 24.0667 21.4474 23.7526C19.2058 19.8643 17.5216 16.9534 16.4041 15.0151C15.2608 13.0426 16.0783 11.0626 16.8841 10.3909C17.7799 11.9293 19.1191 14.2501 20.9074 17.3476H20.9066Z" fill="white"/>
  </g>
  <defs>
    <linearGradient id="paint0_linear_87_33" x1="15" y1="2.29447e-07" x2="15" y2="30" gradientUnits="userSpaceOnUse">
      <stop stop-color="#18BFFB"/>
      <stop offset="1" stop-color="#2072F3"/>
    </linearGradient>
    <clipPath id="clip0_87_33">
      <rect width="30" height="30" fill="white"/>
    </clipPath>
  </defs>
</svg>`,be=d`<svg fill="none" viewBox="0 0 40 40">
  <g clip-path="url(#a)">
    <g clip-path="url(#b)">
      <circle cx="20" cy="19.89" r="20" fill="#000" />
      <g clip-path="url(#c)">
        <path
          fill="#fff"
          d="M28.77 23.3c-.69 1.99-2.75 5.52-4.87 5.56-1.4.03-1.86-.84-3.46-.84-1.61 0-2.12.81-3.45.86-2.25.1-5.72-5.1-5.72-9.62 0-4.15 2.9-6.2 5.42-6.25 1.36-.02 2.64.92 3.47.92.83 0 2.38-1.13 4.02-.97.68.03 2.6.28 3.84 2.08-3.27 2.14-2.76 6.61.75 8.25ZM24.2 7.88c-2.47.1-4.49 2.69-4.2 4.84 2.28.17 4.47-2.39 4.2-4.84Z"
        />
      </g>
    </g>
  </g>
  <defs>
    <clipPath id="a"><rect width="40" height="40" fill="#fff" rx="20" /></clipPath>
    <clipPath id="b"><path fill="#fff" d="M0 0h40v40H0z" /></clipPath>
    <clipPath id="c"><path fill="#fff" d="M8 7.89h24v24H8z" /></clipPath>
  </defs>
</svg>`,$e=d`
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 8 11">
    <path
      fill="var(--apkt-tokens-theme-textPrimary)"
      d="M7.862 4.86c.159-1.064-.652-1.637-1.76-2.018l.36-1.443-.879-.218-.35 1.404c-.23-.058-.468-.112-.703-.166l.352-1.413-.877-.219-.36 1.442a29.02 29.02 0 0 1-.56-.132v-.005l-1.21-.302-.234.938s.652.15.638.158c.356.089.42.324.41.51l-.41 1.644a.715.715 0 0 1 .09.03l-.092-.024-.574 2.302c-.044.108-.154.27-.402.208.008.013-.639-.16-.639-.16L.227 8.403l1.142.285c.213.053.42.109.626.161l-.363 1.459.877.218.36-1.443c.239.065.472.125.7.182l-.36 1.436.879.219.363-1.456c1.497.283 2.623.17 3.097-1.185.381-1.09-.02-1.719-.807-2.129.574-.132 1.006-.51 1.12-1.289ZM5.856 7.673c-.272 1.09-2.107.5-2.702.353l.482-1.933c.595.149 2.503.443 2.22 1.58Zm.271-2.829c-.247.992-1.775.488-2.27.365l.436-1.753c.496.124 2.092.354 1.834 1.388Z"
    />
  </svg>
`,Ce=d`<svg viewBox="0 0 32 32" fill="none">
<path d="M29.0612 10.0613L13.0612 26.0613C12.9218 26.2011 12.7563 26.3121 12.5739 26.3878C12.3916 26.4635 12.1961 26.5024 11.9987 26.5024C11.8013 26.5024 11.6058 26.4635 11.4235 26.3878C11.2411 26.3121 11.0756 26.2011 10.9362 26.0613L3.9362 19.0613C3.79667 18.9217 3.68599 18.7561 3.61047 18.5738C3.53496 18.3915 3.49609 18.1961 3.49609 17.9988C3.49609 17.8014 3.53496 17.606 3.61047 17.4237C3.68599 17.2414 3.79667 17.0758 3.9362 16.9363C4.07573 16.7967 4.24137 16.686 4.42367 16.6105C4.60598 16.535 4.80137 16.4962 4.9987 16.4962C5.19602 16.4962 5.39141 16.535 5.57372 16.6105C5.75602 16.686 5.92167 16.7967 6.0612 16.9363L11.9999 22.875L26.9387 7.93876C27.2205 7.65697 27.6027 7.49866 28.0012 7.49866C28.3997 7.49866 28.7819 7.65697 29.0637 7.93876C29.3455 8.22055 29.5038 8.60274 29.5038 9.00126C29.5038 9.39977 29.3455 9.78197 29.0637 10.0638L29.0612 10.0613Z" fill="currentColor"/>
</svg>
`,ye=d`<svg width="30" height="30" viewBox="0 0 30 30" fill="none">
<path d="M14.9978 7.80003H27.4668C26.2032 5.61107 24.3857 3.79333 22.1968 2.52955C20.008 1.26577 17.525 0.600485 14.9975 0.600586C12.47 0.600687 9.98712 1.26617 7.79838 2.53012C5.60964 3.79408 3.79221 5.61197 2.52881 7.80103L8.76281 18.599L8.76881 18.598C8.13412 17.5044 7.79906 16.2628 7.79743 14.9983C7.79579 13.7339 8.12764 12.4914 8.7595 11.3961C9.39136 10.3008 10.3009 9.39159 11.3963 8.76005C12.4918 8.12851 13.7344 7.79702 14.9988 7.79903L14.9978 7.80003Z" fill="url(#paint0_linear_87_32)"/>
<path d="M21.237 18.5981L15.003 29.3961C17.5305 29.3961 20.0134 28.7308 22.2022 27.467C24.391 26.2032 26.2086 24.3854 27.4721 22.1965C28.7356 20.0075 29.4006 17.5245 29.4003 14.997C29.3999 12.4695 28.7342 9.9867 27.47 7.7981H15.002L15 7.8041C16.2642 7.80168 17.5067 8.13257 18.6022 8.76342C19.6977 9.39428 20.6076 10.3028 21.2401 11.3974C21.8726 12.492 22.2053 13.734 22.2048 14.9982C22.2042 16.2623 21.8704 17.504 21.237 18.5981Z" fill="url(#paint1_linear_87_32)"/>
<path d="M8.76502 18.601L2.53102 7.80298C1.26664 9.99172 0.600848 12.4748 0.600586 15.0025C0.600324 17.5302 1.2656 20.0134 2.52953 22.2024C3.79345 24.3914 5.61145 26.209 7.80071 27.4725C9.98998 28.736 12.4733 29.4008 15.001 29.4L21.236 18.602L21.232 18.598C20.6022 19.6941 19.6944 20.6049 18.6003 21.2383C17.5062 21.8717 16.2644 22.2055 15.0002 22.2059C13.7359 22.2063 12.4939 21.8733 11.3994 21.2406C10.3049 20.6079 9.39657 19.6977 8.76602 18.602L8.76502 18.601Z" fill="url(#paint2_linear_87_32)"/>
<path d="M14.9998 22.2C16.9094 22.2 18.7407 21.4415 20.091 20.0912C21.4412 18.741 22.1998 16.9096 22.1998 15C22.1998 13.0905 21.4412 11.2591 20.091 9.90888C18.7407 8.55862 16.9094 7.80005 14.9998 7.80005C13.0902 7.80005 11.2589 8.55862 9.90864 9.90888C8.55837 11.2591 7.7998 13.0905 7.7998 15C7.7998 16.9096 8.55837 18.741 9.90864 20.0912C11.2589 21.4415 13.0902 22.2 14.9998 22.2Z" fill="white"/>
<path d="M14.9998 20.7C16.5115 20.7 17.9614 20.0995 19.0303 19.0306C20.0993 17.9616 20.6998 16.5118 20.6998 15C20.6998 13.4883 20.0993 12.0385 19.0303 10.9695C17.9614 9.90058 16.5115 9.30005 14.9998 9.30005C13.4881 9.30005 12.0383 9.90058 10.9693 10.9695C9.90034 12.0385 9.2998 13.4883 9.2998 15C9.2998 16.5118 9.90034 17.9616 10.9693 19.0306C12.0383 20.0995 13.4881 20.7 14.9998 20.7Z" fill="#1A73E8"/>
<defs>
  <linearGradient id="paint0_linear_87_32" x1="3.29381" y1="2.99503" x2="38.0998" y2="2.99503" gradientUnits="userSpaceOnUse">
    <stop stop-color="#D93025"/>
    <stop offset="1" stop-color="#EA4335"/>
  </linearGradient>
  <linearGradient id="paint1_linear_87_32" x1="17.953" y1="29.1431" x2="34.194" y2="-0.298904" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FCC934"/>
    <stop offset="1" stop-color="#FBBC04"/>
  </linearGradient>
  <linearGradient id="paint2_linear_87_32" x1="22.873" y1="28.2" x2="6.63202" y2="-1.24102" gradientUnits="userSpaceOnUse">
    <stop stop-color="#1E8E3E"/>
    <stop offset="1" stop-color="#34A853"/>
  </linearGradient>
</defs>
</svg>`,_e=d`<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
<path d="M23 11.1962V10.5C23 7.365 18.2712 5 12 5C5.72875 5 1 7.365 1 10.5V15.5C1 18.1112 4.28125 20.1863 9 20.8075V21.5C9 24.635 13.7288 27 20 27C26.2712 27 31 24.635 31 21.5V16.5C31 13.9125 27.8225 11.835 23 11.1962ZM7 18.3587C4.55125 17.675 3 16.5487 3 15.5V13.7413C4.02 14.4637 5.38625 15.0463 7 15.4375V18.3587ZM17 15.4375C18.6138 15.0463 19.98 14.4637 21 13.7413V15.5C21 16.5487 19.4487 17.675 17 18.3587V15.4375ZM15 24.3587C12.5513 23.675 11 22.5487 11 21.5V20.9788C11.3287 20.9913 11.6613 21 12 21C12.485 21 12.9587 20.9837 13.4237 20.9562C13.9403 21.1412 14.4665 21.2981 15 21.4263V24.3587ZM15 18.7812C14.0068 18.928 13.004 19.0011 12 19C10.996 19.0011 9.99324 18.928 9 18.7812V15.8075C9.99472 15.9371 10.9969 16.0014 12 16C13.0031 16.0014 14.0053 15.9371 15 15.8075V18.7812ZM23 24.7812C21.0106 25.0729 18.9894 25.0729 17 24.7812V21.8C17.9944 21.9337 18.9967 22.0005 20 22C21.0031 22.0014 22.0053 21.9371 23 21.8075V24.7812ZM29 21.5C29 22.5487 27.4487 23.675 25 24.3587V21.4375C26.6138 21.0462 27.98 20.4637 29 19.7412V21.5Z" fill="currentColor"/>
</svg>
`,xe=d` <svg fill="none" viewBox="0 0 13 4">
  <path fill="currentColor" d="M.5 0h12L8.9 3.13a3.76 3.76 0 0 1-4.8 0L.5 0Z" />
</svg>`,Le=d`<svg fill="none" viewBox="0 0 40 40">
  <g clip-path="url(#a)">
    <g clip-path="url(#b)">
      <circle cx="20" cy="19.89" r="20" fill="#5865F2" />
      <path
        fill="#fff"
        fill-rule="evenodd"
        d="M25.71 28.15C30.25 28 32 25.02 32 25.02c0-6.61-2.96-11.98-2.96-11.98-2.96-2.22-5.77-2.15-5.77-2.15l-.29.32c3.5 1.07 5.12 2.61 5.12 2.61a16.75 16.75 0 0 0-10.34-1.93l-.35.04a15.43 15.43 0 0 0-5.88 1.9s1.71-1.63 5.4-2.7l-.2-.24s-2.81-.07-5.77 2.15c0 0-2.96 5.37-2.96 11.98 0 0 1.73 2.98 6.27 3.13l1.37-1.7c-2.6-.79-3.6-2.43-3.6-2.43l.58.35.09.06.08.04.02.01.08.05a17.25 17.25 0 0 0 4.52 1.58 14.4 14.4 0 0 0 8.3-.86c.72-.27 1.52-.66 2.37-1.21 0 0-1.03 1.68-3.72 2.44.61.78 1.35 1.67 1.35 1.67Zm-9.55-9.6c-1.17 0-2.1 1.03-2.1 2.28 0 1.25.95 2.28 2.1 2.28 1.17 0 2.1-1.03 2.1-2.28.01-1.25-.93-2.28-2.1-2.28Zm7.5 0c-1.17 0-2.1 1.03-2.1 2.28 0 1.25.95 2.28 2.1 2.28 1.17 0 2.1-1.03 2.1-2.28 0-1.25-.93-2.28-2.1-2.28Z"
        clip-rule="evenodd"
      />
    </g>
  </g>
  <defs>
    <clipPath id="a"><rect width="40" height="40" fill="#fff" rx="20" /></clipPath>
    <clipPath id="b"><path fill="#fff" d="M0 0h40v40H0z" /></clipPath>
  </defs>
</svg>`,Se=d`<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 9 12"
>
  <path
    fill="var(--apkt-tokens-theme-textPrimary)"
    d="M4.666.001v4.435l3.748 1.675L4.666.001Zm0 0L.917 6.111l3.749-1.675V.001Zm0 8.984V12l3.75-5.19-3.75 2.176Zm0 3.014V8.985L.917 6.81 4.666 12Zm0-3.712 3.748-2.176-3.748-1.675v3.851Z"
  />
  <path fill="var(--apkt-tokens-theme-textPrimary)" d="m.917 6.111 3.749 2.176v-3.85L.917 6.11Z" />
</svg>`,Pe=d`<svg fill="none" viewBox="0 0 16 16">
  <path
    fill="currentColor"
    d="M4.25 7a.63.63 0 0 0-.63.63v3.97c0 .28-.2.51-.47.54l-.75.07a.93.93 0 0 1-.9-.47A7.51 7.51 0 0 1 5.54.92a7.5 7.5 0 0 1 9.54 4.62c.12.35.06.72-.16 1-.74.97-1.68 1.78-2.6 2.44V4.44a.64.64 0 0 0-.63-.64h-1.06c-.35 0-.63.3-.63.64v5.5c0 .23-.12.42-.32.5l-.52.23V6.05c0-.36-.3-.64-.64-.64H7.45c-.35 0-.64.3-.64.64v4.97c0 .25-.17.46-.4.52a5.8 5.8 0 0 0-.45.11v-4c0-.36-.3-.65-.64-.65H4.25ZM14.07 12.4A7.49 7.49 0 0 1 3.6 14.08c4.09-.58 9.14-2.5 11.87-6.6v.03a7.56 7.56 0 0 1-1.41 4.91Z"
  />
</svg>`,ze=d`<svg fill="none" viewBox="0 0 40 40">
  <g clip-path="url(#a)">
    <g clip-path="url(#b)">
      <circle cx="20" cy="19.89" r="20" fill="#1877F2" />
      <g clip-path="url(#c)">
        <path
          fill="#fff"
          d="M26 12.38h-2.89c-.92 0-1.61.38-1.61 1.34v1.66H26l-.36 4.5H21.5v12H17v-12h-3v-4.5h3V12.5c0-3.03 1.6-4.62 5.2-4.62H26v4.5Z"
        />
      </g>
    </g>
    <path
      fill="#1877F2"
      d="M40 20a20 20 0 1 0-23.13 19.76V25.78H11.8V20h5.07v-4.4c0-5.02 3-7.79 7.56-7.79 2.19 0 4.48.4 4.48.4v4.91h-2.53c-2.48 0-3.25 1.55-3.25 3.13V20h5.54l-.88 5.78h-4.66v13.98A20 20 0 0 0 40 20Z"
    />
    <path
      fill="#fff"
      d="m27.79 25.78.88-5.78h-5.55v-3.75c0-1.58.78-3.13 3.26-3.13h2.53V8.2s-2.3-.39-4.48-.39c-4.57 0-7.55 2.77-7.55 7.78V20H11.8v5.78h5.07v13.98a20.15 20.15 0 0 0 6.25 0V25.78h4.67Z"
    />
  </g>
  <defs>
    <clipPath id="a"><rect width="40" height="40" fill="#fff" rx="20" /></clipPath>
    <clipPath id="b"><path fill="#fff" d="M0 0h40v40H0z" /></clipPath>
    <clipPath id="c"><path fill="#fff" d="M8 7.89h24v24H8z" /></clipPath>
  </defs>
</svg>`,ke=d`<svg style="border-radius: 9999px; overflow: hidden;"  fill="none" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" rx="9999" ry="9999" fill="#855DCD"/>
  <path fill="#855DCD" d="M0 0h1000v1000H0V0Z" />
  <path
    fill="#fff"
    d="M320 248h354v504h-51.96V521.13h-.5c-5.76-63.8-59.31-113.81-124.54-113.81s-118.78 50-124.53 113.81h-.5V752H320V248Z"
  />
  <path
    fill="#fff"
    d="m225 320 21.16 71.46h17.9v289.09a16.29 16.29 0 0 0-16.28 16.24v19.49h-3.25a16.3 16.3 0 0 0-16.28 16.24V752h182.26v-19.48a16.22 16.22 0 0 0-16.28-16.24h-3.25v-19.5a16.22 16.22 0 0 0-16.28-16.23h-19.52V320H225Zm400.3 360.55a16.3 16.3 0 0 0-15.04 10.02 16.2 16.2 0 0 0-1.24 6.22v19.49h-3.25a16.29 16.29 0 0 0-16.27 16.24V752h182.24v-19.48a16.23 16.23 0 0 0-16.27-16.24h-3.25v-19.5a16.2 16.2 0 0 0-10.04-15 16.3 16.3 0 0 0-6.23-1.23v-289.1h17.9L775 320H644.82v360.55H625.3Z"
  />
</svg>`,Ee=d`<svg fill="none" viewBox="0 0 40 40">
  <g clip-path="url(#a)">
    <g clip-path="url(#b)">
      <circle cx="20" cy="19.89" r="20" fill="#1B1F23" />
      <g clip-path="url(#c)">
        <path
          fill="#fff"
          d="M8 19.89a12 12 0 1 1 15.8 11.38c-.6.12-.8-.26-.8-.57v-3.3c0-1.12-.4-1.85-.82-2.22 2.67-.3 5.48-1.31 5.48-5.92 0-1.31-.47-2.38-1.24-3.22.13-.3.54-1.52-.12-3.18 0 0-1-.32-3.3 1.23a11.54 11.54 0 0 0-6 0c-2.3-1.55-3.3-1.23-3.3-1.23a4.32 4.32 0 0 0-.12 3.18 4.64 4.64 0 0 0-1.24 3.22c0 4.6 2.8 5.63 5.47 5.93-.34.3-.65.83-.76 1.6-.69.31-2.42.84-3.5-1 0 0-.63-1.15-1.83-1.23 0 0-1.18-.02-.09.73 0 0 .8.37 1.34 1.76 0 0 .7 2.14 4.03 1.41v2.24c0 .31-.2.68-.8.57A12 12 0 0 1 8 19.9Z"
        />
      </g>
    </g>
  </g>
  <defs>
    <clipPath id="a"><rect width="40" height="40" fill="#fff" rx="20" /></clipPath>
    <clipPath id="b"><path fill="#fff" d="M0 0h40v40H0z" /></clipPath>
    <clipPath id="c"><path fill="#fff" d="M8 7.89h24v24H8z" /></clipPath>
  </defs>
</svg>`,Ie=d`<svg fill="none" viewBox="0 0 40 40">
  <path
    fill="#4285F4"
    d="M32.74 20.3c0-.93-.08-1.81-.24-2.66H20.26v5.03h7a6 6 0 0 1-2.62 3.91v3.28h4.22c2.46-2.27 3.88-5.6 3.88-9.56Z"
  />
  <path
    fill="#34A853"
    d="M20.26 33a12.4 12.4 0 0 0 8.6-3.14l-4.22-3.28a7.74 7.74 0 0 1-4.38 1.26 7.76 7.76 0 0 1-7.28-5.36H8.65v3.36A12.99 12.99 0 0 0 20.26 33Z"
  />
  <path
    fill="#FBBC05"
    d="M12.98 22.47a7.79 7.79 0 0 1 0-4.94v-3.36H8.65a12.84 12.84 0 0 0 0 11.66l3.37-2.63.96-.73Z"
  />
  <path
    fill="#EA4335"
    d="M20.26 12.18a7.1 7.1 0 0 1 4.98 1.93l3.72-3.72A12.47 12.47 0 0 0 20.26 7c-5.08 0-9.47 2.92-11.6 7.17l4.32 3.36a7.76 7.76 0 0 1 7.28-5.35Z"
  />
</svg>`,Ve=d`<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path d="M4.875 0C3.91082 0 2.96829 0.285914 2.1666 0.821586C1.36491 1.35726 0.740067 2.11863 0.371089 3.00942C0.00211226 3.90021 -0.094429 4.88041 0.093674 5.82607C0.281777 6.77172 0.746076 7.64036 1.42786 8.32215C2.10964 9.00393 2.97828 9.46823 3.92394 9.65633C4.86959 9.84443 5.84979 9.74789 6.74058 9.37891C7.63137 9.00994 8.39274 8.38509 8.92842 7.5834C9.46409 6.78171 9.75 5.83918 9.75 4.875C9.74864 3.58249 9.23458 2.34331 8.32064 1.42936C7.4067 0.515418 6.16751 0.00136492 4.875 0ZM4.6875 2.25C4.79875 2.25 4.90751 2.28299 5.00001 2.3448C5.09251 2.40661 5.16461 2.49446 5.20718 2.59724C5.24976 2.70002 5.2609 2.81312 5.23919 2.92224C5.21749 3.03135 5.16392 3.13158 5.08525 3.21025C5.00658 3.28891 4.90635 3.34249 4.79724 3.36419C4.68813 3.3859 4.57503 3.37476 4.47224 3.33218C4.36946 3.28961 4.28161 3.21751 4.2198 3.12501C4.15799 3.03251 4.125 2.92375 4.125 2.8125C4.125 2.66332 4.18427 2.52024 4.28975 2.41475C4.39524 2.30926 4.53832 2.25 4.6875 2.25ZM5.25 7.5C5.05109 7.5 4.86032 7.42098 4.71967 7.28033C4.57902 7.13968 4.5 6.94891 4.5 6.75V4.875C4.40055 4.875 4.30516 4.83549 4.23484 4.76516C4.16451 4.69484 4.125 4.59946 4.125 4.5C4.125 4.40054 4.16451 4.30516 4.23484 4.23484C4.30516 4.16451 4.40055 4.125 4.5 4.125C4.69891 4.125 4.88968 4.20402 5.03033 4.34467C5.17098 4.48532 5.25 4.67609 5.25 4.875V6.75C5.34946 6.75 5.44484 6.78951 5.51517 6.85983C5.58549 6.93016 5.625 7.02554 5.625 7.125C5.625 7.22446 5.58549 7.31984 5.51517 7.39017C5.44484 7.46049 5.34946 7.5 5.25 7.5Z" fill="#9A9A9A"/>
</svg>
`,Ae=d`<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
<path d="M28.925 5.5425C28.925 5.5425 28.925 5.555 28.925 5.56125L21.65 29.5537C21.5399 29.9434 21.3132 30.2901 21.0004 30.5473C20.6876 30.8045 20.3036 30.9598 19.9 30.9925C19.8425 30.9975 19.785 31 19.7275 31C19.3493 31.0012 18.9786 30.8941 18.6592 30.6915C18.3398 30.4888 18.085 30.199 17.925 29.8563L13.375 20.5187C13.3295 20.4252 13.3143 20.3197 13.3315 20.2171C13.3488 20.1145 13.3976 20.0198 13.4713 19.9463L20.7113 12.7063C20.8909 12.5172 20.9895 12.2654 20.9862 12.0047C20.9829 11.7439 20.8778 11.4948 20.6934 11.3104C20.509 11.126 20.2599 11.0209 19.9991 11.0176C19.7383 11.0142 19.4866 11.1129 19.2975 11.2925L12.0538 18.5325C11.9802 18.6061 11.8855 18.655 11.7829 18.6722C11.6803 18.6895 11.5748 18.6743 11.4813 18.6287L2.13502 14.08C1.76954 13.9047 1.46598 13.6224 1.26454 13.2706C1.06311 12.9189 0.973316 12.5142 1.00707 12.1102C1.04082 11.7063 1.19652 11.3221 1.45354 11.0087C1.71056 10.6952 2.05676 10.4673 2.44627 10.355L26.4388 3.08H26.4575C26.7991 2.98403 27.1601 2.98066 27.5034 3.07025C27.8468 3.15984 28.1601 3.33916 28.4113 3.58981C28.6624 3.84045 28.8424 4.15341 28.9326 4.49656C29.0229 4.83971 29.0203 5.2007 28.925 5.5425Z" fill="currentColor"/>
</svg>
`,Re=d` <svg width="27" height="30" viewBox="0 0 27 30" fill="none">
  <path d="M12.5395 14.3237L0.116699 27.5049V27.5188C0.251527 28.0177 0.49972 28.4788 0.841941 28.866C1.18416 29.2533 1.61117 29.5563 2.0897 29.7515C2.56823 29.9467 3.08536 30.0287 3.60081 29.9913C4.11625 29.9538 4.61609 29.7979 5.06139 29.5356L5.0975 29.512L19.0718 21.4519L12.5395 14.3237Z" fill="#EA4335"/>
  <path d="M25.103 12.0833L25.0919 12.0722L19.0611 8.57202L12.2607 14.6279L19.0847 21.4504L25.0919 17.9864C25.6229 17.6983 26.0665 17.2725 26.376 16.7537C26.6854 16.2349 26.8493 15.6422 26.8505 15.0381C26.8516 14.434 26.6899 13.8408 26.3824 13.3208C26.0749 12.8008 25.633 12.3734 25.103 12.0833Z" fill="#FBBC04"/>
  <path d="M0.116672 2.49553C0.047224 2.7761 0 3.05528 0 3.35946V26.6537C0 26.9565 0.0347234 27.237 0.116672 27.5162L12.959 14.6725L0.116672 2.49553Z" fill="#4285F4"/>
  <path d="M12.634 15.0001L19.0607 8.57198L5.0975 0.477133C4.65115 0.210463 4.14916 0.0506574 3.63079 0.0102139C3.11242 -0.0302296 2.59172 0.0497852 2.10941 0.244001C1.6271 0.438216 1.19625 0.741368 0.850556 1.12975C0.504864 1.51813 0.253698 1.98121 0.116699 2.48279L12.634 15.0001Z" fill="#34A853"/>
</svg>`,Oe=d`<svg width="75" height="20" viewBox="0 0 75 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.6666 5.83334C11.6666 2.61168 14.2783 0 17.5 0H25.8334C29.055 0 31.6666 2.61168 31.6666 5.83334V14.1666C31.6666 17.3883 29.055 20 25.8334 20H17.5C14.2783 20 11.6666 17.3883 11.6666 14.1666V5.83334Z" fill="var(--apkt-tokens-theme-foregroundTertiary)"/>
<path d="M19.5068 13.7499L22.4309 5.83331H23.2895L20.3654 13.7499H19.5068Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M0 5.41666C0 2.42513 2.42513 0 5.41666 0C8.40821 0 10.8334 2.42513 10.8334 5.41666V14.5833C10.8334 17.5748 8.40821 20 5.41666 20C2.42513 20 0 17.5748 0 14.5833V5.41666Z" fill="var(--apkt-tokens-theme-foregroundTertiary)"/>
<path d="M4.89581 12.4997V11.458H5.93747V12.4997H4.89581Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M32.5 10C32.5 4.47715 36.6896 0 41.8578 0H65.6422C70.8104 0 75 4.47715 75 10C75 15.5229 70.8104 20 65.6422 20H41.8578C36.6896 20 32.5 15.5229 32.5 10Z" fill="var(--apkt-tokens-theme-foregroundTertiary)"/>
<path d="M61.7108 12.4475V7.82751H62.5266V8.52418C62.8199 8.01084 63.4157 7.70834 64.0757 7.70834C65.0749 7.70834 65.7715 8.34084 65.7715 9.56918V12.4475H64.9649V9.61503C64.9649 8.80831 64.5066 8.38668 63.8374 8.38668C63.1132 8.38668 62.5266 8.9642 62.5266 9.78001V12.4475H61.7108Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M56.5671 12.4475L55.7147 7.82748H56.4846L57.0896 11.6409L57.8871 9.12916H58.6479L59.4363 11.6134L60.0505 7.82748H60.8204L59.9679 12.4475H59.0513L58.2721 10.0458L57.4838 12.4475H56.5671Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M52.9636 12.5666C51.5611 12.5666 50.7361 11.5217 50.7361 10.1375C50.7361 8.76254 51.5611 7.70834 52.9636 7.70834C54.3661 7.70834 55.1911 8.76254 55.1911 10.1375C55.1911 11.5217 54.3661 12.5666 52.9636 12.5666ZM52.9636 11.8883C53.9719 11.8883 54.357 11.0266 54.357 10.1283C54.357 9.23914 53.9719 8.38668 52.9636 8.38668C51.9552 8.38668 51.5702 9.23914 51.5702 10.1283C51.5702 11.0266 51.9552 11.8883 52.9636 11.8883Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M47.8507 12.5666C46.494 12.5666 45.6415 11.5308 45.6415 10.1375C45.6415 8.75337 46.494 7.70834 47.8507 7.70834C48.9965 7.70834 50.0048 8.35917 49.8948 10.3483H46.4756C46.5398 11.2009 46.934 11.8975 47.8507 11.8975C48.4648 11.8975 48.8681 11.5217 49.0057 11.0908H49.8123C49.684 11.8609 48.9598 12.5666 47.8507 12.5666ZM46.494 9.73416H49.1065C49.0423 8.80831 48.6114 8.37751 47.8507 8.37751C47.0165 8.37751 46.604 8.98254 46.494 9.73416Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M41.7284 12.4475V7.82748H42.5625V8.60665C42.8559 8.09332 43.3601 7.82748 43.8825 7.82748H44.9917V8.60665H43.8184C43.0851 8.60665 42.5625 9.08331 42.5625 10.0092V12.4475H41.7284Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
</svg>

`,He=d`
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 8">
    <path
      fill="var(--apkt-tokens-theme-textPrimary)"
      d="m9.524 6.307-1.51 1.584A.35.35 0 0 1 7.76 8H.604a.178.178 0 0 1-.161-.103.168.168 0 0 1 .033-.186l1.51-1.583a.35.35 0 0 1 .256-.11h7.154c.034 0 .068.01.096.029a.168.168 0 0 1 .032.26Zm-1.51-3.189a.35.35 0 0 0-.255-.109H.604a.178.178 0 0 0-.161.103.168.168 0 0 0 .033.186l1.51 1.583a.35.35 0 0 0 .256.11h7.154a.178.178 0 0 0 .16-.104.168.168 0 0 0-.032-.185l-1.51-1.584ZM.605 1.981H7.76a.357.357 0 0 0 .256-.11L9.525.289a.17.17 0 0 0 .032-.185.173.173 0 0 0-.16-.103H2.241a.357.357 0 0 0-.256.109L.476 1.692a.17.17 0 0 0-.033.185.178.178 0 0 0 .16.103Z"
    />
  </svg>
`,Me=d`<svg width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g clip-path="url(#a)">
    <path fill="url(#b)" d="M0 0h32v32H0z"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M7.034 15.252c4.975-2.167 8.293-3.596 9.953-4.287 4.74-1.971 5.725-2.314 6.366-2.325.142-.002.457.033.662.198.172.14.22.33.243.463.022.132.05.435.028.671-.257 2.7-1.368 9.248-1.933 12.27-.24 1.28-.71 1.708-1.167 1.75-.99.091-1.743-.655-2.703-1.284-1.502-.985-2.351-1.598-3.81-2.558-1.684-1.11-.592-1.721.368-2.718.252-.261 4.619-4.233 4.703-4.594.01-.045.02-.213-.08-.301-.1-.09-.246-.059-.353-.035-.15.034-2.55 1.62-7.198 4.758-.682.468-1.298.696-1.851.684-.61-.013-1.782-.344-2.653-.628-1.069-.347-1.918-.53-1.845-1.12.039-.308.462-.623 1.27-.944Z" fill="#fff"/>
  </g>
  <path d="M.5 16C.5 7.44 7.44.5 16 .5 24.56.5 31.5 7.44 31.5 16c0 8.56-6.94 15.5-15.5 15.5C7.44 31.5.5 24.56.5 16Z" stroke="#141414" stroke-opacity=".05"/>
  <defs>
    <linearGradient id="b" x1="1600" y1="0" x2="1600" y2="3176.27" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2AABEE"/>
      <stop offset="1" stop-color="#229ED9"/>
    </linearGradient>
    <clipPath id="a">
      <path d="M0 16C0 7.163 7.163 0 16 0s16 7.163 16 16-7.163 16-16 16S0 24.837 0 16Z" fill="#fff"/>
    </clipPath>
  </defs>
</svg>`,Te=d`
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
  <path d="M8.37651 0H1.62309C0.381381 0 -0.405611 1.33944 0.219059 2.42225L4.38701 9.64649C4.659 10.1182 5.3406 10.1182 5.61259 9.64649L9.78139 2.42225C10.4052 1.34117 9.61822 0 8.37736 0H8.37651ZM4.38362 7.48005L3.47591 5.72329L1.2857 1.80606C1.14121 1.55534 1.31968 1.23405 1.62225 1.23405H4.38278V7.4809L4.38362 7.48005ZM8.71221 1.80521L6.52284 5.72414L5.61513 7.48005V1.2332H8.37566C8.67823 1.2332 8.85669 1.55449 8.71221 1.80521Z" fill="var(--apkt-tokens-theme-textPrimary)" />
</svg>
`,Ze=d`
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 64 64">
    <path fill="var(--apkt-tokens-theme-textPrimary)" d="M61.55 19.28c-3-2.77-7.15-7-10.53-10l-.2-.14a3.82 3.82 0 0 0-1.11-.62l0 0C41.56 7 3.63-.09 2.89 0a1.4 1.4 0 0 0-.58.22L2.12.37a2.23 2.23 0 0 0-.52.84l-.05.13v.71l0 .11C5.82 14.05 22.68 53 26 62.14c.2.62.58 1.8 1.29 1.86h.16c.38 0 2-2.14 2-2.14S58.41 26.74 61.34 23a9.46 9.46 0 0 0 1-1.48A2.41 2.41 0 0 0 61.55 19.28ZM36.88 23.37 49.24 13.12l7.25 6.68Zm-4.8-.67L10.8 5.26l34.43 6.35ZM34 27.27l21.78-3.51-24.9 30ZM7.91 7 30.3 26 27.06 53.78Z"/>
  </svg>
`,Be=d`<svg fill="none" viewBox="0 0 40 40">
  <g clip-path="url(#a)">
    <g clip-path="url(#b)">
      <circle cx="20" cy="19.89" r="20" fill="#5A3E85" />
      <g clip-path="url(#c)">
        <path
          fill="#fff"
          d="M18.22 25.7 20 23.91h3.34l2.1-2.1v-6.68H15.4v8.78h2.82v1.77Zm3.87-8.16h1.25v3.66H22.1v-3.66Zm-3.34 0H20v3.66h-1.25v-3.66ZM20 7.9a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm6.69 14.56-3.66 3.66h-2.72l-1.77 1.78h-1.88V26.1H13.3v-9.82l.94-2.4H26.7v8.56Z"
        />
      </g>
    </g>
  </g>
  <defs>
    <clipPath id="a"><rect width="40" height="40" fill="#fff" rx="20" /></clipPath>
    <clipPath id="b"><path fill="#fff" d="M0 0h40v40H0z" /></clipPath>
    <clipPath id="c"><path fill="#fff" d="M8 7.89h24v24H8z" /></clipPath>
  </defs>
</svg>`,De=d`<svg fill="none" viewBox="0 0 16 16">
  <path
    fill="currentColor"
    d="m14.36 4.74.01.42c0 4.34-3.3 9.34-9.34 9.34A9.3 9.3 0 0 1 0 13.03a6.6 6.6 0 0 0 4.86-1.36 3.29 3.29 0 0 1-3.07-2.28c.5.1 1 .07 1.48-.06A3.28 3.28 0 0 1 .64 6.11v-.04c.46.26.97.4 1.49.41A3.29 3.29 0 0 1 1.11 2.1a9.32 9.32 0 0 0 6.77 3.43 3.28 3.28 0 0 1 5.6-3 6.59 6.59 0 0 0 2.08-.8 3.3 3.3 0 0 1-1.45 1.82A6.53 6.53 0 0 0 16 3.04c-.44.66-1 1.23-1.64 1.7Z"
  />
</svg>`,je=d`
<svg xmlns="http://www.w3.org/2000/svg" width="89" height="89" viewBox="0 0 89 89" fill="none">
<path d="M60.0468 39.2502L65.9116 33.3854C52.6562 20.13 36.1858 20.13 22.9304 33.3854L28.7952 39.2502C38.8764 29.169 49.9725 29.169 60.0536 39.2502H60.0468Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
<path d="M58.0927 52.9146L44.415 39.2369L30.7373 52.9146L17.0596 39.2369L11.2017 45.0949L30.7373 64.6374L44.415 50.9597L58.0927 64.6374L77.6284 45.0949L71.7704 39.2369L58.0927 52.9146Z" fill="var(--apkt-tokens-theme-textPrimary)"/>
</svg>`,We=d`
<svg xmlns="http://www.w3.org/2000/svg" width="89" height="89" viewBox="0 0 89 89" fill="none">
<path d="M60.0468 39.2502L65.9116 33.3854C52.6562 20.13 36.1858 20.13 22.9304 33.3854L28.7952 39.2502C38.8764 29.169 49.9725 29.169 60.0536 39.2502H60.0468Z" fill="var(--apkt-tokens-theme-textInvert)"/>
<path d="M58.0927 52.9146L44.415 39.2369L30.7373 52.9146L17.0596 39.2369L11.2017 45.0949L30.7373 64.6374L44.415 50.9597L58.0927 64.6374L77.6284 45.0949L71.7704 39.2369L58.0927 52.9146Z" fill="var(--apkt-tokens-theme-textInvert)"/>
</svg>`,Ue=d`
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_22274_4692)">
<path d="M0 6.64C0 4.17295 0 2.93942 0.525474 2.01817C0.880399 1.39592 1.39592 0.880399 2.01817 0.525474C2.93942 0 4.17295 0 6.64 0H9.36C11.8271 0 13.0606 0 13.9818 0.525474C14.6041 0.880399 15.1196 1.39592 15.4745 2.01817C16 2.93942 16 4.17295 16 6.64V9.36C16 11.8271 16 13.0606 15.4745 13.9818C15.1196 14.6041 14.6041 15.1196 13.9818 15.4745C13.0606 16 11.8271 16 9.36 16H6.64C4.17295 16 2.93942 16 2.01817 15.4745C1.39592 15.1196 0.880399 14.6041 0.525474 13.9818C0 13.0606 0 11.8271 0 9.36V6.64Z" fill="#C7B994"/>
<path d="M4.49038 5.76609C6.42869 3.86833 9.5713 3.86833 11.5096 5.76609L11.7429 5.99449C11.8398 6.08938 11.8398 6.24323 11.7429 6.33811L10.9449 7.11942C10.8964 7.16686 10.8179 7.16686 10.7694 7.11942L10.4484 6.80512C9.09617 5.48119 6.90381 5.48119 5.5516 6.80512L5.20782 7.14171C5.15936 7.18915 5.08079 7.18915 5.03234 7.14171L4.23434 6.3604C4.13742 6.26552 4.13742 6.11167 4.23434 6.01678L4.49038 5.76609ZM13.1599 7.38192L13.8702 8.07729C13.9671 8.17217 13.9671 8.32602 13.8702 8.4209L10.6677 11.5564C10.5708 11.6513 10.4137 11.6513 10.3168 11.5564L8.04388 9.33105C8.01965 9.30733 7.98037 9.30733 7.95614 9.33105L5.6833 11.5564C5.58638 11.6513 5.42925 11.6513 5.33234 11.5564L2.12982 8.42087C2.0329 8.32598 2.0329 8.17213 2.12982 8.07724L2.84004 7.38188C2.93695 7.28699 3.09408 7.28699 3.191 7.38188L5.46392 9.60726C5.48815 9.63098 5.52743 9.63098 5.55166 9.60726L7.82447 7.38188C7.92138 7.28699 8.07851 7.28699 8.17543 7.38187L10.4484 9.60726C10.4726 9.63098 10.5119 9.63098 10.5361 9.60726L12.809 7.38192C12.9059 7.28703 13.063 7.28703 13.1599 7.38192Z" fill="currentColor"/>
</g>
<defs>
<clipPath id="clip0_22274_4692">
<path d="M0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8Z" fill="white"/>
</clipPath>
</defs>
</svg>
`,Fe=d`
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="11" cy="11" r="11" transform="matrix(-1 0 0 1 23 1)" fill="#202020"/>
<circle cx="11" cy="11" r="11.5" transform="matrix(-1 0 0 1 23 1)" stroke="#C7B994" stroke-opacity="0.7"/>
<path d="M15.4523 11.0686L16.7472 9.78167C13.8205 6.87297 10.1838 6.87297 7.25708 9.78167L8.55201 11.0686C10.7779 8.85645 13.2279 8.85645 15.4538 11.0686H15.4523Z" fill="#C7B994"/>
<path d="M15.0199 14.067L12 11.0656L8.98 14.067L5.96004 11.0656L4.66663 12.3511L8.98 16.6393L12 13.638L15.0199 16.6393L19.3333 12.3511L18.0399 11.0656L15.0199 14.067Z" fill="#C7B994"/>
</svg>
`,oe=d`<svg fill="none" viewBox="0 0 41 40">
  <g clip-path="url(#a)">
    <path fill="#000" d="M.8 0h40v40H.8z" />
    <path
      fill="#fff"
      d="m22.63 18.46 7.14-8.3h-1.69l-6.2 7.2-4.96-7.2H11.2l7.5 10.9-7.5 8.71h1.7l6.55-7.61 5.23 7.61h5.72l-7.77-11.31Zm-9.13-7.03h2.6l11.98 17.13h-2.6L13.5 11.43Z"
    />
  </g>
  <defs>
    <clipPath id="a"><path fill="#fff" d="M.8 20a20 20 0 1 1 40 0 20 20 0 0 1-40 0Z" /></clipPath>
  </defs>
</svg>`,Ne=J`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    aspect-ratio: 1 / 1;
    color: var(--local-color);
    width: var(--local-width);
  }

  svg {
    height: inherit;
    width: inherit;
    object-fit: contain;
    object-position: center;
  }
`;var W=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};const Ge={add:"ph-plus",allWallets:"ph-dots-three",arrowBottom:"ph-arrow-down",arrowBottomCircle:"ph-arrow-circle-down",arrowClockWise:"ph-arrow-clockwise",arrowLeft:"ph-arrow-left",arrowRight:"ph-arrow-right",arrowTop:"ph-arrow-up",arrowTopRight:"ph-arrow-up-right",bank:"ph-bank",bin:"ph-trash",browser:"ph-browser",card:"ph-credit-card",checkmarkBold:"ph-check",chevronBottom:"ph-caret-down",chevronLeft:"ph-caret-left",chevronRight:"ph-caret-right",chevronTop:"ph-caret-up",clock:"ph-clock",close:"ph-x",coinPlaceholder:"ph-circle-half",compass:"ph-compass",copy:"ph-copy",desktop:"ph-desktop",dollar:"ph-currency-dollar",download:"ph-vault",exclamationCircle:"ph-warning-circle",extension:"ph-puzzle-piece",externalLink:"ph-arrow-square-out",filters:"ph-funnel-simple",helpCircle:"ph-question",id:"ph-identification-card",image:"ph-image",info:"ph-info",lightbulb:"ph-lightbulb",mail:"ph-envelope",mobile:"ph-device-mobile",more:"ph-dots-three",networkPlaceholder:"ph-globe",nftPlaceholder:"ph-image",plus:"ph-plus",power:"ph-power",qrCode:"ph-qr-code",questionMark:"ph-question",refresh:"ph-arrow-clockwise",recycleHorizontal:"ph-arrows-clockwise",search:"ph-magnifying-glass",sealCheck:"ph-seal-check",send:"ph-paper-plane-right",signOut:"ph-sign-out",spinner:"ph-spinner",swapHorizontal:"ph-arrows-left-right",swapVertical:"ph-arrows-down-up",threeDots:"ph-dots-three",user:"ph-user",verify:"ph-seal-check",verifyFilled:"ph-seal-check",wallet:"ph-wallet",warning:"ph-warning",warningCircle:"ph-warning-circle",appStore:"",apple:"",bitcoin:"",coins:"",chromeStore:"",cursor:"",discord:"",ethereum:"",etherscan:"",facebook:"",farcaster:"",github:"",google:"",playStore:"",paperPlaneTitle:"",reown:"",solana:"",ton:"",tron:"",telegram:"",twitch:"",twitterIcon:"",twitter:"",walletConnect:"",walletConnectBrown:"",walletConnectLightBrown:"",x:"",infoSeal:"",checkmark:""},qe={"ph-arrow-circle-down":()=>c(()=>import("./PhArrowCircleDown-BtlNV0TZ.js"),__vite__mapDeps([0,1])),"ph-arrow-clockwise":()=>c(()=>import("./PhArrowClockwise-mOiWYLMV.js"),__vite__mapDeps([2,1])),"ph-arrow-down":()=>c(()=>import("./PhArrowDown-CkoOD89h.js"),__vite__mapDeps([3,1])),"ph-arrow-left":()=>c(()=>import("./PhArrowLeft-C0jlxVhM.js"),__vite__mapDeps([4,1])),"ph-arrow-right":()=>c(()=>import("./PhArrowRight-BI-V03Xf.js"),__vite__mapDeps([5,1])),"ph-arrow-square-out":()=>c(()=>import("./PhArrowSquareOut-DnQ7n_B4.js"),__vite__mapDeps([6,1])),"ph-arrows-down-up":()=>c(()=>import("./PhArrowsDownUp-PZosTqZG.js"),__vite__mapDeps([7,1])),"ph-arrows-left-right":()=>c(()=>import("./PhArrowsLeftRight-CYsRQ2qh.js"),__vite__mapDeps([8,1])),"ph-arrow-up":()=>c(()=>import("./PhArrowUp-izKvURUW.js"),__vite__mapDeps([9,1])),"ph-arrow-up-right":()=>c(()=>import("./PhArrowUpRight-Bn-JhHsY.js"),__vite__mapDeps([10,1])),"ph-arrows-clockwise":()=>c(()=>import("./PhArrowsClockwise-Brtx2Re-.js"),__vite__mapDeps([11,1])),"ph-bank":()=>c(()=>import("./PhBank-hhPAIPVb.js"),__vite__mapDeps([12,1])),"ph-browser":()=>c(()=>import("./PhBrowser-BjzAmrHO.js"),__vite__mapDeps([13,1])),"ph-caret-down":()=>c(()=>import("./PhCaretDown-ddSjwcwm.js"),__vite__mapDeps([14,1])),"ph-caret-left":()=>c(()=>import("./PhCaretLeft-B7YLoNEF.js"),__vite__mapDeps([15,1])),"ph-caret-right":()=>c(()=>import("./PhCaretRight-BY8D5MIg.js"),__vite__mapDeps([16,1])),"ph-caret-up":()=>c(()=>import("./PhCaretUp-BG10nSut.js"),__vite__mapDeps([17,1])),"ph-check":()=>c(()=>import("./PhCheck-DrKd7pBC.js"),__vite__mapDeps([18,1])),"ph-circle-half":()=>c(()=>import("./PhCircleHalf-Bk9C4DvT.js"),__vite__mapDeps([19,1])),"ph-clock":()=>c(()=>import("./PhClock-Sj17weCB.js"),__vite__mapDeps([20,1])),"ph-compass":()=>c(()=>import("./PhCompass-Df1ugFO-.js"),__vite__mapDeps([21,1])),"ph-copy":()=>c(()=>import("./PhCopy-rgttky8E.js"),__vite__mapDeps([22,1])),"ph-credit-card":()=>c(()=>import("./PhCreditCard-CZpdid2n.js"),__vite__mapDeps([23,1])),"ph-currency-dollar":()=>c(()=>import("./PhCurrencyDollar-B6IKKjue.js"),__vite__mapDeps([24,1])),"ph-desktop":()=>c(()=>import("./PhDesktop-BuCDXYJj.js"),__vite__mapDeps([25,1])),"ph-device-mobile":()=>c(()=>import("./PhDeviceMobile-CnybhXY-.js"),__vite__mapDeps([26,1])),"ph-dots-three":()=>c(()=>import("./PhDotsThree-CSAEcba1.js"),__vite__mapDeps([27,1])),"ph-vault":()=>c(()=>import("./PhVault-B8m1usHw.js"),__vite__mapDeps([28,1])),"ph-envelope":()=>c(()=>import("./PhEnvelope-SmaNeXoQ.js"),__vite__mapDeps([29,1])),"ph-funnel-simple":()=>c(()=>import("./PhFunnelSimple-DKx35ITq.js"),__vite__mapDeps([30,1])),"ph-globe":()=>c(()=>import("./PhGlobe-q1mqj65V.js"),__vite__mapDeps([31,1])),"ph-identification-card":()=>c(()=>import("./PhIdentificationCard-BeLXJpfZ.js"),__vite__mapDeps([32,1])),"ph-image":()=>c(()=>import("./PhImage-BYrKfN9k.js"),__vite__mapDeps([33,1])),"ph-info":()=>c(()=>import("./PhInfo-X33f06Ej.js"),__vite__mapDeps([34,1])),"ph-lightbulb":()=>c(()=>import("./PhLightbulb-DMZJsowR.js"),__vite__mapDeps([35,1])),"ph-magnifying-glass":()=>c(()=>import("./PhMagnifyingGlass-B6D0sWFL.js"),__vite__mapDeps([36,1])),"ph-paper-plane-right":()=>c(()=>import("./PhPaperPlaneRight-Dvo-nXr9.js"),__vite__mapDeps([37,1])),"ph-plus":()=>c(()=>import("./PhPlus-CBvZvLax.js"),__vite__mapDeps([38,1])),"ph-power":()=>c(()=>import("./PhPower-D8-AcNM6.js"),__vite__mapDeps([39,1])),"ph-puzzle-piece":()=>c(()=>import("./PhPuzzlePiece-C-7mYqGO.js"),__vite__mapDeps([40,1])),"ph-qr-code":()=>c(()=>import("./PhQrCode-uIXlI5ER.js"),__vite__mapDeps([41,1])),"ph-question":()=>c(()=>import("./PhQuestion-rUoqC2sC.js"),__vite__mapDeps([42,1])),"ph-question-circle":()=>c(()=>import("./PhQuestionMark-W55Txvvb.js"),__vite__mapDeps([43,1])),"ph-seal-check":()=>c(()=>import("./PhSealCheck-BeVLq9PH.js"),__vite__mapDeps([44,1])),"ph-sign-out":()=>c(()=>import("./PhSignOut-Cq2PivQ6.js"),__vite__mapDeps([45,1])),"ph-spinner":()=>c(()=>import("./PhSpinner-CZMtAFdX.js"),__vite__mapDeps([46,1])),"ph-trash":()=>c(()=>import("./PhTrash-BamrmMsN.js"),__vite__mapDeps([47,1])),"ph-user":()=>c(()=>import("./PhUser-A2fxqIV0.js"),__vite__mapDeps([48,1])),"ph-wallet":()=>c(()=>import("./PhWallet-WVAuHGpA.js"),__vite__mapDeps([49,1])),"ph-warning":()=>c(()=>import("./PhWarning-CpkID9oi.js"),__vite__mapDeps([50,1])),"ph-warning-circle":()=>c(()=>import("./PhWarningCircle-Cm58gXb9.js"),__vite__mapDeps([51,1])),"ph-x":()=>c(()=>import("./PhX-C3b4cCEy.js"),__vite__mapDeps([52,1]))},Ye={appStore:we,apple:be,bitcoin:$e,coins:_e,chromeStore:ye,cursor:xe,discord:Le,ethereum:Se,etherscan:Pe,facebook:ze,farcaster:ke,github:Ee,google:Ie,playStore:Re,paperPlaneTitle:Ae,reown:Oe,solana:He,ton:Te,tron:Ze,telegram:Me,twitch:Be,twitter:oe,twitterIcon:De,walletConnect:je,walletConnectInvert:We,walletConnectBrown:Fe,walletConnectLightBrown:Ue,x:oe,infoSeal:Ve,checkmark:Ce},Xe={"accent-primary":u.tokens.core.iconAccentPrimary,"accent-certified":u.tokens.core.iconAccentCertified,"foreground-secondary":u.tokens.theme.foregroundSecondary,default:u.tokens.theme.iconDefault,success:u.tokens.core.iconSuccess,error:u.tokens.core.iconError,warning:u.tokens.core.iconWarning,inverse:u.tokens.theme.iconInverse};let A=class extends v{constructor(){super(...arguments),this.size="md",this.name="copy",this.weight="bold",this.color="inherit"}render(){const t={xxs:"2",xs:"3",sm:"3",md:"4",mdl:"5",lg:"5",xl:"6",xxl:"7",inherit:"inherit"};this.style.cssText=`
      --local-width: ${this.size==="inherit"?"inherit":`var(--apkt-spacing-${t[this.size]})`};
      --local-color: ${this.color==="inherit"?"inherit":Xe[this.color]}
    `;const o=Ge[this.name];if(o&&o!==""){const r=qe[o];r&&r();const n=me(o);return ie`<${n} size=${{xxs:"0.5em",xs:"0.75em",sm:"0.75em",md:"1em",mdl:"1.25em",lg:"1.25em",xl:"1.5em",xxl:"1.75em"}[this.size]} weight="${this.weight}"></${n}>`}return Ye[this.name]||ie``}};A.styles=[b,Ne];W([l()],A.prototype,"size",void 0);W([l()],A.prototype,"name",void 0);W([l()],A.prototype,"weight",void 0);W([l()],A.prototype,"color",void 0);A=W([w("wui-icon")],A);const Qe={ATTRIBUTE:1,CHILD:2},Je=e=>(...t)=>({_$litDirective$:e,values:t});class Ke{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,o,r){this._$Ct=t,this._$AM=o,this._$Ci=r}_$AS(t,o){return this.update(t,o)}update(t,o){return this.render(...o)}}const et=Je(class extends Ke{constructor(e){if(super(e),e.type!==Qe.ATTRIBUTE||e.name!=="class"||e.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in t)t[r]&&!this.nt?.has(r)&&this.st.add(r);return this.render(t)}const o=e.element.classList;for(const r of this.st)r in t||(o.remove(r),this.st.delete(r));for(const r in t){const n=!!t[r];n===this.st.has(r)||this.nt?.has(r)||(n?(o.add(r),this.st.add(r)):(o.remove(r),this.st.delete(r)))}return ce}}),tt=L`
  slot {
    width: 100%;
    display: inline-block;
    font-style: normal;
    overflow: inherit;
    text-overflow: inherit;
    text-align: var(--local-align);
    color: var(--local-color);
  }

  .wui-line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .wui-line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  /* -- Headings --------------------------------------------------- */
  .wui-font-h1-regular-mono {
    font-size: ${({textSize:e})=>e.h1};
    line-height: ${({typography:e})=>e["h1-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h1-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-h1-regular {
    font-size: ${({textSize:e})=>e.h1};
    line-height: ${({typography:e})=>e["h1-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h1-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h1-medium {
    font-size: ${({textSize:e})=>e.h1};
    line-height: ${({typography:e})=>e["h1-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h1-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h2-regular-mono {
    font-size: ${({textSize:e})=>e.h2};
    line-height: ${({typography:e})=>e["h2-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h2-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-h2-regular {
    font-size: ${({textSize:e})=>e.h2};
    line-height: ${({typography:e})=>e["h2-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h2-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h2-medium {
    font-size: ${({textSize:e})=>e.h2};
    line-height: ${({typography:e})=>e["h2-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h2-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h3-regular-mono {
    font-size: ${({textSize:e})=>e.h3};
    line-height: ${({typography:e})=>e["h3-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h3-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-h3-regular {
    font-size: ${({textSize:e})=>e.h3};
    line-height: ${({typography:e})=>e["h3-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h3-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h3-medium {
    font-size: ${({textSize:e})=>e.h3};
    line-height: ${({typography:e})=>e["h3-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h3-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h4-regular-mono {
    font-size: ${({textSize:e})=>e.h4};
    line-height: ${({typography:e})=>e["h4-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h4-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-h4-regular {
    font-size: ${({textSize:e})=>e.h4};
    line-height: ${({typography:e})=>e["h4-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h4-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h4-medium {
    font-size: ${({textSize:e})=>e.h4};
    line-height: ${({typography:e})=>e["h4-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h4-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h5-regular-mono {
    font-size: ${({textSize:e})=>e.h5};
    line-height: ${({typography:e})=>e["h5-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h5-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-h5-regular {
    font-size: ${({textSize:e})=>e.h5};
    line-height: ${({typography:e})=>e["h5-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h5-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h5-medium {
    font-size: ${({textSize:e})=>e.h5};
    line-height: ${({typography:e})=>e["h5-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h5-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h6-regular-mono {
    font-size: ${({textSize:e})=>e.h6};
    line-height: ${({typography:e})=>e["h6-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h6-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-h6-regular {
    font-size: ${({textSize:e})=>e.h6};
    line-height: ${({typography:e})=>e["h6-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h6-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-h6-medium {
    font-size: ${({textSize:e})=>e.h6};
    line-height: ${({typography:e})=>e["h6-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["h6-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-lg-regular-mono {
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-lg-regular {
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-lg-medium {
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-md-regular-mono {
    font-size: ${({textSize:e})=>e.medium};
    line-height: ${({typography:e})=>e["md-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["md-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-md-regular {
    font-size: ${({textSize:e})=>e.medium};
    line-height: ${({typography:e})=>e["md-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["md-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-md-medium {
    font-size: ${({textSize:e})=>e.medium};
    line-height: ${({typography:e})=>e["md-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["md-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-sm-regular-mono {
    font-size: ${({textSize:e})=>e.small};
    line-height: ${({typography:e})=>e["sm-regular-mono"].lineHeight};
    letter-spacing: ${({typography:e})=>e["sm-regular-mono"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.mono};
  }

  .wui-font-sm-regular {
    font-size: ${({textSize:e})=>e.small};
    line-height: ${({typography:e})=>e["sm-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["sm-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }

  .wui-font-sm-medium {
    font-size: ${({textSize:e})=>e.small};
    line-height: ${({typography:e})=>e["sm-medium"].lineHeight};
    letter-spacing: ${({typography:e})=>e["sm-medium"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.medium};
    font-family: ${({fontFamily:e})=>e.regular};
    font-feature-settings:
      'liga' off,
      'clig' off;
  }
`;var D=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};const it={primary:u.tokens.theme.textPrimary,secondary:u.tokens.theme.textSecondary,tertiary:u.tokens.theme.textTertiary,invert:u.tokens.theme.textInvert,error:u.tokens.core.textError,success:u.tokens.core.textSuccess,warning:u.tokens.core.textWarning,"accent-primary":u.tokens.core.textAccentPrimary};let V=class extends v{constructor(){super(...arguments),this.variant="md-regular",this.color="inherit",this.align="left",this.lineClamp=void 0,this.display="inline-flex"}render(){const t={[`wui-font-${this.variant}`]:!0,[`wui-line-clamp-${this.lineClamp}`]:!!this.lineClamp};return this.style.cssText=`
      display: ${this.display};
      --local-align: ${this.align};
      --local-color: ${this.color==="inherit"?"inherit":it[this.color??"primary"]};
      `,h`<slot class=${et(t)}></slot>`}};V.styles=[b,tt];D([l()],V.prototype,"variant",void 0);D([l()],V.prototype,"color",void 0);D([l()],V.prototype,"align",void 0);D([l()],V.prototype,"lineClamp",void 0);D([l()],V.prototype,"display",void 0);V=D([w("wui-text")],V);const ot=L`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    border-radius: ${({borderRadius:e})=>e[2]};
    padding: ${({spacing:e})=>e[1]} !important;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    position: relative;
  }

  :host([data-padding='2']) {
    padding: ${({spacing:e})=>e[2]} !important;
  }

  :host:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host > wui-icon {
    z-index: 10;
  }

  /* -- Colors --------------------------------------------------- */
  :host([data-color='accent-primary']) {
    color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  :host([data-color='accent-primary']):after {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  :host([data-color='default']),
  :host([data-color='secondary']) {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  :host([data-color='default']):after {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-color='secondary']):after {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  :host([data-color='success']) {
    color: ${({tokens:e})=>e.core.iconSuccess};
  }

  :host([data-color='success']):after {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }

  :host([data-color='error']) {
    color: ${({tokens:e})=>e.core.iconError};
  }

  :host([data-color='error']):after {
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  :host([data-color='warning']) {
    color: ${({tokens:e})=>e.core.iconWarning};
  }

  :host([data-color='warning']):after {
    background-color: ${({tokens:e})=>e.core.backgroundWarning};
  }

  :host([data-color='inverse']) {
    color: ${({tokens:e})=>e.theme.iconInverse};
  }

  :host([data-color='inverse']):after {
    background-color: transparent;
  }
`;var U=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let R=class extends v{constructor(){super(...arguments),this.icon="copy",this.size="md",this.padding="1",this.color="default"}render(){return this.dataset.padding=this.padding,this.dataset.color=this.color,h`
      <wui-icon size=${P(this.size)} name=${this.icon} color="inherit"></wui-icon>
    `}};R.styles=[b,B,ot];U([l()],R.prototype,"icon",void 0);U([l()],R.prototype,"size",void 0);U([l()],R.prototype,"padding",void 0);U([l()],R.prototype,"color",void 0);R=U([w("wui-icon-box")],R);const rt=L`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
    user-select: none;
    user-drag: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
  }

  :host([data-boxed='true']) {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-boxed='true']) img {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  :host([data-full='true']) img {
    width: 100%;
    height: 100%;
  }

  :host([data-boxed='true']) wui-icon {
    width: 20px;
    height: 20px;
  }

  :host([data-icon='error']) {
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  :host([data-rounded='true']) {
    border-radius: ${({borderRadius:e})=>e[16]};
  }
`;var S=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let x=class extends v{constructor(){super(...arguments),this.src="./path/to/image.jpg",this.alt="Image",this.size=void 0,this.boxed=!1,this.rounded=!1,this.fullSize=!1}render(){const t={inherit:"inherit",xxs:"2",xs:"3",sm:"4",md:"4",mdl:"5",lg:"5",xl:"6",xxl:"7","3xl":"8","4xl":"9","5xl":"10"};return this.style.cssText=`
      --local-width: ${this.size?`var(--apkt-spacing-${t[this.size]});`:"100%"};
      --local-height: ${this.size?`var(--apkt-spacing-${t[this.size]});`:"100%"};
      `,this.dataset.boxed=this.boxed?"true":"false",this.dataset.rounded=this.rounded?"true":"false",this.dataset.full=this.fullSize?"true":"false",this.dataset.icon=this.iconColor||"inherit",this.icon?h`<wui-icon
        color=${this.iconColor||"inherit"}
        name=${this.icon}
        size="lg"
      ></wui-icon> `:this.logo?h`<wui-icon size="lg" color="inherit" name=${this.logo}></wui-icon> `:h`<img src=${P(this.src)} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent("onLoadError",{bubbles:!0,composed:!0}))}};x.styles=[b,rt];S([l()],x.prototype,"src",void 0);S([l()],x.prototype,"logo",void 0);S([l()],x.prototype,"icon",void 0);S([l()],x.prototype,"iconColor",void 0);S([l()],x.prototype,"alt",void 0);S([l()],x.prototype,"size",void 0);S([l({type:Boolean})],x.prototype,"boxed",void 0);S([l({type:Boolean})],x.prototype,"rounded",void 0);S([l({type:Boolean})],x.prototype,"fullSize",void 0);x=S([w("wui-image")],x);const nt=L`
  :host {
    position: relative;
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-image='true']) {
    background-color: transparent;
  }

  :host > wui-flex {
    overflow: hidden;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-size='sm']) {
    width: 32px;
    height: 32px;
  }

  :host([data-size='md']) {
    width: 40px;
    height: 40px;
  }

  :host([data-size='lg']) {
    width: 56px;
    height: 56px;
  }

  :host([name='Extension'])::after {
    border: 1px solid ${({colors:e})=>e.accent010};
  }

  :host([data-wallet-icon='allWallets'])::after {
    border: 1px solid ${({colors:e})=>e.accent010};
  }

  wui-icon[data-parent-size='inherit'] {
    width: 75%;
    height: 75%;
    align-items: center;
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  wui-icon[data-parent-size='sm'] {
    width: 24px;
    height: 24px;
  }

  wui-icon[data-parent-size='md'] {
    width: 32px;
    height: 32px;
  }

  :host > wui-icon-box {
    position: absolute;
    overflow: hidden;
    right: -1px;
    bottom: -2px;
    z-index: 1;
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: 1px;
  }
`;var M=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let z=class extends v{constructor(){super(...arguments),this.size="md",this.name="",this.installed=!1,this.badgeSize="xs"}render(){let t="1";return this.size==="lg"?t="4":this.size==="md"?t="2":this.size==="sm"&&(t="1"),this.style.cssText=`
       --local-border-radius: var(--apkt-borderRadius-${t});
   `,this.dataset.size=this.size,this.imageSrc&&(this.dataset.image="true"),this.walletIcon&&(this.dataset.walletIcon=this.walletIcon),h`
      <wui-flex justifyContent="center" alignItems="center"> ${this.templateVisual()} </wui-flex>
    `}templateVisual(){return this.imageSrc?h`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:this.walletIcon?h`<wui-icon size="md" color="default" name=${this.walletIcon}></wui-icon>`:h`<wui-icon
      data-parent-size=${this.size}
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`}};z.styles=[b,nt];M([l()],z.prototype,"size",void 0);M([l()],z.prototype,"name",void 0);M([l()],z.prototype,"imageSrc",void 0);M([l()],z.prototype,"walletIcon",void 0);M([l({type:Boolean})],z.prototype,"installed",void 0);M([l()],z.prototype,"badgeSize",void 0);z=M([w("wui-wallet-image")],z);const at=L`
  :host {
    position: relative;
    border-radius: ${({borderRadius:e})=>e[2]};
    width: 40px;
    height: 40px;
    overflow: hidden;
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    column-gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[1]};
  }

  :host > wui-wallet-image {
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }
`;var ne=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};const X=4;let q=class extends v{constructor(){super(...arguments),this.walletImages=[]}render(){const t=this.walletImages.length<X;return h`${this.walletImages.slice(0,X).map(({src:o,walletName:r})=>h`
          <wui-wallet-image
            size="sm"
            imageSrc=${o}
            name=${P(r)}
          ></wui-wallet-image>
        `)}
    ${t?[...Array(X-this.walletImages.length)].map(()=>h` <wui-wallet-image size="sm" name=""></wui-wallet-image>`):null} `}};q.styles=[b,at];ne([l({type:Array})],q.prototype,"walletImages",void 0);q=ne([w("wui-all-wallets-image")],q);const lt=L`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: ${({spacing:e})=>e[1]};
    text-transform: uppercase;
    white-space: nowrap;
  }

  :host([data-variant='accent']) {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  :host([data-variant='info']) {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-variant='success']) {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
    color: ${({tokens:e})=>e.core.textSuccess};
  }

  :host([data-variant='warning']) {
    background-color: ${({tokens:e})=>e.core.backgroundWarning};
    color: ${({tokens:e})=>e.core.textWarning};
  }

  :host([data-variant='error']) {
    background-color: ${({tokens:e})=>e.core.backgroundError};
    color: ${({tokens:e})=>e.core.textError};
  }

  :host([data-variant='certified']) {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-size='md']) {
    height: 30px;
    padding: 0 ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-size='sm']) {
    height: 20px;
    padding: 0 ${({spacing:e})=>e[1]};
    border-radius: ${({borderRadius:e})=>e[1]};
  }
`;var Y=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let Z=class extends v{constructor(){super(...arguments),this.variant="accent",this.size="md",this.icon=void 0}render(){this.dataset.variant=this.variant,this.dataset.size=this.size;const t=this.size==="md"?"md-medium":"sm-medium",o=this.size==="md"?"md":"sm";return h`
      ${this.icon?h`<wui-icon size=${o} name=${this.icon}></wui-icon>`:null}
      <wui-text
        display="inline"
        data-variant=${this.variant}
        variant=${t}
        color="inherit"
      >
        <slot></slot>
      </wui-text>
    `}};Z.styles=[b,lt];Y([l()],Z.prototype,"variant",void 0);Y([l()],Z.prototype,"size",void 0);Y([l()],Z.prototype,"icon",void 0);Z=Y([w("wui-tag")],Z);const st=L`
  :host {
    width: 100%;
  }

  button {
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button > wui-wallet-image {
    background: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button > wui-text:nth-child(2) {
    display: flex;
    flex: 1;
  }

  button:hover:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-all-wallets='true'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-all-wallets='true']:hover:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  button:disabled {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:disabled > wui-tag {
    background-color: ${({tokens:e})=>e.core.glass010};
    color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  wui-flex.namespace-icon {
    width: 16px;
    height: 16px;
    border-radius: ${({borderRadius:e})=>e.round};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.backgroundPrimary};
    transition: box-shadow var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2);
  }

  button:hover:enabled wui-flex.namespace-icon {
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-flex.namespace-icon > wui-icon {
    width: 10px;
    height: 10px;
  }

  wui-flex.namespace-icon:not(:first-child) {
    margin-left: -4px;
  }
`;var C=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};const ct={eip155:"ethereum",solana:"solana",bip122:"bitcoin",polkadot:void 0,cosmos:void 0,sui:void 0,stacks:void 0,ton:"ton",tron:"tron"};let f=class extends v{constructor(){super(...arguments),this.walletImages=[],this.imageSrc="",this.name="",this.size="md",this.tabIdx=void 0,this.namespaces=[],this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100"}render(){return this.dataset.size=this.size,h`
      <button
        ?disabled=${this.disabled}
        data-all-wallets=${this.showAllWallets}
        tabindex=${P(this.tabIdx)}
      >
        ${this.templateAllWallets()} ${this.templateWalletImage()}
        <wui-flex flexDirection="column" justifyContent="center" alignItems="flex-start" gap="1">
          <wui-text variant="lg-regular" color="inherit">${this.name}</wui-text>
          ${this.templateNamespaces()}
        </wui-flex>
        ${this.templateStatus()}
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `}templateNamespaces(){return this.namespaces?.length?h`<wui-flex alignItems="center" gap="0">
        ${this.namespaces.map((t,o)=>h`<wui-flex
              alignItems="center"
              justifyContent="center"
              zIndex=${(this.namespaces?.length??0)*2-o}
              class="namespace-icon"
            >
              <wui-icon
                name=${P(ct[t])}
                size="sm"
                color="default"
              ></wui-icon>
            </wui-flex>`)}
      </wui-flex>`:null}templateAllWallets(){return this.showAllWallets&&this.imageSrc?h` <wui-all-wallets-image .imageeSrc=${this.imageSrc}> </wui-all-wallets-image> `:this.showAllWallets&&this.walletIcon?h` <wui-wallet-image .walletIcon=${this.walletIcon} size="sm"> </wui-wallet-image> `:null}templateWalletImage(){return!this.showAllWallets&&this.imageSrc?h`<wui-wallet-image
        size=${P(this.size==="sm"?"sm":"md")}
        imageSrc=${this.imageSrc}
        name=${this.name}
      ></wui-wallet-image>`:!this.showAllWallets&&!this.imageSrc?h`<wui-wallet-image size="sm" name=${this.name}></wui-wallet-image>`:null}templateStatus(){return this.loading?h`<wui-loading-spinner size="lg" color="accent-primary"></wui-loading-spinner>`:this.tagLabel&&this.tagVariant?h`<wui-tag size="sm" variant=${this.tagVariant}>${this.tagLabel}</wui-tag>`:null}};f.styles=[b,B,st];C([l({type:Array})],f.prototype,"walletImages",void 0);C([l()],f.prototype,"imageSrc",void 0);C([l()],f.prototype,"name",void 0);C([l()],f.prototype,"size",void 0);C([l()],f.prototype,"tagLabel",void 0);C([l()],f.prototype,"tagVariant",void 0);C([l()],f.prototype,"walletIcon",void 0);C([l()],f.prototype,"tabIdx",void 0);C([l({type:Array})],f.prototype,"namespaces",void 0);C([l({type:Boolean})],f.prototype,"disabled",void 0);C([l({type:Boolean})],f.prototype,"showAllWallets",void 0);C([l({type:Boolean})],f.prototype,"loading",void 0);C([l({type:String})],f.prototype,"loadingSpinnerColor",void 0);f=C([w("wui-list-wallet")],f);const ht=J`
  :host {
    display: flex;
  }

  :host([data-size='sm']) > svg {
    width: 12px;
    height: 12px;
  }

  :host([data-size='md']) > svg {
    width: 16px;
    height: 16px;
  }

  :host([data-size='lg']) > svg {
    width: 24px;
    height: 24px;
  }

  :host([data-size='xl']) > svg {
    width: 32px;
    height: 32px;
  }

  svg {
    animation: rotate 1.4s linear infinite;
    color: var(--local-color);
  }

  :host([data-size='md']) > svg > circle {
    stroke-width: 6px;
  }

  :host([data-size='sm']) > svg > circle {
    stroke-width: 8px;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
`;var K=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let j=class extends v{constructor(){super(...arguments),this.color="primary",this.size="lg"}render(){const t={primary:u.tokens.theme.textPrimary,secondary:u.tokens.theme.textSecondary,tertiary:u.tokens.theme.textTertiary,invert:u.tokens.theme.textInvert,error:u.tokens.core.textError,warning:u.tokens.core.textWarning,"accent-primary":u.tokens.core.textAccentPrimary};return this.style.cssText=`
      --local-color: ${this.color==="inherit"?"inherit":t[this.color]};
      `,this.dataset.size=this.size,h`<svg viewBox="0 0 16 17" fill="none">
      <path
        d="M8.75 2.65625V4.65625C8.75 4.85516 8.67098 5.04593 8.53033 5.18658C8.38968 5.32723 8.19891 5.40625 8 5.40625C7.80109 5.40625 7.61032 5.32723 7.46967 5.18658C7.32902 5.04593 7.25 4.85516 7.25 4.65625V2.65625C7.25 2.45734 7.32902 2.26657 7.46967 2.12592C7.61032 1.98527 7.80109 1.90625 8 1.90625C8.19891 1.90625 8.38968 1.98527 8.53033 2.12592C8.67098 2.26657 8.75 2.45734 8.75 2.65625ZM14 7.90625H12C11.8011 7.90625 11.6103 7.98527 11.4697 8.12592C11.329 8.26657 11.25 8.45734 11.25 8.65625C11.25 8.85516 11.329 9.04593 11.4697 9.18658C11.6103 9.32723 11.8011 9.40625 12 9.40625H14C14.1989 9.40625 14.3897 9.32723 14.5303 9.18658C14.671 9.04593 14.75 8.85516 14.75 8.65625C14.75 8.45734 14.671 8.26657 14.5303 8.12592C14.3897 7.98527 14.1989 7.90625 14 7.90625ZM11.3588 10.9544C11.289 10.8846 11.2062 10.8293 11.115 10.7915C11.0239 10.7538 10.9262 10.7343 10.8275 10.7343C10.7288 10.7343 10.6311 10.7538 10.54 10.7915C10.4488 10.8293 10.366 10.8846 10.2963 10.9544C10.2265 11.0241 10.1711 11.107 10.1334 11.1981C10.0956 11.2893 10.0762 11.387 10.0762 11.4856C10.0762 11.5843 10.0956 11.682 10.1334 11.7731C10.1711 11.8643 10.2265 11.9471 10.2963 12.0169L11.7106 13.4312C11.8515 13.5721 12.0426 13.6513 12.2419 13.6513C12.4411 13.6513 12.6322 13.5721 12.7731 13.4312C12.914 13.2904 12.9932 13.0993 12.9932 12.9C12.9932 12.7007 12.914 12.5096 12.7731 12.3687L11.3588 10.9544ZM8 11.9062C7.80109 11.9062 7.61032 11.9853 7.46967 12.1259C7.32902 12.2666 7.25 12.4573 7.25 12.6562V14.6562C7.25 14.8552 7.32902 15.0459 7.46967 15.1866C7.61032 15.3272 7.80109 15.4062 8 15.4062C8.19891 15.4062 8.38968 15.3272 8.53033 15.1866C8.67098 15.0459 8.75 14.8552 8.75 14.6562V12.6562C8.75 12.4573 8.67098 12.2666 8.53033 12.1259C8.38968 11.9853 8.19891 11.9062 8 11.9062ZM4.64125 10.9544L3.22688 12.3687C3.08598 12.5096 3.00682 12.7007 3.00682 12.9C3.00682 13.0993 3.08598 13.2904 3.22688 13.4312C3.36777 13.5721 3.55887 13.6513 3.75813 13.6513C3.95738 13.6513 4.14848 13.5721 4.28937 13.4312L5.70375 12.0169C5.84465 11.876 5.9238 11.6849 5.9238 11.4856C5.9238 11.2864 5.84465 11.0953 5.70375 10.9544C5.56285 10.8135 5.37176 10.7343 5.1725 10.7343C4.97324 10.7343 4.78215 10.8135 4.64125 10.9544ZM4.75 8.65625C4.75 8.45734 4.67098 8.26657 4.53033 8.12592C4.38968 7.98527 4.19891 7.90625 4 7.90625H2C1.80109 7.90625 1.61032 7.98527 1.46967 8.12592C1.32902 8.26657 1.25 8.45734 1.25 8.65625C1.25 8.85516 1.32902 9.04593 1.46967 9.18658C1.61032 9.32723 1.80109 9.40625 2 9.40625H4C4.19891 9.40625 4.38968 9.32723 4.53033 9.18658C4.67098 9.04593 4.75 8.85516 4.75 8.65625ZM4.2875 3.88313C4.1466 3.74223 3.95551 3.66307 3.75625 3.66307C3.55699 3.66307 3.3659 3.74223 3.225 3.88313C3.0841 4.02402 3.00495 4.21512 3.00495 4.41438C3.00495 4.61363 3.0841 4.80473 3.225 4.94562L4.64125 6.35813C4.78215 6.49902 4.97324 6.57818 5.1725 6.57818C5.37176 6.57818 5.56285 6.49902 5.70375 6.35813C5.84465 6.21723 5.9238 6.02613 5.9238 5.82688C5.9238 5.62762 5.84465 5.43652 5.70375 5.29563L4.2875 3.88313Z"
        fill="currentColor"
      />
    </svg>`}};j.styles=[b,ht];K([l()],j.prototype,"color",void 0);K([l()],j.prototype,"size",void 0);j=K([w("wui-loading-spinner")],j);const dt=L`
  :host {
    width: var(--local-width);
  }

  button {
    width: var(--local-width);
    white-space: nowrap;
    column-gap: ${({spacing:e})=>e[2]};
    transition:
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: scale, background-color, border-radius;
    cursor: pointer;
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[2]};
    padding: 0 ${({spacing:e})=>e[2]};
    height: 28px;
  }

  button[data-size='md'] {
    border-radius: ${({borderRadius:e})=>e[3]};
    padding: 0 ${({spacing:e})=>e[4]};
    height: 38px;
  }

  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: 0 ${({spacing:e})=>e[5]};
    height: 48px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-variant='accent-primary'] {
    background-color: ${({tokens:e})=>e.core.backgroundAccentPrimary};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='accent-secondary'] {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button[data-variant='neutral-primary'] {
    background-color: ${({tokens:e})=>e.theme.backgroundInvert};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='neutral-secondary'] {
    background-color: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button[data-variant='neutral-tertiary'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button[data-variant='error-primary'] {
    background-color: ${({tokens:e})=>e.core.textError};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='error-secondary'] {
    background-color: ${({tokens:e})=>e.core.backgroundError};
    color: ${({tokens:e})=>e.core.textError};
  }

  button[data-variant='shade'] {
    background: var(--wui-color-gray-glass-002);
    color: var(--wui-color-fg-200);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  /* -- Focus states --------------------------------------------------- */
  button[data-size='sm']:focus-visible:enabled {
    border-radius: 28px;
  }

  button[data-size='md']:focus-visible:enabled {
    border-radius: 38px;
  }

  button[data-size='lg']:focus-visible:enabled {
    border-radius: 48px;
  }
  button[data-variant='shade']:focus-visible:enabled {
    background: var(--wui-color-gray-glass-005);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-gray-glass-002);
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button[data-size='sm']:hover:enabled {
      border-radius: 28px;
    }

    button[data-size='md']:hover:enabled {
      border-radius: 38px;
    }

    button[data-size='lg']:hover:enabled {
      border-radius: 48px;
    }

    button[data-variant='shade']:hover:enabled {
      background: var(--wui-color-gray-glass-002);
    }

    button[data-variant='shade']:active:enabled {
      background: var(--wui-color-gray-glass-005);
    }
  }

  button[data-size='sm']:active:enabled {
    border-radius: 28px;
  }

  button[data-size='md']:active:enabled {
    border-radius: 38px;
  }

  button[data-size='lg']:active:enabled {
    border-radius: 48px;
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    opacity: 0.3;
  }
`;var T=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};const ut={lg:"lg-regular-mono",md:"md-regular-mono",sm:"sm-regular-mono"},pt={lg:"md",md:"md",sm:"sm"};let k=class extends v{constructor(){super(...arguments),this.size="lg",this.disabled=!1,this.fullWidth=!1,this.loading=!1,this.variant="accent-primary"}render(){this.style.cssText=`
    --local-width: ${this.fullWidth?"100%":"auto"};
     `;const t=this.textVariant??ut[this.size];return h`
      <button data-variant=${this.variant} data-size=${this.size} ?disabled=${this.disabled}>
        ${this.loadingTemplate()}
        <slot name="iconLeft"></slot>
        <wui-text variant=${t} color="inherit">
          <slot></slot>
        </wui-text>
        <slot name="iconRight"></slot>
      </button>
    `}loadingTemplate(){if(this.loading){const t=pt[this.size],o=this.variant==="neutral-primary"||this.variant==="accent-primary"?"invert":"primary";return h`<wui-loading-spinner color=${o} size=${t}></wui-loading-spinner>`}return null}};k.styles=[b,B,dt];T([l()],k.prototype,"size",void 0);T([l({type:Boolean})],k.prototype,"disabled",void 0);T([l({type:Boolean})],k.prototype,"fullWidth",void 0);T([l({type:Boolean})],k.prototype,"loading",void 0);T([l()],k.prototype,"variant",void 0);T([l()],k.prototype,"textVariant",void 0);k=T([w("wui-button")],k);const gt=L`
  button {
    border: none;
    background: transparent;
    height: 20px;
    padding: ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    border-radius: ${({borderRadius:e})=>e[1]};
    padding: 0 ${({spacing:e})=>e[1]};
    border-radius: ${({spacing:e})=>e[1]};
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-variant='accent'] {
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button[data-variant='secondary'] {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  button[data-variant='accent']:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='secondary']:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-variant='accent']:hover:enabled {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='secondary']:hover:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button[data-variant='accent']:focus-visible {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='secondary']:focus-visible {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var F=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};const ft={sm:"sm-medium",md:"md-medium"},mt={accent:"accent-primary",secondary:"secondary"};let O=class extends v{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.variant="accent",this.icon=void 0}render(){return h`
      <button ?disabled=${this.disabled} data-variant=${this.variant}>
        <slot name="iconLeft"></slot>
        <wui-text
          color=${mt[this.variant]}
          variant=${ft[this.size]}
        >
          <slot></slot>
        </wui-text>
        ${this.iconTemplate()}
      </button>
    `}iconTemplate(){return this.icon?h`<wui-icon name=${this.icon} size="sm"></wui-icon>`:null}};O.styles=[b,B,gt];F([l()],O.prototype,"size",void 0);F([l({type:Boolean})],O.prototype,"disabled",void 0);F([l()],O.prototype,"variant",void 0);F([l()],O.prototype,"icon",void 0);O=F([w("wui-link")],O);const vt=L`
  :host {
    display: block;
    background: linear-gradient(
      90deg,
      ${({tokens:e})=>e.theme.foregroundPrimary} 0%,
      ${({tokens:e})=>e.theme.foregroundSecondary} 50%,
      ${({tokens:e})=>e.theme.foregroundPrimary} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  :host([data-rounded='true']) {
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  @keyframes shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
`;var N=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let H=class extends v{constructor(){super(...arguments),this.width="",this.height="",this.variant="default",this.rounded=!1}render(){return this.style.cssText=`
      width: ${this.width};
      height: ${this.height};
    `,this.dataset.rounded=this.rounded?"true":"false",h`<slot></slot>`}};H.styles=[vt];N([l()],H.prototype,"width",void 0);N([l()],H.prototype,"height",void 0);N([l()],H.prototype,"variant",void 0);N([l({type:Boolean})],H.prototype,"rounded",void 0);H=N([w("wui-shimmer")],H);const wt="https://reown.com",bt=L`
  .reown-logo {
    height: 24px;
  }

  a {
    text-decoration: none;
    cursor: pointer;
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  a:hover {
    opacity: 0.9;
  }
`;var $t=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let Q=class extends v{render(){return h`
      <a
        data-testid="ux-branding-reown"
        href=${wt}
        rel="noreferrer"
        target="_blank"
        style="text-decoration: none;"
      >
        <wui-flex
          justifyContent="center"
          alignItems="center"
          gap="1"
          .padding=${["01","0","3","0"]}
        >
          <wui-text variant="sm-regular" color="inherit"> UX by </wui-text>
          <wui-icon name="reown" size="inherit" class="reown-logo"></wui-icon>
        </wui-flex>
      </a>
    `}};Q.styles=[b,B,bt];Q=$t([w("wui-ux-by-reown")],Q);const Zt=d`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`,Ct=L`
  :host {
    width: 100%;
  }

  :host([data-type='primary']) > button {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  :host([data-type='secondary']) > button {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, scale;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-image {
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  @media (hover: hover) {
    :host([data-type='primary']) > button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }

    :host([data-type='secondary']) > button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var y=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i};let m=class extends v{constructor(){super(...arguments),this.type="primary",this.imageSrc="google",this.imageSize=void 0,this.loading=!1,this.boxColor="foregroundPrimary",this.disabled=!1,this.rightIcon=!0,this.boxed=!0,this.rounded=!1,this.fullSize=!1}render(){return this.dataset.rounded=this.rounded?"true":"false",this.dataset.type=this.type,h`
      <button
        ?disabled=${this.loading?!0:!!this.disabled}
        data-loading=${this.loading}
        tabindex=${P(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `}templateLeftIcon(){return this.icon?h`<wui-image
        icon=${this.icon}
        iconColor=${P(this.iconColor)}
        ?boxed=${this.boxed}
        ?rounded=${this.rounded}
        boxColor=${this.boxColor}
      ></wui-image>`:h`<wui-image
      ?boxed=${this.boxed}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      size=${P(this.imageSize)}
      src=${this.imageSrc}
      boxColor=${this.boxColor}
    ></wui-image>`}templateRightIcon(){return this.rightIcon?this.loading?h`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:h`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`:null}};m.styles=[b,B,Ct];y([l()],m.prototype,"type",void 0);y([l()],m.prototype,"imageSrc",void 0);y([l()],m.prototype,"imageSize",void 0);y([l()],m.prototype,"icon",void 0);y([l()],m.prototype,"iconColor",void 0);y([l({type:Boolean})],m.prototype,"loading",void 0);y([l()],m.prototype,"tabIdx",void 0);y([l()],m.prototype,"boxColor",void 0);y([l({type:Boolean})],m.prototype,"disabled",void 0);y([l({type:Boolean})],m.prototype,"rightIcon",void 0);y([l({type:Boolean})],m.prototype,"boxed",void 0);y([l({type:Boolean})],m.prototype,"rounded",void 0);y([l({type:Boolean})],m.prototype,"fullSize",void 0);m=y([w("wui-list-item")],m);export{I as U,Zt as a,et as b,w as c,Je as e,Ke as i,l as n,P as o,xt as r,Qe as t};
