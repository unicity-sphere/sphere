import{C as l,E as g,R as h,y as w,S as m,a as s,F as E,G as _,q as R,j as y,r as b,l as v,m as C,k as O}from"./index-D7HH-DHr.js";import{n as p,c as S,o as $}from"./index-CXsjo8fP.js";function I(){try{return s.returnOpenHref(`${R.SECURE_SITE_SDK_ORIGIN}/loading`,"popupWindow","width=600,height=800,scrollbars=yes")}catch{throw new Error("Could not open social popup")}}async function L(){h.push("ConnectingFarcaster");const e=w.getAuthConnector();if(e&&!l.getAccountData()?.farcasterUrl)try{const{url:t}=await e.provider.getFarcasterUri();l.setAccountProp("farcasterUrl",t,l.state.activeChain)}catch(t){h.goBack(),m.showError(t)}}async function T(e){h.push("ConnectingSocial");const r=w.getAuthConnector();let t=null;try{const i=setTimeout(()=>{throw new Error("Social login timed out. Please try again.")},45e3);if(r&&e){if(s.isTelegram()||(t=I()),t)l.setAccountProp("socialWindow",E(t),l.state.activeChain);else if(!s.isTelegram())throw new Error("Could not create social popup");const{uri:n}=await r.provider.getSocialRedirectUri({provider:e});if(!n)throw t?.close(),new Error("Could not fetch the social redirect uri");if(t&&(t.location.href=n),s.isTelegram()){_.setTelegramSocialProvider(e);const o=s.formatTelegramSocialLoginUrl(n);s.openHref(o,"_top")}clearTimeout(i)}}catch(i){t?.close();const n=s.parseError(i);m.showError(n),g.sendEvent({type:"track",event:"SOCIAL_LOGIN_ERROR",properties:{provider:e,message:n}})}}async function D(e){l.setAccountProp("socialProvider",e,l.state.activeChain),g.sendEvent({type:"track",event:"SOCIAL_LOGIN_STARTED",properties:{provider:e}}),e==="farcaster"?await L():await T(e)}const U=y`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:e})=>e[20]};
    overflow: hidden;
  }

  wui-icon {
    width: 100%;
    height: 100%;
  }
`;var x=function(e,r,t,i){var n=arguments.length,o=n<3?r:i===null?i=Object.getOwnPropertyDescriptor(r,t):i,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,r,t,i);else for(var c=e.length-1;c>=0;c--)(a=e[c])&&(o=(n<3?a(o):n>3?a(r,t,o):a(r,t))||o);return n>3&&o&&Object.defineProperty(r,t,o),o};let f=class extends v{constructor(){super(...arguments),this.logo="google"}render(){return C`<wui-icon color="inherit" size="inherit" name=${this.logo}></wui-icon> `}};f.styles=[b,U];x([p()],f.prototype,"logo",void 0);f=x([S("wui-logo")],f);const j=y`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-text {
    text-transform: capitalize;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var d=function(e,r,t,i){var n=arguments.length,o=n<3?r:i===null?i=Object.getOwnPropertyDescriptor(r,t):i,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,r,t,i);else for(var c=e.length-1;c>=0;c--)(a=e[c])&&(o=(n<3?a(o):n>3?a(r,t,o):a(r,t))||o);return n>3&&o&&Object.defineProperty(r,t,o),o};let u=class extends v{constructor(){super(...arguments),this.logo="google",this.name="Continue with google",this.disabled=!1}render(){return C`
      <button ?disabled=${this.disabled} tabindex=${$(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          <wui-image ?boxed=${!0} logo=${this.logo}></wui-image>
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `}};u.styles=[b,O,j];d([p()],u.prototype,"logo",void 0);d([p()],u.prototype,"name",void 0);d([p()],u.prototype,"tabIdx",void 0);d([p({type:Boolean})],u.prototype,"disabled",void 0);u=d([S("wui-list-social")],u);export{D as e};
