import{j as v,r as I,k as R,l as f,m as l,O as m,C as d,$ as ke,D as k,a as g,M as N,n as Z,E as $,G as me,y as b,q as C,R as h,d as O,S as E,o as y,t as ze,W as Fe,af as Gt,ag as he,aa as Q,a8 as qi,L as A,ah as tt,A as Ai,Q as Ki,P as Gi,K as Xi,T as ft,a0 as Xt,a1 as Yt,ai as Yi,aj as Qi,a3 as jt,ak as Ji}from"./index-BZ7ClDMm.js";import{n as c,c as p,o as w,U,r as u,b as Ii}from"./index-C0KHCAvF.js";import"./index-TWByYoF0.js";import"./index-Cvy_MXBP.js";import"./index--Ie0-NFG.js";import"./index-Di7eWYFI.js";import{W as Cr,a as Sr}from"./index-DpiUjijT.js";import"./index-Gd3eggJQ.js";import"./index-2W81E0wp.js";import"./index-JS_VBSE7.js";import{H as Qt}from"./HelpersUtil-DL4QvTrm.js";import{n as Zi}from"./index-D-akevY_.js";import{E as Y}from"./ExchangeController-ENK62f2N.js";import"./index-C8z005Dk.js";import"./index-DDF0IXen.js";import"./index-ebhfGB3L.js";import{M as mt}from"./MathUtil-BGCe3rZ3.js";import"./index-CW_aikpR.js";import{e as Jt,n as Zt}from"./ref-y6K-zY6B.js";import"./index-CfEeU0uc.js";import"./index-Bh4I3Hjc.js";import"./index-DOgXa3Jp.js";import"./index-yY6k49rM.js";import{O as bt}from"./index-CcxH4tjq.js";import{e as en}from"./index-DJdNkw57.js";import"./index-C4SyL-to.js";import"./index-7UgY7ZaY.js";import{N as tn}from"./NavigationUtil-DmfK5sOV.js";import"./index-DBsNsua_.js";import"./index-356iVkBA.js";import"./index-BbP3371Q.js";import"./ConstantsUtil-C4a6lxW3.js";const nn=v`
  :host {
    display: block;
  }

  button {
    border-radius: ${({borderRadius:t})=>t[20]};
    background: ${({tokens:t})=>t.theme.foregroundPrimary};
    display: flex;
    gap: ${({spacing:t})=>t[1]};
    padding: ${({spacing:t})=>t[1]};
    color: ${({tokens:t})=>t.theme.textSecondary};
    border-radius: ${({borderRadius:t})=>t[16]};
    height: 32px;
    transition: box-shadow ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: box-shadow;
  }

  button wui-flex.avatar-container {
    width: 28px;
    height: 24px;
    position: relative;

    wui-flex.network-image-container {
      position: absolute;
      bottom: 0px;
      right: 0px;
      width: 12px;
      height: 12px;
    }

    wui-flex.network-image-container wui-icon {
      background: ${({tokens:t})=>t.theme.foregroundPrimary};
    }

    wui-avatar {
      width: 24px;
      min-width: 24px;
      height: 24px;
    }

    wui-icon {
      width: 12px;
      height: 12px;
    }
  }

  wui-image,
  wui-icon {
    border-radius: ${({borderRadius:t})=>t[16]};
  }

  wui-text {
    white-space: nowrap;
  }

  button wui-flex.balance-container {
    height: 100%;
    border-radius: ${({borderRadius:t})=>t[16]};
    padding-left: ${({spacing:t})=>t[1]};
    padding-right: ${({spacing:t})=>t[1]};
    background: ${({tokens:t})=>t.theme.foregroundSecondary};
    color: ${({tokens:t})=>t.theme.textPrimary};
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:focus-visible:enabled,
  button:active:enabled {
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.2);

    wui-flex.balance-container {
      background: ${({tokens:t})=>t.theme.foregroundTertiary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled wui-text,
  button:disabled wui-flex.avatar-container {
    opacity: 0.3;
  }
`;var oe=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let H=class extends f{constructor(){super(...arguments),this.networkSrc=void 0,this.avatarSrc=void 0,this.balance=void 0,this.isUnsupportedChain=void 0,this.disabled=!1,this.loading=!1,this.address="",this.profileName="",this.charsStart=4,this.charsEnd=6}render(){return l`
      <button
        ?disabled=${this.disabled}
        class=${w(this.balance?void 0:"local-no-balance")}
        data-error=${w(this.isUnsupportedChain)}
      >
        ${this.imageTemplate()} ${this.addressTemplate()} ${this.balanceTemplate()}
      </button>
    `}imageTemplate(){const e=this.networkSrc?l`<wui-image src=${this.networkSrc}></wui-image>`:l` <wui-icon size="inherit" color="inherit" name="networkPlaceholder"></wui-icon> `;return l`<wui-flex class="avatar-container">
      <wui-avatar
        .imageSrc=${this.avatarSrc}
        alt=${this.address}
        address=${this.address}
      ></wui-avatar>

      <wui-flex class="network-image-container">${e}</wui-flex>
    </wui-flex>`}addressTemplate(){return l`<wui-text variant="md-regular" color="inherit">
      ${this.address?U.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?18:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?"end":"middle"}):null}
    </wui-text>`}balanceTemplate(){if(this.balance){const e=this.loading?l`<wui-loading-spinner size="md" color="inherit"></wui-loading-spinner>`:l`<wui-text variant="md-regular" color="inherit"> ${this.balance}</wui-text>`;return l`<wui-flex alignItems="center" justifyContent="center" class="balance-container"
        >${e}</wui-flex
      >`}return null}};H.styles=[I,R,nn];oe([c()],H.prototype,"networkSrc",void 0);oe([c()],H.prototype,"avatarSrc",void 0);oe([c()],H.prototype,"balance",void 0);oe([c({type:Boolean})],H.prototype,"isUnsupportedChain",void 0);oe([c({type:Boolean})],H.prototype,"disabled",void 0);oe([c({type:Boolean})],H.prototype,"loading",void 0);oe([c()],H.prototype,"address",void 0);oe([c()],H.prototype,"profileName",void 0);oe([c()],H.prototype,"charsStart",void 0);oe([c()],H.prototype,"charsEnd",void 0);H=oe([p("wui-account-button")],H);var j=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};class B extends f{constructor(){super(...arguments),this.unsubscribe=[],this.disabled=!1,this.balance="show",this.charsStart=4,this.charsEnd=6,this.namespace=void 0,this.isSupported=m.state.allowUnsupportedChain?!0:d.state.activeChain?d.checkIfSupportedNetwork(d.state.activeChain):!0}connectedCallback(){super.connectedCallback(),this.setAccountData(d.getAccountData(this.namespace)),this.setNetworkData(d.getNetworkData(this.namespace))}firstUpdated(){const e=this.namespace;e?this.unsubscribe.push(d.subscribeChainProp("accountState",i=>{this.setAccountData(i)},e),d.subscribeChainProp("networkState",i=>{this.setNetworkData(i),this.isSupported=d.checkIfSupportedNetwork(e,i?.caipNetwork?.caipNetworkId)},e)):this.unsubscribe.push(ke.subscribeNetworkImages(()=>{this.networkImage=k.getNetworkImage(this.network)}),d.subscribeKey("activeCaipAddress",i=>{this.caipAddress=i}),d.subscribeChainProp("accountState",i=>{this.setAccountData(i)}),d.subscribeKey("activeCaipNetwork",i=>{this.network=i,this.networkImage=k.getNetworkImage(i),this.isSupported=i?.chainNamespace?d.checkIfSupportedNetwork(i?.chainNamespace):!0,this.fetchNetworkImage(i)}))}updated(){this.fetchNetworkImage(this.network)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(!d.state.activeChain)return null;const e=this.balance==="show",i=typeof this.balanceVal!="string",{formattedText:o}=g.parseBalance(this.balanceVal,this.balanceSymbol);return l`
      <wui-account-button
        .disabled=${!!this.disabled}
        .isUnsupportedChain=${m.state.allowUnsupportedChain?!1:!this.isSupported}
        address=${w(g.getPlainAddress(this.caipAddress))}
        profileName=${w(this.profileName)}
        networkSrc=${w(this.networkImage)}
        avatarSrc=${w(this.profileImage)}
        balance=${e?o:""}
        @click=${this.onClick.bind(this)}
        data-testid=${`account-button${this.namespace?`-${this.namespace}`:""}`}
        .charsStart=${this.charsStart}
        .charsEnd=${this.charsEnd}
        ?loading=${i}
      >
      </wui-account-button>
    `}onClick(){this.isSupported||m.state.allowUnsupportedChain?N.open({namespace:this.namespace}):N.open({view:"UnsupportedChain"})}async fetchNetworkImage(e){e?.assets?.imageId&&(this.networkImage=await k.fetchNetworkImage(e?.assets?.imageId))}setAccountData(e){e&&(this.caipAddress=e.caipAddress,this.balanceVal=e.balance,this.balanceSymbol=e.balanceSymbol,this.profileName=e.profileName,this.profileImage=e.profileImage)}setNetworkData(e){e&&(this.network=e.caipNetwork,this.networkImage=k.getNetworkImage(e.caipNetwork))}}j([c({type:Boolean})],B.prototype,"disabled",void 0);j([c()],B.prototype,"balance",void 0);j([c()],B.prototype,"charsStart",void 0);j([c()],B.prototype,"charsEnd",void 0);j([c()],B.prototype,"namespace",void 0);j([u()],B.prototype,"caipAddress",void 0);j([u()],B.prototype,"balanceVal",void 0);j([u()],B.prototype,"balanceSymbol",void 0);j([u()],B.prototype,"profileName",void 0);j([u()],B.prototype,"profileImage",void 0);j([u()],B.prototype,"network",void 0);j([u()],B.prototype,"networkImage",void 0);j([u()],B.prototype,"isSupported",void 0);let li=class extends B{};li=j([p("w3m-account-button")],li);let ci=class extends B{};ci=j([p("appkit-account-button")],ci);const on=Z`
  :host {
    display: block;
    width: max-content;
  }
`;var ae=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};class ee extends f{constructor(){super(...arguments),this.unsubscribe=[],this.disabled=!1,this.balance=void 0,this.size=void 0,this.label=void 0,this.loadingLabel=void 0,this.charsStart=4,this.charsEnd=6,this.namespace=void 0}firstUpdated(){this.caipAddress=this.namespace?d.getAccountData(this.namespace)?.caipAddress:d.state.activeCaipAddress,this.namespace?this.unsubscribe.push(d.subscribeChainProp("accountState",e=>{this.caipAddress=e?.caipAddress},this.namespace)):this.unsubscribe.push(d.subscribeKey("activeCaipAddress",e=>this.caipAddress=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return this.caipAddress?l`
          <appkit-account-button
            .disabled=${!!this.disabled}
            balance=${w(this.balance)}
            .charsStart=${w(this.charsStart)}
            .charsEnd=${w(this.charsEnd)}
            namespace=${w(this.namespace)}
          >
          </appkit-account-button>
        `:l`
          <appkit-connect-button
            size=${w(this.size)}
            label=${w(this.label)}
            loadingLabel=${w(this.loadingLabel)}
            namespace=${w(this.namespace)}
          ></appkit-connect-button>
        `}}ee.styles=on;ae([c({type:Boolean})],ee.prototype,"disabled",void 0);ae([c()],ee.prototype,"balance",void 0);ae([c()],ee.prototype,"size",void 0);ae([c()],ee.prototype,"label",void 0);ae([c()],ee.prototype,"loadingLabel",void 0);ae([c()],ee.prototype,"charsStart",void 0);ae([c()],ee.prototype,"charsEnd",void 0);ae([c()],ee.prototype,"namespace",void 0);ae([u()],ee.prototype,"caipAddress",void 0);let di=class extends ee{};di=ae([p("w3m-button")],di);let ui=class extends ee{};ui=ae([p("appkit-button")],ui);const an=v`
  :host {
    position: relative;
    display: block;
  }

  button {
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  button[data-size='sm'] {
    padding: ${({spacing:t})=>t[2]};
  }

  button[data-size='md'] {
    padding: ${({spacing:t})=>t[3]};
  }

  button[data-size='lg'] {
    padding: ${({spacing:t})=>t[4]};
  }

  button[data-variant='primary'] {
    background: ${({tokens:t})=>t.core.backgroundAccentPrimary};
  }

  button[data-variant='secondary'] {
    background: ${({tokens:t})=>t.core.foregroundAccent010};
  }

  button:hover:enabled {
    border-radius: ${({borderRadius:t})=>t[3]};
  }

  button:disabled {
    cursor: not-allowed;
  }

  button[data-loading='true'] {
    cursor: not-allowed;
  }

  button[data-loading='true'][data-size='sm'] {
    border-radius: ${({borderRadius:t})=>t[32]};
    padding: ${({spacing:t})=>t[2]} ${({spacing:t})=>t[3]};
  }

  button[data-loading='true'][data-size='md'] {
    border-radius: ${({borderRadius:t})=>t[20]};
    padding: ${({spacing:t})=>t[3]} ${({spacing:t})=>t[4]};
  }

  button[data-loading='true'][data-size='lg'] {
    border-radius: ${({borderRadius:t})=>t[16]};
    padding: ${({spacing:t})=>t[4]} ${({spacing:t})=>t[5]};
  }
`;var rt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ee=class extends f{constructor(){super(...arguments),this.size="md",this.variant="primary",this.loading=!1,this.text="Connect Wallet"}render(){return l`
      <button
        data-loading=${this.loading}
        data-variant=${this.variant}
        data-size=${this.size}
        ?disabled=${this.loading}
      >
        ${this.contentTemplate()}
      </button>
    `}contentTemplate(){const e={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},i={primary:"invert",secondary:"accent-primary"};return this.loading?l`<wui-loading-spinner
      color=${i[this.variant]}
      size=${this.size}
    ></wui-loading-spinner>`:l` <wui-text variant=${e[this.size]} color=${i[this.variant]}>
        ${this.text}
      </wui-text>`}};Ee.styles=[I,R,an];rt([c()],Ee.prototype,"size",void 0);rt([c()],Ee.prototype,"variant",void 0);rt([c({type:Boolean})],Ee.prototype,"loading",void 0);rt([c()],Ee.prototype,"text",void 0);Ee=rt([p("wui-connect-button")],Ee);var xe=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};class $e extends f{constructor(){super(),this.unsubscribe=[],this.size="md",this.label="Connect Wallet",this.loadingLabel="Connecting...",this.open=N.state.open,this.loading=this.namespace?N.state.loadingNamespaceMap.get(this.namespace):N.state.loading,this.unsubscribe.push(N.subscribe(e=>{this.open=e.open,this.loading=this.namespace?e.loadingNamespaceMap.get(this.namespace):e.loading}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-connect-button
        size=${w(this.size)}
        .loading=${this.loading}
        @click=${this.onClick.bind(this)}
        data-testid=${`connect-button${this.namespace?`-${this.namespace}`:""}`}
      >
        ${this.loading?this.loadingLabel:this.label}
      </wui-connect-button>
    `}onClick(){this.open?N.close():this.loading||N.open({view:"Connect",namespace:this.namespace})}}xe([c()],$e.prototype,"size",void 0);xe([c()],$e.prototype,"label",void 0);xe([c()],$e.prototype,"loadingLabel",void 0);xe([c()],$e.prototype,"namespace",void 0);xe([u()],$e.prototype,"open",void 0);xe([u()],$e.prototype,"loading",void 0);let hi=class extends $e{};hi=xe([p("w3m-connect-button")],hi);let pi=class extends $e{};pi=xe([p("appkit-connect-button")],pi);const rn=v`
  :host {
    display: block;
  }

  button {
    border-radius: ${({borderRadius:t})=>t[32]};
    display: flex;
    gap: ${({spacing:t})=>t[1]};
    padding: ${({spacing:t})=>t[1]} ${({spacing:t})=>t[2]}
      ${({spacing:t})=>t[1]} ${({spacing:t})=>t[1]};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }
  }

  button[data-size='sm'] > wui-icon-box,
  button[data-size='sm'] > wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='md'] > wui-icon-box,
  button[data-size='md'] > wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='lg'] > wui-icon-box,
  button[data-size='lg'] > wui-image {
    width: 24px;
    height: 24px;
  }

  wui-image,
  wui-icon-box {
    border-radius: ${({borderRadius:t})=>t[32]};
  }
`;var st=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ae=class extends f{constructor(){super(...arguments),this.imageSrc=void 0,this.isUnsupportedChain=void 0,this.disabled=!1,this.size="lg"}render(){const e={sm:"sm-regular",md:"md-regular",lg:"lg-regular"};return l`
      <button data-size=${this.size} data-testid="wui-network-button" ?disabled=${this.disabled}>
        ${this.visualTemplate()}
        <wui-text variant=${e[this.size]} color="primary">
          <slot></slot>
        </wui-text>
      </button>
    `}visualTemplate(){return this.isUnsupportedChain?l` <wui-icon-box color="error" icon="warningCircle"></wui-icon-box> `:this.imageSrc?l`<wui-image src=${this.imageSrc}></wui-image>`:l` <wui-icon size="xl" color="default" name="networkPlaceholder"></wui-icon> `}};Ae.styles=[I,R,rn];st([c()],Ae.prototype,"imageSrc",void 0);st([c({type:Boolean})],Ae.prototype,"isUnsupportedChain",void 0);st([c({type:Boolean})],Ae.prototype,"disabled",void 0);st([c()],Ae.prototype,"size",void 0);Ae=st([p("wui-network-button")],Ae);const sn=Z`
  :host {
    display: block;
    width: max-content;
  }
`;var fe=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};class de extends f{constructor(){super(),this.unsubscribe=[],this.disabled=!1,this.network=d.state.activeCaipNetwork,this.networkImage=k.getNetworkImage(this.network),this.caipAddress=d.state.activeCaipAddress,this.loading=N.state.loading,this.isSupported=m.state.allowUnsupportedChain?!0:d.state.activeChain?d.checkIfSupportedNetwork(d.state.activeChain):!0,this.unsubscribe.push(ke.subscribeNetworkImages(()=>{this.networkImage=k.getNetworkImage(this.network)}),d.subscribeKey("activeCaipAddress",e=>{this.caipAddress=e}),d.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.networkImage=k.getNetworkImage(e),this.isSupported=e?.chainNamespace?d.checkIfSupportedNetwork(e.chainNamespace):!0,k.fetchNetworkImage(e?.assets?.imageId)}),N.subscribeKey("loading",e=>this.loading=e))}firstUpdated(){k.fetchNetworkImage(this.network?.assets?.imageId)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.network?d.checkIfSupportedNetwork(this.network.chainNamespace):!0;return l`
      <wui-network-button
        .disabled=${!!(this.disabled||this.loading)}
        .isUnsupportedChain=${m.state.allowUnsupportedChain?!1:!e}
        imageSrc=${w(this.networkImage)}
        @click=${this.onClick.bind(this)}
        data-testid="w3m-network-button"
      >
        ${this.getLabel()}
        <slot></slot>
      </wui-network-button>
    `}getLabel(){return this.network?!this.isSupported&&!m.state.allowUnsupportedChain?"Switch Network":this.network.name:this.label?this.label:this.caipAddress?"Unknown Network":"Select Network"}onClick(){this.loading||($.sendEvent({type:"track",event:"CLICK_NETWORKS"}),N.open({view:"Networks"}))}}de.styles=sn;fe([c({type:Boolean})],de.prototype,"disabled",void 0);fe([c({type:String})],de.prototype,"label",void 0);fe([u()],de.prototype,"network",void 0);fe([u()],de.prototype,"networkImage",void 0);fe([u()],de.prototype,"caipAddress",void 0);fe([u()],de.prototype,"loading",void 0);fe([u()],de.prototype,"isSupported",void 0);let wi=class extends de{};wi=fe([p("w3m-network-button")],wi);let fi=class extends de{};fi=fe([p("appkit-network-button")],fi);const ln=v`
  :host {
    display: block;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:t})=>t[4]};
    padding: ${({spacing:t})=>t[3]};
    border-radius: ${({borderRadius:t})=>t[4]};
    background-color: ${({tokens:t})=>t.core.foregroundAccent010};
  }

  wui-flex > wui-icon {
    padding: ${({spacing:t})=>t[2]};
    color: ${({tokens:t})=>t.theme.textInvert};
    background-color: ${({tokens:t})=>t.core.backgroundAccentPrimary};
    border-radius: ${({borderRadius:t})=>t[2]};
    align-items: center;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:t})=>t.core.foregroundAccent020};
    }
  }
`;var Rt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Me=class extends f{constructor(){super(...arguments),this.label="",this.description="",this.icon="wallet"}render(){return l`
      <button>
        <wui-flex gap="2" alignItems="center">
          <wui-icon weight="fill" size="lg" name=${this.icon} color="inherit"></wui-icon>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.label}</wui-text>
            <wui-text variant="md-regular" color="tertiary">${this.description}</wui-text>
          </wui-flex>
        </wui-flex>
        <wui-icon size="lg" color="accent-primary" name="chevronRight"></wui-icon>
      </button>
    `}};Me.styles=[I,R,ln];Rt([c()],Me.prototype,"label",void 0);Rt([c()],Me.prototype,"description",void 0);Rt([c()],Me.prototype,"icon",void 0);Me=Rt([p("wui-notice-card")],Me);var _i=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Bt=class extends f{constructor(){super(),this.unsubscribe=[],this.socialProvider=me.getConnectedSocialProvider(),this.socialUsername=me.getConnectedSocialUsername(),this.namespace=d.state.activeChain,this.unsubscribe.push(d.subscribeKey("activeChain",e=>{this.namespace=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=b.getConnectorId(this.namespace),i=b.getAuthConnector();if(!i||e!==C.CONNECTOR_ID.AUTH)return this.style.cssText="display: none",null;const o=i.provider.getEmail()??"";return!o&&!this.socialUsername?(this.style.cssText="display: none",null):l`
      <wui-list-item
        ?rounded=${!0}
        icon=${this.socialProvider??"mail"}
        data-testid="w3m-account-email-update"
        ?chevron=${!this.socialProvider}
        @click=${()=>{this.onGoToUpdateEmail(o,this.socialProvider)}}
      >
        <wui-text variant="lg-regular" color="primary">${this.getAuthName(o)}</wui-text>
      </wui-list-item>
    `}onGoToUpdateEmail(e,i){i||h.push("UpdateEmailWallet",{email:e,redirectView:"Account"})}getAuthName(e){return this.socialUsername?this.socialProvider==="discord"&&this.socialUsername.endsWith("0")?this.socialUsername.slice(0,-1):this.socialUsername:e.length>30?`${e.slice(0,-3)}...`:e}};_i([u()],Bt.prototype,"namespace",void 0);Bt=_i([p("w3m-account-auth-button")],Bt);var je=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let be=class extends f{constructor(){super(),this.usubscribe=[],this.networkImages=ke.state.networkImages,this.address=d.getAccountData()?.address,this.profileImage=d.getAccountData()?.profileImage,this.profileName=d.getAccountData()?.profileName,this.network=d.state.activeCaipNetwork,this.disconnecting=!1,this.remoteFeatures=m.state.remoteFeatures,this.usubscribe.push(d.subscribeChainProp("accountState",e=>{e&&(this.address=e.address,this.profileImage=e.profileImage,this.profileName=e.profileName)}),d.subscribeKey("activeCaipNetwork",e=>{e?.id&&(this.network=e)}),m.subscribeKey("remoteFeatures",e=>{this.remoteFeatures=e}))}disconnectedCallback(){this.usubscribe.forEach(e=>e())}render(){if(!this.address)throw new Error("w3m-account-settings-view: No account provided");const e=this.networkImages[this.network?.assets?.imageId??""];return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${["0","5","3","5"]}
      >
        <wui-avatar
          alt=${this.address}
          address=${this.address}
          imageSrc=${w(this.profileImage)}
          size="lg"
        ></wui-avatar>
        <wui-flex flexDirection="column" alignItems="center">
          <wui-flex gap="1" alignItems="center" justifyContent="center">
            <wui-text variant="h5-medium" color="primary" data-testid="account-settings-address">
              ${U.getTruncateString({string:this.address,charsStart:4,charsEnd:6,truncate:"middle"})}
            </wui-text>
            <wui-icon-link
              size="md"
              icon="copy"
              iconColor="default"
              @click=${this.onCopyAddress}
            ></wui-icon-link>
          </wui-flex>
        </wui-flex>
      </wui-flex>
      <wui-flex flexDirection="column" gap="4">
        <wui-flex flexDirection="column" gap="2" .padding=${["6","4","3","4"]}>
          ${this.authCardTemplate()}
          <w3m-account-auth-button></w3m-account-auth-button>
          <wui-list-item
            imageSrc=${w(e)}
            ?chevron=${this.isAllowedNetworkSwitch()}
            ?fullSize=${!0}
            ?rounded=${!0}
            @click=${this.onNetworks.bind(this)}
            data-testid="account-switch-network-button"
          >
            <wui-text variant="lg-regular" color="primary">
              ${this.network?.name??"Unknown"}
            </wui-text>
          </wui-list-item>
          ${this.smartAccountSettingsTemplate()} ${this.chooseNameButtonTemplate()}
          <wui-list-item
            ?rounded=${!0}
            icon="power"
            iconColor="error"
            ?chevron=${!1}
            .loading=${this.disconnecting}
            @click=${this.onDisconnect.bind(this)}
            data-testid="disconnect-button"
          >
            <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
          </wui-list-item>
        </wui-flex>
      </wui-flex>
    `}chooseNameButtonTemplate(){const e=this.network?.chainNamespace,i=b.getConnectorId(e),o=b.getAuthConnector();return!d.checkIfNamesSupported()||!o||i!==C.CONNECTOR_ID.AUTH||this.profileName?null:l`
      <wui-list-item
        icon="id"
        ?rounded=${!0}
        ?chevron=${!0}
        @click=${this.onChooseName.bind(this)}
        data-testid="account-choose-name-button"
      >
        <wui-text variant="lg-regular" color="primary">Choose account name </wui-text>
      </wui-list-item>
    `}authCardTemplate(){const e=b.getConnectorId(this.network?.chainNamespace),i=b.getAuthConnector(),{origin:o}=location;return!i||e!==C.CONNECTOR_ID.AUTH||o.includes(O.SECURE_SITE)?null:l`
      <wui-notice-card
        @click=${this.onGoToUpgradeView.bind(this)}
        label="Upgrade your wallet"
        description="Transition to a self-custodial wallet"
        icon="wallet"
        data-testid="w3m-wallet-upgrade-card"
      ></wui-notice-card>
    `}isAllowedNetworkSwitch(){const e=d.getAllRequestedCaipNetworks(),i=e?e.length>1:!1,o=e?.find(({id:a})=>a===this.network?.id);return i||!o}onCopyAddress(){try{this.address&&(g.copyToClopboard(this.address),E.showSuccess("Address copied"))}catch{E.showError("Failed to copy")}}smartAccountSettingsTemplate(){const e=this.network?.chainNamespace,i=d.checkIfSmartAccountEnabled(),o=b.getConnectorId(e);return!b.getAuthConnector()||o!==C.CONNECTOR_ID.AUTH||!i?null:l`
      <wui-list-item
        icon="user"
        ?rounded=${!0}
        ?chevron=${!0}
        @click=${this.onSmartAccountSettings.bind(this)}
        data-testid="account-smart-account-settings-button"
      >
        <wui-text variant="lg-regular" color="primary">Smart Account Settings</wui-text>
      </wui-list-item>
    `}onChooseName(){h.push("ChooseAccountName")}onNetworks(){this.isAllowedNetworkSwitch()&&h.push("Networks")}async onDisconnect(){try{this.disconnecting=!0;const e=this.network?.chainNamespace,o=y.getConnections(e).length>0,a=e&&b.state.activeConnectorIds[e],n=this.remoteFeatures?.multiWallet;await y.disconnect(n?{id:a,namespace:e}:{}),o&&n&&(h.push("ProfileWallets"),E.showSuccess("Wallet deleted"))}catch{$.sendEvent({type:"track",event:"DISCONNECT_ERROR",properties:{message:"Failed to disconnect"}}),E.showError("Failed to disconnect")}finally{this.disconnecting=!1}}onGoToUpgradeView(){$.sendEvent({type:"track",event:"EMAIL_UPGRADE_FROM_MODAL"}),h.push("UpgradeEmailWallet")}onSmartAccountSettings(){h.push("SmartAccountSettings")}};je([u()],be.prototype,"address",void 0);je([u()],be.prototype,"profileImage",void 0);je([u()],be.prototype,"profileName",void 0);je([u()],be.prototype,"network",void 0);je([u()],be.prototype,"disconnecting",void 0);je([u()],be.prototype,"remoteFeatures",void 0);be=je([p("w3m-account-settings-view")],be);const cn=v`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:t})=>t[1]} ${({spacing:t})=>t[2]};
    column-gap: ${({spacing:t})=>t[1]};
    color: ${({tokens:t})=>t.theme.textSecondary};
    border-radius: ${({borderRadius:t})=>t[20]};
    background-color: transparent;
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:t})=>t.theme.textPrimary};
    background-color: ${({tokens:t})=>t.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:t})=>t.theme.textPrimary};
    }
  }
`;var lt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const dn={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},un={lg:"md",md:"sm",sm:"sm"};let Ie=class extends f{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return l`
      <button data-active=${this.active}>
        ${this.icon?l`<wui-icon size=${un[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${dn[this.size]}> ${this.label} </wui-text>
      </button>
    `}};Ie.styles=[I,R,cn];lt([c()],Ie.prototype,"icon",void 0);lt([c()],Ie.prototype,"size",void 0);lt([c()],Ie.prototype,"label",void 0);lt([c({type:Boolean})],Ie.prototype,"active",void 0);Ie=lt([p("wui-tab-item")],Ie);const hn=v`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    border-radius: ${({borderRadius:t})=>t[32]};
    padding: ${({spacing:t})=>t["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;var ct=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let _e=class extends f{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,i)=>{const o=i===this.activeTab;return l`
        <wui-tab-item
          @click=${()=>this.onTabClick(i)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${o}
          data-active=${o}
          data-testid="tab-${e.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};_e.styles=[I,R,hn];ct([c({type:Array})],_e.prototype,"tabs",void 0);ct([c()],_e.prototype,"onTabChange",void 0);ct([c()],_e.prototype,"size",void 0);ct([u()],_e.prototype,"activeTab",void 0);_e=ct([p("wui-tabs")],_e);const pn=v`
  wui-icon-link {
    margin-right: calc(${({spacing:t})=>t[8]} * -1);
  }

  wui-notice-card {
    margin-bottom: ${({spacing:t})=>t[1]};
  }

  wui-list-item > wui-text {
    flex: 1;
  }

  w3m-transactions-view {
    max-height: 200px;
  }

  .balance-container {
    display: inline;
  }

  .tab-content-container {
    height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .symbol {
    transform: translateY(-2px);
  }

  .tab-content-container::-webkit-scrollbar {
    display: none;
  }

  .account-button {
    width: auto;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:t})=>t[3]};
    height: 48px;
    padding: ${({spacing:t})=>t[2]};
    padding-right: ${({spacing:t})=>t[3]};
    box-shadow: inset 0 0 0 1px ${({tokens:t})=>t.theme.foregroundPrimary};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[6]};
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
  }

  .account-button:hover {
    background-color: ${({tokens:t})=>t.core.glass010};
  }

  .avatar-container {
    position: relative;
  }

  wui-avatar.avatar {
    width: 32px;
    height: 32px;
    box-shadow: 0 0 0 2px ${({tokens:t})=>t.core.glass010};
  }

  wui-wallet-switch {
    margin-top: ${({spacing:t})=>t[2]};
  }

  wui-avatar.network-avatar {
    width: 16px;
    height: 16px;
    position: absolute;
    left: 100%;
    top: 100%;
    transform: translate(-75%, -75%);
    box-shadow: 0 0 0 2px ${({tokens:t})=>t.core.glass010};
  }

  .account-links {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .account-links wui-flex {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    background: red;
    align-items: center;
    justify-content: center;
    height: 48px;
    padding: 10px;
    flex: 1 0 0;
    border-radius: var(--XS, 16px);
    border: 1px solid var(--dark-accent-glass-010, rgba(71, 161, 255, 0.1));
    background: var(--dark-accent-glass-010, rgba(71, 161, 255, 0.1));
    transition:
      background-color ${({durations:t})=>t.md}
        ${({easings:t})=>t["ease-out-power-1"]},
      opacity ${({durations:t})=>t.md} ${({easings:t})=>t["ease-out-power-1"]};
    will-change: background-color, opacity;
  }

  .account-links wui-flex:hover {
    background: var(--dark-accent-glass-015, rgba(71, 161, 255, 0.15));
  }

  .account-links wui-flex wui-icon {
    width: var(--S, 20px);
    height: var(--S, 20px);
  }

  .account-links wui-flex wui-icon svg path {
    stroke: #667dff;
  }
`;var te=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let z=class extends f{constructor(){super(),this.unsubscribe=[],this.caipAddress=d.getAccountData()?.caipAddress,this.address=g.getPlainAddress(d.getAccountData()?.caipAddress),this.profileImage=d.getAccountData()?.profileImage,this.profileName=d.getAccountData()?.profileName,this.disconnecting=!1,this.balance=d.getAccountData()?.balance,this.balanceSymbol=d.getAccountData()?.balanceSymbol,this.features=m.state.features,this.remoteFeatures=m.state.remoteFeatures,this.namespace=d.state.activeChain,this.activeConnectorIds=b.state.activeConnectorIds,this.unsubscribe.push(d.subscribeChainProp("accountState",e=>{this.address=g.getPlainAddress(e?.caipAddress),this.caipAddress=e?.caipAddress,this.balance=e?.balance,this.balanceSymbol=e?.balanceSymbol,this.profileName=e?.profileName,this.profileImage=e?.profileImage}),m.subscribeKey("features",e=>this.features=e),m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e),b.subscribeKey("activeConnectorIds",e=>{this.activeConnectorIds=e}),d.subscribeKey("activeChain",e=>this.namespace=e),d.subscribeKey("activeCaipNetwork",e=>{e?.chainNamespace&&(this.namespace=e?.chainNamespace)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(!this.caipAddress||!this.namespace)return null;const e=this.activeConnectorIds[this.namespace],i=e?b.getConnectorById(e):void 0,o=k.getConnectorImage(i),{value:a,decimals:n,symbol:r}=g.parseBalance(this.balance,this.balanceSymbol);return l`<wui-flex
        flexDirection="column"
        .padding=${["0","5","4","5"]}
        alignItems="center"
        gap="3"
      >
        <wui-avatar
          alt=${w(this.caipAddress)}
          address=${w(g.getPlainAddress(this.caipAddress))}
          imageSrc=${w(this.profileImage===null?void 0:this.profileImage)}
          data-testid="single-account-avatar"
        ></wui-avatar>
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          imageSrc=${o}
          alt=${i?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
        <div class="balance-container">
          <wui-text variant="h3-regular" color="primary">${a}</wui-text>
          <wui-text variant="h3-regular" color="secondary">.${n}</wui-text>
          <wui-text variant="h6-medium" color="primary" class="symbol">${r}</wui-text>
        </div>
        ${this.explorerBtnTemplate()}
      </wui-flex>

      <wui-flex flexDirection="column" gap="2" .padding=${["0","3","3","3"]}>
        ${this.authCardTemplate()} <w3m-account-auth-button></w3m-account-auth-button>
        ${this.orderedFeaturesTemplate()} ${this.activityTemplate()}
        <wui-list-item
          .rounded=${!0}
          icon="power"
          iconColor="error"
          ?chevron=${!1}
          .loading=${this.disconnecting}
          .rightIcon=${!1}
          @click=${this.onDisconnect.bind(this)}
          data-testid="disconnect-button"
        >
          <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>`}fundWalletTemplate(){if(!this.namespace)return null;const e=O.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),i=!!this.features?.receive,o=this.remoteFeatures?.onramp&&e,a=Y.isPayWithExchangeEnabled();return!o&&!i&&!a?null:l`
      <wui-list-item
        .rounded=${!0}
        data-testid="w3m-account-default-fund-wallet-button"
        iconVariant="blue"
        icon="dollar"
        ?chevron=${!0}
        @click=${this.handleClickFundWallet.bind(this)}
      >
        <wui-text variant="lg-regular" color="primary">Fund wallet</wui-text>
      </wui-list-item>
    `}orderedFeaturesTemplate(){return(this.features?.walletFeaturesOrder||O.DEFAULT_FEATURES.walletFeaturesOrder).map(i=>{switch(i){case"onramp":return this.fundWalletTemplate();case"swaps":return this.swapsTemplate();case"send":return this.sendTemplate();default:return null}})}activityTemplate(){return this.namespace&&this.remoteFeatures?.activity&&O.ACTIVITY_ENABLED_CHAIN_NAMESPACES.includes(this.namespace)?l` <wui-list-item
          .rounded=${!0}
          icon="clock"
          ?chevron=${!0}
          @click=${this.onTransactions.bind(this)}
          data-testid="w3m-account-default-activity-button"
        >
          <wui-text variant="lg-regular" color="primary">Activity</wui-text>
        </wui-list-item>`:null}swapsTemplate(){const e=this.remoteFeatures?.swaps,i=d.state.activeChain===C.CHAIN.EVM;return!e||!i?null:l`
      <wui-list-item
        .rounded=${!0}
        icon="recycleHorizontal"
        ?chevron=${!0}
        @click=${this.handleClickSwap.bind(this)}
        data-testid="w3m-account-default-swaps-button"
      >
        <wui-text variant="lg-regular" color="primary">Swap</wui-text>
      </wui-list-item>
    `}sendTemplate(){const e=this.features?.send,i=d.state.activeChain;if(!i)throw new Error("SendController:sendTemplate - namespace is required");const o=O.SEND_SUPPORTED_NAMESPACES.includes(i);return!e||!o?null:l`
      <wui-list-item
        .rounded=${!0}
        icon="send"
        ?chevron=${!0}
        @click=${this.handleClickSend.bind(this)}
        data-testid="w3m-account-default-send-button"
      >
        <wui-text variant="lg-regular" color="primary">Send</wui-text>
      </wui-list-item>
    `}authCardTemplate(){const e=d.state.activeChain;if(!e)throw new Error("AuthCardTemplate:authCardTemplate - namespace is required");const i=b.getConnectorId(e),o=b.getAuthConnector(),{origin:a}=location;return!o||i!==C.CONNECTOR_ID.AUTH||a.includes(O.SECURE_SITE)?null:l`
      <wui-notice-card
        @click=${this.onGoToUpgradeView.bind(this)}
        label="Upgrade your wallet"
        description="Transition to a self-custodial wallet"
        icon="wallet"
        data-testid="w3m-wallet-upgrade-card"
      ></wui-notice-card>
    `}handleClickFundWallet(){h.push("FundWallet")}handleClickSwap(){h.push("Swap")}handleClickSend(){h.push("WalletSend")}explorerBtnTemplate(){return d.getAccountData()?.addressExplorerUrl?l`
      <wui-button size="md" variant="accent-primary" @click=${this.onExplorer.bind(this)}>
        <wui-icon size="sm" color="inherit" slot="iconLeft" name="compass"></wui-icon>
        Block Explorer
        <wui-icon size="sm" color="inherit" slot="iconRight" name="externalLink"></wui-icon>
      </wui-button>
    `:null}onTransactions(){$.sendEvent({type:"track",event:"CLICK_TRANSACTIONS",properties:{isSmartAccount:ze(d.state.activeChain)===Fe.ACCOUNT_TYPES.SMART_ACCOUNT}}),h.push("Transactions")}async onDisconnect(){try{this.disconnecting=!0;const i=y.getConnections(this.namespace).length>0,o=this.namespace&&b.state.activeConnectorIds[this.namespace],a=this.remoteFeatures?.multiWallet;await y.disconnect(a?{id:o,namespace:this.namespace}:{}),i&&a&&(h.push("ProfileWallets"),E.showSuccess("Wallet deleted"))}catch{$.sendEvent({type:"track",event:"DISCONNECT_ERROR",properties:{message:"Failed to disconnect"}}),E.showError("Failed to disconnect")}finally{this.disconnecting=!1}}onExplorer(){const e=d.getAccountData()?.addressExplorerUrl;e&&g.openHref(e,"_blank")}onGoToUpgradeView(){$.sendEvent({type:"track",event:"EMAIL_UPGRADE_FROM_MODAL"}),h.push("UpgradeEmailWallet")}onGoToProfileWalletsView(){h.push("ProfileWallets")}};z.styles=pn;te([u()],z.prototype,"caipAddress",void 0);te([u()],z.prototype,"address",void 0);te([u()],z.prototype,"profileImage",void 0);te([u()],z.prototype,"profileName",void 0);te([u()],z.prototype,"disconnecting",void 0);te([u()],z.prototype,"balance",void 0);te([u()],z.prototype,"balanceSymbol",void 0);te([u()],z.prototype,"features",void 0);te([u()],z.prototype,"remoteFeatures",void 0);te([u()],z.prototype,"namespace",void 0);te([u()],z.prototype,"activeConnectorIds",void 0);z=te([p("w3m-account-default-widget")],z);const wn=v`
  span {
    font-weight: 500;
    font-size: 38px;
    color: ${({tokens:t})=>t.theme.textPrimary};
    line-height: 38px;
    letter-spacing: -2%;
    text-align: center;
    font-family: var(--apkt-fontFamily-regular);
  }

  .pennies {
    color: ${({tokens:t})=>t.theme.textSecondary};
  }
`;var ei=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let it=class extends f{constructor(){super(...arguments),this.dollars="0",this.pennies="00"}render(){return l`<span>$${this.dollars}<span class="pennies">.${this.pennies}</span></span>`}};it.styles=[I,wn];ei([c()],it.prototype,"dollars",void 0);ei([c()],it.prototype,"pennies",void 0);it=ei([p("wui-balance")],it);const fn=v`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
  }

  /* -- Variants --------------------------------------------------------- */
  :host([data-variant='fill']) {
    background-color: ${({colors:t})=>t.neutrals100};
  }

  :host([data-variant='shade']) {
    background-color: ${({colors:t})=>t.neutrals900};
  }

  :host([data-variant='fill']) > wui-text {
    color: ${({colors:t})=>t.black};
  }

  :host([data-variant='shade']) > wui-text {
    color: ${({colors:t})=>t.white};
  }

  :host([data-variant='fill']) > wui-icon {
    color: ${({colors:t})=>t.neutrals100};
  }

  :host([data-variant='shade']) > wui-icon {
    color: ${({colors:t})=>t.neutrals900};
  }

  /* -- Sizes --------------------------------------------------------- */
  :host([data-size='sm']) {
    padding: ${({spacing:t})=>t[1]} ${({spacing:t})=>t[2]};
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  :host([data-size='md']) {
    padding: ${({spacing:t})=>t[2]} ${({spacing:t})=>t[3]};
    border-radius: ${({borderRadius:t})=>t[3]};
  }

  /* -- Placements --------------------------------------------------------- */
  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }
`;var dt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const mn={sm:"sm-regular",md:"md-regular"};let Te=class extends f{constructor(){super(...arguments),this.placement="top",this.variant="fill",this.size="md",this.message=""}render(){return this.dataset.variant=this.variant,this.dataset.size=this.size,l`<wui-icon data-placement=${this.placement} size="inherit" name="cursor"></wui-icon>
      <wui-text variant=${mn[this.size]}>${this.message}</wui-text>`}};Te.styles=[I,R,fn];dt([c()],Te.prototype,"placement",void 0);dt([c()],Te.prototype,"variant",void 0);dt([c()],Te.prototype,"size",void 0);dt([c()],Te.prototype,"message",void 0);Te=dt([p("wui-tooltip")],Te);const bn=Z`
  :host {
    width: 100%;
    max-height: 280px;
    overflow: scroll;
    scrollbar-width: none;
  }

  :host::-webkit-scrollbar {
    display: none;
  }
`;var gn=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ut=class extends f{render(){return l`<w3m-activity-list page="account"></w3m-activity-list>`}};Ut.styles=bn;Ut=gn([p("w3m-account-activity-widget")],Ut);const yn=v`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${({spacing:t})=>t[4]};
    padding: ${({spacing:t})=>t[4]};
    background-color: transparent;
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  wui-text {
    max-width: 174px;
  }

  .tag-container {
    width: fit-content;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    }
  }
`;var Xe=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let ge=class extends f{constructor(){super(...arguments),this.icon="card",this.text="",this.description="",this.tag=void 0,this.disabled=!1}render(){return l`
      <button ?disabled=${this.disabled}>
        <wui-flex alignItems="center" gap="3">
          <wui-icon-box padding="2" color="secondary" icon=${this.icon} size="lg"></wui-icon-box>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.text}</wui-text>
            ${this.description?l`<wui-text variant="md-regular" color="secondary">
                  ${this.description}</wui-text
                >`:null}
          </wui-flex>
        </wui-flex>

        <wui-flex class="tag-container" alignItems="center" gap="1" justifyContent="flex-end">
          ${this.tag?l`<wui-tag tagType="main" size="sm">${this.tag}</wui-tag>`:null}
          <wui-icon size="md" name="chevronRight" color="default"></wui-icon>
        </wui-flex>
      </button>
    `}};ge.styles=[I,R,yn];Xe([c()],ge.prototype,"icon",void 0);Xe([c()],ge.prototype,"text",void 0);Xe([c()],ge.prototype,"description",void 0);Xe([c()],ge.prototype,"tag",void 0);Xe([c({type:Boolean})],ge.prototype,"disabled",void 0);ge=Xe([p("wui-list-description")],ge);const vn=Z`
  :host {
    width: 100%;
  }

  wui-flex {
    width: 100%;
  }

  .contentContainer {
    max-height: 280px;
    overflow: scroll;
    scrollbar-width: none;
  }

  .contentContainer::-webkit-scrollbar {
    display: none;
  }
`;var ti=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let nt=class extends f{constructor(){super(),this.unsubscribe=[],this.tokenBalance=d.getAccountData()?.tokenBalance,this.remoteFeatures=m.state.remoteFeatures,this.unsubscribe.push(d.subscribeChainProp("accountState",e=>{this.tokenBalance=e?.tokenBalance}),m.subscribeKey("remoteFeatures",e=>{this.remoteFeatures=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`${this.tokenTemplate()}`}tokenTemplate(){return this.tokenBalance&&this.tokenBalance?.length>0?l`<wui-flex class="contentContainer" flexDirection="column" gap="2">
        ${this.tokenItemTemplate()}
      </wui-flex>`:l` <wui-flex flexDirection="column">
      ${this.onRampTemplate()}
      <wui-list-description
        @click=${this.onReceiveClick.bind(this)}
        text="Receive funds"
        description="Scan the QR code and receive funds"
        icon="qrCode"
        iconColor="fg-200"
        iconBackgroundColor="fg-200"
        data-testid="w3m-account-receive-button"
      ></wui-list-description
    ></wui-flex>`}onRampTemplate(){return this.remoteFeatures?.onramp?l`<wui-list-description
        @click=${this.onBuyClick.bind(this)}
        text="Buy Crypto"
        description="Easy with card or bank account"
        icon="card"
        iconColor="success-100"
        iconBackgroundColor="success-100"
        tag="popular"
        data-testid="w3m-account-onramp-button"
      ></wui-list-description>`:l``}tokenItemTemplate(){return this.tokenBalance?.map(e=>l`<wui-list-token
          tokenName=${e.name}
          tokenImageUrl=${e.iconUrl}
          tokenAmount=${e.quantity.numeric}
          tokenValue=${e.value}
          tokenCurrency=${e.symbol}
        ></wui-list-token>`)}onReceiveClick(){h.push("WalletReceive")}onBuyClick(){$.sendEvent({type:"track",event:"SELECT_BUY_CRYPTO",properties:{isSmartAccount:ze(d.state.activeChain)===Fe.ACCOUNT_TYPES.SMART_ACCOUNT}}),h.push("OnRampProviders")}};nt.styles=vn;ti([u()],nt.prototype,"tokenBalance",void 0);ti([u()],nt.prototype,"remoteFeatures",void 0);nt=ti([p("w3m-account-tokens-widget")],nt);const xn=v`
  wui-flex {
    width: 100%;
  }

  wui-promo {
    position: absolute;
    top: -32px;
  }

  wui-profile-button {
    margin-top: calc(-1 * ${({spacing:t})=>t[4]});
  }

  wui-promo + wui-profile-button {
    margin-top: ${({spacing:t})=>t[4]};
  }

  wui-tabs {
    width: 100%;
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:t})=>t[3]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }
`;var re=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let q=class extends f{constructor(){super(...arguments),this.unsubscribe=[],this.network=d.state.activeCaipNetwork,this.profileName=d.getAccountData()?.profileName,this.address=d.getAccountData()?.address,this.currentTab=d.getAccountData()?.currentTab,this.tokenBalance=d.getAccountData()?.tokenBalance,this.features=m.state.features,this.namespace=d.state.activeChain,this.activeConnectorIds=b.state.activeConnectorIds,this.remoteFeatures=m.state.remoteFeatures}firstUpdated(){d.fetchTokenBalance(),this.unsubscribe.push(d.subscribeChainProp("accountState",e=>{e?.address?(this.address=e.address,this.profileName=e.profileName,this.currentTab=e.currentTab,this.tokenBalance=e.tokenBalance):N.close()}),b.subscribeKey("activeConnectorIds",e=>{this.activeConnectorIds=e}),d.subscribeKey("activeChain",e=>this.namespace=e),d.subscribeKey("activeCaipNetwork",e=>this.network=e),m.subscribeKey("features",e=>this.features=e),m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e)),this.watchSwapValues()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),clearInterval(this.watchTokenBalance)}render(){if(!this.address)throw new Error("w3m-account-features-widget: No account provided");if(!this.namespace)return null;const e=this.activeConnectorIds[this.namespace],i=e?b.getConnectorById(e):void 0,{icon:o,iconSize:a}=this.getAuthData();return l`<wui-flex
      flexDirection="column"
      .padding=${["0","3","4","3"]}
      alignItems="center"
      gap="4"
      data-testid="w3m-account-wallet-features-widget"
    >
      <wui-flex flexDirection="column" justifyContent="center" alignItems="center" gap="2">
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          icon=${o}
          iconSize=${a}
          alt=${i?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        ${this.tokenBalanceTemplate()}
      </wui-flex>
      ${this.orderedWalletFeatures()} ${this.tabsTemplate()} ${this.listContentTemplate()}
    </wui-flex>`}orderedWalletFeatures(){const e=this.features?.walletFeaturesOrder||O.DEFAULT_FEATURES.walletFeaturesOrder;if(e.every(n=>n==="send"||n==="receive"?!this.features?.[n]:n==="swaps"||n==="onramp"?!this.remoteFeatures?.[n]:!0))return null;const o=e.map(n=>n==="receive"||n==="onramp"?"fund":n),a=[...new Set(o)];return l`<wui-flex gap="2">
      ${a.map(n=>{switch(n){case"fund":return this.fundWalletTemplate();case"swaps":return this.swapsTemplate();case"send":return this.sendTemplate();default:return null}})}
    </wui-flex>`}fundWalletTemplate(){if(!this.namespace)return null;const e=O.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),i=this.features?.receive,o=this.remoteFeatures?.onramp&&e,a=Y.isPayWithExchangeEnabled();return!o&&!i&&!a?null:l`
      <w3m-tooltip-trigger text="Fund wallet">
        <wui-button
          data-testid="wallet-features-fund-wallet-button"
          @click=${this.onFundWalletClick.bind(this)}
          variant="accent-secondary"
          size="lg"
          fullWidth
        >
          <wui-icon name="dollar"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `}swapsTemplate(){const e=this.remoteFeatures?.swaps,i=d.state.activeChain===C.CHAIN.EVM;return!e||!i?null:l`
      <w3m-tooltip-trigger text="Swap">
        <wui-button
          fullWidth
          data-testid="wallet-features-swaps-button"
          @click=${this.onSwapClick.bind(this)}
          variant="accent-secondary"
          size="lg"
        >
          <wui-icon name="recycleHorizontal"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `}sendTemplate(){const e=this.features?.send,i=d.state.activeChain,o=O.SEND_SUPPORTED_NAMESPACES.includes(i);return!e||!o?null:l`
      <w3m-tooltip-trigger text="Send">
        <wui-button
          fullWidth
          data-testid="wallet-features-send-button"
          @click=${this.onSendClick.bind(this)}
          variant="accent-secondary"
          size="lg"
        >
          <wui-icon name="send"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `}watchSwapValues(){this.watchTokenBalance=setInterval(()=>d.fetchTokenBalance(e=>this.onTokenBalanceError(e)),1e4)}onTokenBalanceError(e){e instanceof Error&&e.cause instanceof Response&&e.cause.status===C.HTTP_STATUS_CODES.SERVICE_UNAVAILABLE&&clearInterval(this.watchTokenBalance)}listContentTemplate(){return this.currentTab===0?l`<w3m-account-tokens-widget></w3m-account-tokens-widget>`:this.currentTab===1?l`<w3m-account-activity-widget></w3m-account-activity-widget>`:l`<w3m-account-tokens-widget></w3m-account-tokens-widget>`}tokenBalanceTemplate(){if(this.tokenBalance&&this.tokenBalance?.length>=0){const e=g.calculateBalance(this.tokenBalance),{dollars:i="0",pennies:o="00"}=g.formatTokenBalance(e);return l`<wui-balance dollars=${i} pennies=${o}></wui-balance>`}return l`<wui-balance dollars="0" pennies="00"></wui-balance>`}tabsTemplate(){const e=Qt.getTabsByNamespace(d.state.activeChain);return e.length===0?null:l`<wui-tabs
      .onTabChange=${this.onTabChange.bind(this)}
      .activeTab=${this.currentTab}
      .tabs=${e}
    ></wui-tabs>`}onTabChange(e){d.setAccountProp("currentTab",e,this.namespace)}onFundWalletClick(){h.push("FundWallet")}onSwapClick(){this.network?.caipNetworkId&&!O.SWAP_SUPPORTED_NETWORKS.includes(this.network?.caipNetworkId)?h.push("UnsupportedChain",{swapUnsupportedChain:!0}):($.sendEvent({type:"track",event:"OPEN_SWAP",properties:{network:this.network?.caipNetworkId||"",isSmartAccount:ze(d.state.activeChain)===Fe.ACCOUNT_TYPES.SMART_ACCOUNT}}),h.push("Swap"))}getAuthData(){const e=me.getConnectedSocialProvider(),i=me.getConnectedSocialUsername(),a=b.getAuthConnector()?.provider.getEmail()??"";return{name:Gt.getAuthName({email:a,socialUsername:i,socialProvider:e}),icon:e??"mail",iconSize:e?"xl":"md"}}onGoToProfileWalletsView(){h.push("ProfileWallets")}onSendClick(){$.sendEvent({type:"track",event:"OPEN_SEND",properties:{network:this.network?.caipNetworkId||"",isSmartAccount:ze(d.state.activeChain)===Fe.ACCOUNT_TYPES.SMART_ACCOUNT}}),h.push("WalletSend")}};q.styles=xn;re([u()],q.prototype,"watchTokenBalance",void 0);re([u()],q.prototype,"network",void 0);re([u()],q.prototype,"profileName",void 0);re([u()],q.prototype,"address",void 0);re([u()],q.prototype,"currentTab",void 0);re([u()],q.prototype,"tokenBalance",void 0);re([u()],q.prototype,"features",void 0);re([u()],q.prototype,"namespace",void 0);re([u()],q.prototype,"activeConnectorIds",void 0);re([u()],q.prototype,"remoteFeatures",void 0);q=re([p("w3m-account-wallet-features-widget")],q);var Ti=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let zt=class extends f{constructor(){super(),this.unsubscribe=[],this.namespace=d.state.activeChain,this.unsubscribe.push(d.subscribeKey("activeChain",e=>{this.namespace=e}))}render(){if(!this.namespace)return null;const e=b.getConnectorId(this.namespace),i=b.getAuthConnector();return l`
      ${i&&e===C.CONNECTOR_ID.AUTH?this.walletFeaturesTemplate():this.defaultTemplate()}
    `}walletFeaturesTemplate(){return l`<w3m-account-wallet-features-widget></w3m-account-wallet-features-widget>`}defaultTemplate(){return l`<w3m-account-default-widget></w3m-account-default-widget>`}};Ti([u()],zt.prototype,"namespace",void 0);zt=Ti([p("w3m-account-view")],zt);const $n=v`
  wui-image {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  wui-icon:not(.custom-icon, .icon-badge) {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    border-radius: ${({borderRadius:t})=>t[2]};
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({spacing:t})=>t["01"]};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`;var V=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let P=class extends f{constructor(){super(...arguments),this.address="",this.profileName="",this.content=[],this.alt="",this.imageSrc="",this.icon=void 0,this.iconSize="md",this.iconBadge=void 0,this.iconBadgeSize="md",this.buttonVariant="neutral-primary",this.enableMoreButton=!1,this.charsStart=4,this.charsEnd=6}render(){return l`
      <wui-flex flexDirection="column" rowgap="2">
        ${this.topTemplate()} ${this.bottomTemplate()}
      </wui-flex>
    `}topTemplate(){return l`
      <wui-flex alignItems="flex-start" justifyContent="space-between">
        ${this.imageOrIconTemplate()}
        <wui-icon-link
          variant="secondary"
          size="md"
          icon="copy"
          @click=${this.dispatchCopyEvent}
        ></wui-icon-link>
        <wui-icon-link
          variant="secondary"
          size="md"
          icon="externalLink"
          @click=${this.dispatchExternalLinkEvent}
        ></wui-icon-link>
        ${this.enableMoreButton?l`<wui-icon-link
              variant="secondary"
              size="md"
              icon="threeDots"
              @click=${this.dispatchMoreButtonEvent}
              data-testid="wui-active-profile-wallet-item-more-button"
            ></wui-icon-link>`:null}
      </wui-flex>
    `}bottomTemplate(){return l` <wui-flex flexDirection="column">${this.contentTemplate()}</wui-flex> `}imageOrIconTemplate(){return this.icon?l`
        <wui-flex flexGrow="1" alignItems="center">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${this.iconBadge?l`<wui-icon
                  color="accent-primary"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>`:null}
          </wui-flex>
        </wui-flex>
      `:l`
      <wui-flex flexGrow="1" alignItems="center">
        <wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>
      </wui-flex>
    `}contentTemplate(){return this.content.length===0?null:l`
      <wui-flex flexDirection="column" rowgap="3">
        ${this.content.map(e=>this.labelAndTagTemplate(e))}
      </wui-flex>
    `}labelAndTagTemplate({address:e,profileName:i,label:o,description:a,enableButton:n,buttonType:r,buttonLabel:s,buttonVariant:x,tagVariant:S,tagLabel:_,alignItems:G="flex-end"}){return l`
      <wui-flex justifyContent="space-between" alignItems=${G} columngap="1">
        <wui-flex flexDirection="column" rowgap="01">
          ${o?l`<wui-text variant="sm-medium" color="secondary">${o}</wui-text>`:null}

          <wui-flex alignItems="center" columngap="1">
            <wui-text variant="md-regular" color="primary">
              ${U.getTruncateString({string:i||e,charsStart:i?16:this.charsStart,charsEnd:i?0:this.charsEnd,truncate:i?"end":"middle"})}
            </wui-text>

            ${S&&_?l`<wui-tag variant=${S} size="sm">${_}</wui-tag>`:null}
          </wui-flex>

          ${a?l`<wui-text variant="sm-regular" color="secondary">${a}</wui-text>`:null}
        </wui-flex>

        ${n?this.buttonTemplate({buttonType:r,buttonLabel:s,buttonVariant:x}):null}
      </wui-flex>
    `}buttonTemplate({buttonType:e,buttonLabel:i,buttonVariant:o}){return l`
      <wui-button
        size="sm"
        variant=${o}
        @click=${e==="disconnect"?this.dispatchDisconnectEvent.bind(this):this.dispatchSwitchEvent.bind(this)}
        data-testid=${e==="disconnect"?"wui-active-profile-wallet-item-disconnect-button":"wui-active-profile-wallet-item-switch-button"}
      >
        ${i}
      </wui-button>
    `}dispatchDisconnectEvent(){this.dispatchEvent(new CustomEvent("disconnect",{bubbles:!0,composed:!0}))}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("switch",{bubbles:!0,composed:!0}))}dispatchExternalLinkEvent(){this.dispatchEvent(new CustomEvent("externalLink",{bubbles:!0,composed:!0}))}dispatchMoreButtonEvent(){this.dispatchEvent(new CustomEvent("more",{bubbles:!0,composed:!0}))}dispatchCopyEvent(){this.dispatchEvent(new CustomEvent("copy",{bubbles:!0,composed:!0}))}};P.styles=[I,R,$n];V([c()],P.prototype,"address",void 0);V([c()],P.prototype,"profileName",void 0);V([c({type:Array})],P.prototype,"content",void 0);V([c()],P.prototype,"alt",void 0);V([c()],P.prototype,"imageSrc",void 0);V([c()],P.prototype,"icon",void 0);V([c()],P.prototype,"iconSize",void 0);V([c()],P.prototype,"iconBadge",void 0);V([c()],P.prototype,"iconBadgeSize",void 0);V([c()],P.prototype,"buttonVariant",void 0);V([c({type:Boolean})],P.prototype,"enableMoreButton",void 0);V([c({type:Number})],P.prototype,"charsStart",void 0);V([c({type:Number})],P.prototype,"charsEnd",void 0);P=V([p("wui-active-profile-wallet-item")],P);const Cn=v`
  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  .right-icon {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({spacing:t})=>t["01"]};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`;var D=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let T=class extends f{constructor(){super(...arguments),this.address="",this.profileName="",this.alt="",this.buttonLabel="",this.buttonVariant="accent-primary",this.imageSrc="",this.icon=void 0,this.iconSize="md",this.iconBadgeSize="md",this.rightIcon="signOut",this.rightIconSize="md",this.loading=!1,this.charsStart=4,this.charsEnd=6}render(){return l`
      <wui-flex alignItems="center" columngap="2">
        ${this.imageOrIconTemplate()} ${this.labelAndDescriptionTemplate()}
        ${this.buttonActionTemplate()}
      </wui-flex>
    `}imageOrIconTemplate(){return this.icon?l`
        <wui-flex alignItems="center" justifyContent="center" class="icon-box">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${this.iconBadge?l`<wui-icon
                  color="default"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>`:null}
          </wui-flex>
        </wui-flex>
      `:l`<wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>`}labelAndDescriptionTemplate(){return l`
      <wui-flex
        flexDirection="column"
        flexGrow="1"
        justifyContent="flex-start"
        alignItems="flex-start"
      >
        <wui-text variant="lg-regular" color="primary">
          ${U.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?16:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?"end":"middle"})}
        </wui-text>
      </wui-flex>
    `}buttonActionTemplate(){return l`
      <wui-flex columngap="1" alignItems="center" justifyContent="center">
        <wui-button
          size="sm"
          variant=${this.buttonVariant}
          .loading=${this.loading}
          @click=${this.handleButtonClick}
          data-testid="wui-inactive-profile-wallet-item-button"
        >
          ${this.buttonLabel}
        </wui-button>

        <wui-icon-link
          variant="secondary"
          size="md"
          icon=${w(this.rightIcon)}
          class="right-icon"
          @click=${this.handleIconClick}
        ></wui-icon-link>
      </wui-flex>
    `}handleButtonClick(){this.dispatchEvent(new CustomEvent("buttonClick",{bubbles:!0,composed:!0}))}handleIconClick(){this.dispatchEvent(new CustomEvent("iconClick",{bubbles:!0,composed:!0}))}};T.styles=[I,R,Cn];D([c()],T.prototype,"address",void 0);D([c()],T.prototype,"profileName",void 0);D([c()],T.prototype,"alt",void 0);D([c()],T.prototype,"buttonLabel",void 0);D([c()],T.prototype,"buttonVariant",void 0);D([c()],T.prototype,"imageSrc",void 0);D([c()],T.prototype,"icon",void 0);D([c()],T.prototype,"iconSize",void 0);D([c()],T.prototype,"iconBadge",void 0);D([c()],T.prototype,"iconBadgeSize",void 0);D([c()],T.prototype,"rightIcon",void 0);D([c()],T.prototype,"rightIconSize",void 0);D([c({type:Boolean})],T.prototype,"loading",void 0);D([c({type:Number})],T.prototype,"charsStart",void 0);D([c({type:Number})],T.prototype,"charsEnd",void 0);T=D([p("wui-inactive-profile-wallet-item")],T);const Lt={getAuthData(t){const e=t.connectorId===C.CONNECTOR_ID.AUTH;if(!e)return{isAuth:!1,icon:void 0,iconSize:void 0,name:void 0};const i=t?.auth?.name??me.getConnectedSocialProvider(),o=t?.auth?.username??me.getConnectedSocialUsername(),n=b.getAuthConnector()?.provider.getEmail()??"";return{isAuth:!0,icon:i??"mail",iconSize:i?"xl":"md",name:e?Gt.getAuthName({email:n,socialUsername:o,socialProvider:i}):void 0}}},Sn=v`
  :host {
    --connect-scroll--top-opacity: 0;
    --connect-scroll--bottom-opacity: 0;
  }

  .balance-amount {
    flex: 1;
  }

  .wallet-list {
    scrollbar-width: none;
    overflow-y: scroll;
    overflow-x: hidden;
    transition: opacity ${({easings:t})=>t["ease-out-power-1"]}
      ${({durations:t})=>t.md};
    will-change: opacity;
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
      rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
      black 40px,
      black calc(100% - 40px),
      rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
      rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
    );
  }

  .active-wallets {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  .active-wallets-box {
    height: 330px;
  }

  .empty-wallet-list-box {
    height: 400px;
  }

  .empty-box {
    width: 100%;
    padding: ${({spacing:t})=>t[4]};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  wui-separator {
    margin: ${({spacing:t})=>t[2]} 0 ${({spacing:t})=>t[2]} 0;
  }

  .active-connection {
    padding: ${({spacing:t})=>t[2]};
  }

  .recent-connection {
    padding: ${({spacing:t})=>t[2]} 0 ${({spacing:t})=>t[2]} 0;
  }

  @media (max-width: 430px) {
    .active-wallets-box,
    .empty-wallet-list-box {
      height: auto;
      max-height: clamp(360px, 470px, 80vh);
    }
  }
`;var K=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const X={ADDRESS_DISPLAY:{START:4,END:6},BADGE:{SIZE:"md",ICON:"lightbulb"},SCROLL_THRESHOLD:50,OPACITY_RANGE:[0,1]},Se={eip155:"ethereum",solana:"solana",bip122:"bitcoin",ton:"ton",tron:"tron"},kn=[{namespace:"eip155",icon:Se.eip155,label:"EVM"},{namespace:"solana",icon:Se.solana,label:"Solana"},{namespace:"bip122",icon:Se.bip122,label:"Bitcoin"},{namespace:"ton",icon:Se.ton,label:"Ton"},{namespace:"tron",icon:Se.tron,label:"Tron"}],En={eip155:{title:"Add EVM Wallet",description:"Add your first EVM wallet"},solana:{title:"Add Solana Wallet",description:"Add your first Solana wallet"},bip122:{title:"Add Bitcoin Wallet",description:"Add your first Bitcoin wallet"},ton:{title:"Add TON Wallet",description:"Add your first TON wallet"},tron:{title:"Add TRON Wallet",description:"Add your first TRON wallet"}};let L=class extends f{constructor(){super(),this.unsubscribers=[],this.currentTab=0,this.namespace=d.state.activeChain,this.namespaces=Array.from(d.state.chains.keys()),this.caipAddress=void 0,this.profileName=void 0,this.activeConnectorIds=b.state.activeConnectorIds,this.lastSelectedAddress="",this.lastSelectedConnectorId="",this.isSwitching=!1,this.caipNetwork=d.state.activeCaipNetwork,this.user=d.getAccountData()?.user,this.remoteFeatures=m.state.remoteFeatures,this.currentTab=this.namespace?this.namespaces.indexOf(this.namespace):0,this.caipAddress=d.getAccountData(this.namespace)?.caipAddress,this.profileName=d.getAccountData(this.namespace)?.profileName,this.unsubscribers.push(y.subscribeKey("connections",()=>this.onConnectionsChange()),y.subscribeKey("recentConnections",()=>this.requestUpdate()),b.subscribeKey("activeConnectorIds",e=>{this.activeConnectorIds=e}),d.subscribeKey("activeCaipNetwork",e=>this.caipNetwork=e),d.subscribeChainProp("accountState",e=>{this.user=e?.user}),m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e)),this.chainListener=d.subscribeChainProp("accountState",e=>{this.caipAddress=e?.caipAddress,this.profileName=e?.profileName},this.namespace)}disconnectedCallback(){this.unsubscribers.forEach(e=>e()),this.resizeObserver?.disconnect(),this.removeScrollListener(),this.chainListener?.()}firstUpdated(){const e=this.shadowRoot?.querySelector(".wallet-list");if(!e)return;const i=()=>this.updateScrollOpacity(e);requestAnimationFrame(i),e.addEventListener("scroll",i),this.resizeObserver=new ResizeObserver(i),this.resizeObserver.observe(e),i()}render(){const e=this.namespace;if(!e)throw new Error("Namespace is not set");return l`
      <wui-flex flexDirection="column" .padding=${["0","4","4","4"]} gap="4">
        ${this.renderTabs()} ${this.renderHeader(e)} ${this.renderConnections(e)}
        ${this.renderAddConnectionButton(e)}
      </wui-flex>
    `}renderTabs(){const e=this.namespaces.map(o=>kn.find(a=>a.namespace===o)).filter(Boolean);return e.length>1?l`
        <wui-tabs
          .onTabChange=${o=>this.handleTabChange(o)}
          .activeTab=${this.currentTab}
          .tabs=${e}
        ></wui-tabs>
      `:null}renderHeader(e){const o=this.getActiveConnections(e).flatMap(({accounts:a})=>a).length+(this.caipAddress?1:0);return l`
      <wui-flex alignItems="center" columngap="1">
        <wui-icon
          size="sm"
          name=${Se[e]??Se.eip155}
        ></wui-icon>
        <wui-text color="secondary" variant="lg-regular"
          >${o>1?"Wallets":"Wallet"}</wui-text
        >
        <wui-text
          color="primary"
          variant="lg-regular"
          class="balance-amount"
          data-testid="balance-amount"
        >
          ${o}
        </wui-text>
        <wui-link
          color="secondary"
          variant="secondary"
          @click=${()=>y.disconnect({namespace:e})}
          ?disabled=${!this.hasAnyConnections(e)}
          data-testid="disconnect-all-button"
        >
          Disconnect All
        </wui-link>
      </wui-flex>
    `}renderConnections(e){const i=this.hasAnyConnections(e);return l`
      <wui-flex flexDirection="column" class=${Ii({"wallet-list":!0,"active-wallets-box":i,"empty-wallet-list-box":!i})} rowgap="3">
        ${i?this.renderActiveConnections(e):this.renderEmptyState(e)}
      </wui-flex>
    `}renderActiveConnections(e){const i=this.getActiveConnections(e),o=this.activeConnectorIds[e],a=this.getPlainAddress();return l`
      ${a||o||i.length>0?l`<wui-flex
            flexDirection="column"
            .padding=${["4","0","4","0"]}
            class="active-wallets"
          >
            ${this.renderActiveProfile(e)} ${this.renderActiveConnectionsList(e)}
          </wui-flex>`:null}
      ${this.renderRecentConnections(e)}
    `}renderActiveProfile(e){const i=this.activeConnectorIds[e];if(!i)return null;const{connections:o}=he.getConnectionsData(e),a=b.getConnectorById(i),n=k.getConnectorImage(a),r=this.getPlainAddress();if(!r)return null;const s=e===C.CHAIN.BITCOIN,x=Lt.getAuthData({connectorId:i,accounts:[]}),S=this.getActiveConnections(e).flatMap(le=>le.accounts).length>0,_=o.find(le=>le.connectorId===i),G=_?.accounts.filter(le=>!Q.isLowerCaseMatch(le.address,r));return l`
      <wui-flex flexDirection="column" .padding=${["0","4","0","4"]}>
        <wui-active-profile-wallet-item
          address=${r}
          alt=${a?.name}
          .content=${this.getProfileContent({address:r,connections:o,connectorId:i,namespace:e})}
          .charsStart=${X.ADDRESS_DISPLAY.START}
          .charsEnd=${X.ADDRESS_DISPLAY.END}
          .icon=${x.icon}
          .iconSize=${x.iconSize}
          .iconBadge=${this.isSmartAccount(r)?X.BADGE.ICON:void 0}
          .iconBadgeSize=${this.isSmartAccount(r)?X.BADGE.SIZE:void 0}
          imageSrc=${n}
          ?enableMoreButton=${x.isAuth}
          @copy=${()=>this.handleCopyAddress(r)}
          @disconnect=${()=>this.handleDisconnect(e,i)}
          @switch=${()=>{s&&_&&G?.[0]&&this.handleSwitchWallet(_,G[0].address,e)}}
          @externalLink=${()=>this.handleExternalLink(r)}
          @more=${()=>this.handleMore()}
          data-testid="wui-active-profile-wallet-item"
        ></wui-active-profile-wallet-item>
        ${S?l`<wui-separator></wui-separator>`:null}
      </wui-flex>
    `}renderActiveConnectionsList(e){const i=this.getActiveConnections(e);return i.length===0?null:l`
      <wui-flex flexDirection="column" .padding=${["0","2","0","2"]}>
        ${this.renderConnectionList(i,!1,e)}
      </wui-flex>
    `}renderRecentConnections(e){const{recentConnections:i}=he.getConnectionsData(e);return i.flatMap(a=>a.accounts).length===0?null:l`
      <wui-flex flexDirection="column" .padding=${["0","2","0","2"]} rowGap="2">
        <wui-text color="secondary" variant="sm-medium" data-testid="recently-connected-text"
          >RECENTLY CONNECTED</wui-text
        >
        <wui-flex flexDirection="column" .padding=${["0","2","0","2"]}>
          ${this.renderConnectionList(i,!0,e)}
        </wui-flex>
      </wui-flex>
    `}renderConnectionList(e,i,o){return e.filter(a=>a.accounts.length>0).map((a,n)=>{const r=b.getConnectorById(a.connectorId),s=k.getConnectorImage(r)??"",x=Lt.getAuthData(a);return a.accounts.map((S,_)=>{const G=n!==0||_!==0,le=this.isAccountLoading(a.connectorId,S.address);return l`
            <wui-flex flexDirection="column">
              ${G?l`<wui-separator></wui-separator>`:null}
              <wui-inactive-profile-wallet-item
                address=${S.address}
                alt=${a.connectorId}
                buttonLabel=${i?"Connect":"Switch"}
                buttonVariant=${i?"neutral-secondary":"accent-secondary"}
                rightIcon=${i?"bin":"power"}
                rightIconSize="sm"
                class=${i?"recent-connection":"active-connection"}
                data-testid=${i?"recent-connection":"active-connection"}
                imageSrc=${s}
                .iconBadge=${this.isSmartAccount(S.address)?X.BADGE.ICON:void 0}
                .iconBadgeSize=${this.isSmartAccount(S.address)?X.BADGE.SIZE:void 0}
                .icon=${x.icon}
                .iconSize=${x.iconSize}
                .loading=${le}
                .showBalance=${!1}
                .charsStart=${X.ADDRESS_DISPLAY.START}
                .charsEnd=${X.ADDRESS_DISPLAY.END}
                @buttonClick=${()=>this.handleSwitchWallet(a,S.address,o)}
                @iconClick=${()=>this.handleWalletAction({connection:a,address:S.address,isRecentConnection:i,namespace:o})}
              ></wui-inactive-profile-wallet-item>
            </wui-flex>
          `})})}renderAddConnectionButton(e){if(!this.isMultiWalletEnabled()&&this.caipAddress||!this.hasAnyConnections(e))return null;const{title:i}=this.getChainLabelInfo(e);return l`
      <wui-list-item
        variant="icon"
        iconVariant="overlay"
        icon="plus"
        iconSize="sm"
        ?chevron=${!0}
        @click=${()=>this.handleAddConnection(e)}
        data-testid="add-connection-button"
      >
        <wui-text variant="md-medium" color="secondary">${i}</wui-text>
      </wui-list-item>
    `}renderEmptyState(e){const{title:i,description:o}=this.getChainLabelInfo(e);return l`
      <wui-flex alignItems="flex-start" class="empty-template" data-testid="empty-template">
        <wui-flex
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          rowgap="3"
          class="empty-box"
        >
          <wui-icon-box size="xl" icon="wallet" color="secondary"></wui-icon-box>

          <wui-flex flexDirection="column" alignItems="center" justifyContent="center" gap="1">
            <wui-text color="primary" variant="lg-regular" data-testid="empty-state-text"
              >No wallet connected</wui-text
            >
            <wui-text color="secondary" variant="md-regular" data-testid="empty-state-description"
              >${o}</wui-text
            >
          </wui-flex>

          <wui-link
            @click=${()=>this.handleAddConnection(e)}
            data-testid="empty-state-button"
            icon="plus"
          >
            ${i}
          </wui-link>
        </wui-flex>
      </wui-flex>
    `}handleTabChange(e){const i=this.namespaces[e];i&&(this.chainListener?.(),this.currentTab=this.namespaces.indexOf(i),this.namespace=i,this.caipAddress=d.getAccountData(i)?.caipAddress,this.profileName=d.getAccountData(i)?.profileName,this.chainListener=d.subscribeChainProp("accountState",o=>{this.caipAddress=o?.caipAddress},i))}async handleSwitchWallet(e,i,o){try{this.isSwitching=!0,this.lastSelectedConnectorId=e.connectorId,this.lastSelectedAddress=i,this.caipNetwork?.chainNamespace!==o&&e?.caipNetwork&&(b.setFilterByNamespace(o),await d.switchActiveNetwork(e?.caipNetwork)),await y.switchConnection({connection:e,address:i,namespace:o,closeModalOnConnect:!1,onChange({hasSwitchedAccount:n,hasSwitchedWallet:r}){r?E.showSuccess("Wallet switched"):n&&E.showSuccess("Account switched")}})}catch{E.showError("Failed to switch wallet")}finally{this.isSwitching=!1}}handleWalletAction(e){const{connection:i,address:o,isRecentConnection:a,namespace:n}=e;a?(me.deleteAddressFromConnection({connectorId:i.connectorId,address:o,namespace:n}),y.syncStorageConnections(),E.showSuccess("Wallet deleted")):this.handleDisconnect(n,i.connectorId)}async handleDisconnect(e,i){try{await y.disconnect({id:i,namespace:e}),E.showSuccess("Wallet disconnected")}catch{E.showError("Failed to disconnect wallet")}}handleCopyAddress(e){g.copyToClopboard(e),E.showSuccess("Address copied")}handleMore(){h.push("AccountSettings")}handleExternalLink(e){const i=this.caipNetwork?.blockExplorers?.default.url;i&&g.openHref(`${i}/address/${e}`,"_blank")}handleAddConnection(e){b.setFilterByNamespace(e),h.push("Connect",{addWalletForNamespace:e})}getChainLabelInfo(e){return En[e]??{title:"Add Wallet",description:"Add your first wallet"}}isSmartAccount(e){if(!this.namespace)return!1;const i=this.user?.accounts?.find(o=>o.type==="smartAccount");return i&&e?Q.isLowerCaseMatch(i.address,e):!1}getPlainAddress(){return this.caipAddress?g.getPlainAddress(this.caipAddress):void 0}getActiveConnections(e){const i=this.activeConnectorIds[e],{connections:o}=he.getConnectionsData(e),[a]=o.filter(x=>Q.isLowerCaseMatch(x.connectorId,i));if(!i)return o;const n=e===C.CHAIN.BITCOIN,{address:r}=this.caipAddress?qi.parseCaipAddress(this.caipAddress):{};let s=[...r?[r]:[]];return n&&a&&(s=a.accounts.map(x=>x.address)||[]),he.excludeConnectorAddressFromConnections({connectorId:i,addresses:s,connections:o})}hasAnyConnections(e){const i=this.getActiveConnections(e),{recentConnections:o}=he.getConnectionsData(e);return!!this.caipAddress||i.length>0||o.length>0}isAccountLoading(e,i){return Q.isLowerCaseMatch(this.lastSelectedConnectorId,e)&&Q.isLowerCaseMatch(this.lastSelectedAddress,i)&&this.isSwitching}getProfileContent(e){const{address:i,connections:o,connectorId:a,namespace:n}=e,[r]=o.filter(x=>Q.isLowerCaseMatch(x.connectorId,a));if(n===C.CHAIN.BITCOIN&&r?.accounts.every(x=>typeof x.type=="string"))return this.getBitcoinProfileContent(r.accounts,i);const s=Lt.getAuthData({connectorId:a,accounts:[]});return[{address:i,tagLabel:"Active",tagVariant:"success",enableButton:!0,profileName:this.profileName,buttonType:"disconnect",buttonLabel:"Disconnect",buttonVariant:"neutral-secondary",...s.isAuth?{description:this.isSmartAccount(i)?"Smart Account":"EOA Account"}:{}}]}getBitcoinProfileContent(e,i){const o=e.length>1,a=this.getPlainAddress();return e.map(n=>{const r=Q.isLowerCaseMatch(n.address,a);let s="PAYMENT";return n.type==="ordinal"&&(s="ORDINALS"),{address:n.address,tagLabel:Q.isLowerCaseMatch(n.address,i)?"Active":void 0,tagVariant:Q.isLowerCaseMatch(n.address,i)?"success":void 0,enableButton:!0,...o?{label:s,alignItems:"flex-end",buttonType:r?"disconnect":"switch",buttonLabel:r?"Disconnect":"Switch",buttonVariant:r?"neutral-secondary":"accent-secondary"}:{alignItems:"center",buttonType:"disconnect",buttonLabel:"Disconnect",buttonVariant:"neutral-secondary"}}})}removeScrollListener(){const e=this.shadowRoot?.querySelector(".wallet-list");e&&e.removeEventListener("scroll",()=>this.handleConnectListScroll())}handleConnectListScroll(){const e=this.shadowRoot?.querySelector(".wallet-list");e&&this.updateScrollOpacity(e)}isMultiWalletEnabled(){return!!this.remoteFeatures?.multiWallet}updateScrollOpacity(e){e.style.setProperty("--connect-scroll--top-opacity",mt.interpolate([0,X.SCROLL_THRESHOLD],X.OPACITY_RANGE,e.scrollTop).toString()),e.style.setProperty("--connect-scroll--bottom-opacity",mt.interpolate([0,X.SCROLL_THRESHOLD],X.OPACITY_RANGE,e.scrollHeight-e.scrollTop-e.offsetHeight).toString())}onConnectionsChange(){if(this.isMultiWalletEnabled()&&this.namespace){const{connections:e}=he.getConnectionsData(this.namespace);e.length===0&&h.reset("ProfileWallets")}this.requestUpdate()}};L.styles=Sn;K([u()],L.prototype,"currentTab",void 0);K([u()],L.prototype,"namespace",void 0);K([u()],L.prototype,"namespaces",void 0);K([u()],L.prototype,"caipAddress",void 0);K([u()],L.prototype,"profileName",void 0);K([u()],L.prototype,"activeConnectorIds",void 0);K([u()],L.prototype,"lastSelectedAddress",void 0);K([u()],L.prototype,"lastSelectedConnectorId",void 0);K([u()],L.prototype,"isSwitching",void 0);K([u()],L.prototype,"caipNetwork",void 0);K([u()],L.prototype,"user",void 0);K([u()],L.prototype,"remoteFeatures",void 0);L=K([p("w3m-profile-wallets-view")],L);var Ye=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Re=class extends f{constructor(){super(),this.unsubscribe=[],this.activeCaipNetwork=d.state.activeCaipNetwork,this.features=m.state.features,this.remoteFeatures=m.state.remoteFeatures,this.exchangesLoading=Y.state.isLoading,this.exchanges=Y.state.exchanges,this.unsubscribe.push(m.subscribeKey("features",e=>this.features=e),m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e),d.subscribeKey("activeCaipNetwork",e=>{this.activeCaipNetwork=e,this.setDefaultPaymentAsset()}),Y.subscribeKey("isLoading",e=>this.exchangesLoading=e),Y.subscribeKey("exchanges",e=>this.exchanges=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}async firstUpdated(){Y.isPayWithExchangeSupported()&&(await this.setDefaultPaymentAsset(),await Y.fetchExchanges())}render(){return l`
      <wui-flex flexDirection="column" .padding=${["1","3","3","3"]} gap="2">
        ${this.onrampTemplate()} ${this.receiveTemplate()} ${this.depositFromExchangeTemplate()}
      </wui-flex>
    `}async setDefaultPaymentAsset(){if(!this.activeCaipNetwork)return;const e=await Y.getAssetsForNetwork(this.activeCaipNetwork.caipNetworkId),i=e.find(o=>o.metadata.symbol==="USDC")||e[0];i&&Y.setPaymentAsset(i)}onrampTemplate(){if(!this.activeCaipNetwork)return null;const e=this.remoteFeatures?.onramp,i=O.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.activeCaipNetwork.chainNamespace);return!e||!i?null:l`
      <wui-list-item
        @click=${this.onBuyCrypto.bind(this)}
        icon="card"
        data-testid="wallet-features-onramp-button"
      >
        <wui-text variant="lg-regular" color="primary">Buy crypto</wui-text>
      </wui-list-item>
    `}depositFromExchangeTemplate(){return!this.activeCaipNetwork||!Y.isPayWithExchangeSupported()?null:l`
      <wui-list-item
        @click=${this.onDepositFromExchange.bind(this)}
        icon="arrowBottomCircle"
        data-testid="wallet-features-deposit-from-exchange-button"
        ?loading=${this.exchangesLoading}
        ?disabled=${this.exchangesLoading||!this.exchanges.length}
      >
        <wui-text variant="lg-regular" color="primary">Deposit from exchange</wui-text>
      </wui-list-item>
    `}receiveTemplate(){return!this.features?.receive?null:l`
      <wui-list-item
        @click=${this.onReceive.bind(this)}
        icon="qrCode"
        data-testid="wallet-features-receive-button"
      >
        <wui-text variant="lg-regular" color="primary">Receive funds</wui-text>
      </wui-list-item>
    `}onBuyCrypto(){h.push("OnRampProviders")}onReceive(){h.push("WalletReceive")}onDepositFromExchange(){Y.reset(),h.push("PayWithExchange",{redirectView:h.state.data?.redirectView})}};Ye([u()],Re.prototype,"activeCaipNetwork",void 0);Ye([u()],Re.prototype,"features",void 0);Ye([u()],Re.prototype,"remoteFeatures",void 0);Ye([u()],Re.prototype,"exchangesLoading",void 0);Ye([u()],Re.prototype,"exchanges",void 0);Re=Ye([p("w3m-fund-wallet-view")],Re);const An=v`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]},
      color ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      border ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      box-shadow ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]},
      width ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      height ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      transform ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]},
      opacity ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:t})=>t.neutrals300};
    border-radius: ${({borderRadius:t})=>t.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]},
      color ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      border ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      box-shadow ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]},
      width ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      height ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      transform ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]},
      opacity ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:t})=>t.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:t})=>t.core.iconAccentPrimary};
    background-color: ${({tokens:t})=>t.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:t})=>t.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:t})=>t.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:t})=>t.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:t})=>t.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:t})=>t.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:t})=>t.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:t})=>t.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:t})=>t.theme.textTertiary};
  }
`;var Wt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ve=class extends f{constructor(){super(...arguments),this.inputElementRef=Jt(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return l`
      <label data-size=${this.size}>
        <input
          ${Zt(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};Ve.styles=[I,R,An];Wt([c({type:Boolean})],Ve.prototype,"checked",void 0);Wt([c({type:Boolean})],Ve.prototype,"disabled",void 0);Wt([c()],Ve.prototype,"size",void 0);Ve=Wt([p("wui-toggle")],Ve);const In=v`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:t})=>t[2]};
    padding: ${({spacing:t})=>t[2]} ${({spacing:t})=>t[3]};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[4]};
    box-shadow: inset 0 0 0 1px ${({tokens:t})=>t.theme.foregroundPrimary};
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var Ri=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let gt=class extends f{constructor(){super(...arguments),this.checked=!1}render(){return l`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};gt.styles=[I,R,In];Ri([c({type:Boolean})],gt.prototype,"checked",void 0);gt=Ri([p("wui-certified-switch")],gt);const _n=v`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:t})=>t[3]};
    color: ${({tokens:t})=>t.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:t})=>t[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:t})=>t[4]};
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }
  }
`;var Wi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let yt=class extends f{constructor(){super(...arguments),this.inputComponentRef=Jt(),this.inputValue=""}render(){return l`
      <wui-input-text
        ${Zt(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?l`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(e){this.inputValue=e.detail||""}clearValue(){const i=this.inputComponentRef.value?.inputElementRef.value;i&&(i.value="",this.inputValue="",i.focus(),i.dispatchEvent(new Event("input")))}};yt.styles=[I,_n];Wi([c()],yt.prototype,"inputValue",void 0);yt=Wi([p("wui-search-bar")],yt);const Tn=v`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:t})=>t[2]};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:t})=>t.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var Ni=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let vt=class extends f{constructor(){super(...arguments),this.type="wallet"}render(){return l`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return this.type==="network"?l` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${Zi}`:l`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};vt.styles=[I,R,Tn];Ni([c()],vt.prototype,"type",void 0);vt=Ni([p("wui-card-select-loader")],vt);const Rn=Z`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var ie=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let F=class extends f{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&U.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&U.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&U.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&U.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&U.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&U.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&U.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&U.getSpacingStyles(this.margin,3)};
    `,l`<slot></slot>`}};F.styles=[I,Rn];ie([c()],F.prototype,"gridTemplateRows",void 0);ie([c()],F.prototype,"gridTemplateColumns",void 0);ie([c()],F.prototype,"justifyItems",void 0);ie([c()],F.prototype,"alignItems",void 0);ie([c()],F.prototype,"justifyContent",void 0);ie([c()],F.prototype,"alignContent",void 0);ie([c()],F.prototype,"columnGap",void 0);ie([c()],F.prototype,"rowGap",void 0);ie([c()],F.prototype,"gap",void 0);ie([c()],F.prototype,"padding",void 0);ie([c()],F.prototype,"margin",void 0);F=ie([p("wui-grid")],F);const Wn=v`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:t})=>t[2]};
    padding: ${({spacing:t})=>t[3]} ${({spacing:t})=>t[0]};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:t})=>t[4]}, 20px);
    transition:
      color ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-1"]},
      background-color ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-1"]},
      border-radius ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:t})=>t.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:t})=>t.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:t})=>t.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:t})=>t.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:t})=>t.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var ue=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let J=class extends f{constructor(){super(),this.observer=new IntersectionObserver(()=>{}),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(i=>{i.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){const e=this.wallet?.badge_type==="certified";return l`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${w(e?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${e?l`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():l`
      <wui-wallet-image
        size="lg"
        imageSrc=${w(this.imageSrc)}
        name=${w(this.wallet?.name)}
        .installed=${this.wallet?.installed??!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return l`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=k.getWalletImage(this.wallet),!this.imageSrc&&(this.imageLoading=!0,this.imageSrc=await k.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){!this.wallet||this.isImpressed||(this.isImpressed=!0,$.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:h.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};J.styles=Wn;ue([u()],J.prototype,"visible",void 0);ue([u()],J.prototype,"imageSrc",void 0);ue([u()],J.prototype,"imageLoading",void 0);ue([u()],J.prototype,"isImpressed",void 0);ue([c()],J.prototype,"explorerId",void 0);ue([c()],J.prototype,"walletQuery",void 0);ue([c()],J.prototype,"certified",void 0);ue([c()],J.prototype,"displayIndex",void 0);ue([c({type:Object})],J.prototype,"wallet",void 0);J=ue([p("w3m-all-wallets-list-item")],J);const Nn=v`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:t})=>t.xl};
    animation-timing-function: ${({easings:t})=>t["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:t})=>t[4]};
    padding-bottom: ${({spacing:t})=>t[4]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var ut=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const mi="local-paginator";let We=class extends f{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!A.state.wallets.length,this.wallets=A.state.wallets,this.mobileFullScreen=m.state.enableMobileFullScreen,this.unsubscribe.push(A.subscribeKey("wallets",e=>this.wallets=e))}firstUpdated(){this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.paginationObserver?.disconnect()}render(){return l`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;const e=this.shadowRoot?.querySelector("wui-grid");e&&(await A.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(e,i){return[...Array(e)].map(()=>l`
        <wui-card-select-loader type="wallet" id=${w(i)}></wui-card-select-loader>
      `)}walletsTemplate(){return tt.getWalletConnectWallets(this.wallets).map((e,i)=>l`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
          explorerId=${e.id}
          certified=${this.badge==="certified"}
          displayIndex=${i}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){const{wallets:e,recommended:i,featured:o,count:a,mobileFilteredOutWalletsLength:n}=A.state,r=window.innerWidth<352?3:4,s=e.length+i.length;let S=Math.ceil(s/r)*r-s+r;return S-=e.length?o.length%r:0,a===0&&o.length>0?null:a===0||[...o,...e,...i].length<a-(n??0)?this.shimmerTemplate(S,mi):null}createPaginationObserver(){const e=this.shadowRoot?.querySelector(`#${mi}`);e&&(this.paginationObserver=new IntersectionObserver(([i])=>{if(i?.isIntersecting&&!this.loading){const{page:o,count:a,wallets:n}=A.state;n.length<a&&A.fetchWalletsByPage({page:o+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){b.selectWalletConnector(e)}};We.styles=Nn;ut([u()],We.prototype,"loading",void 0);ut([u()],We.prototype,"wallets",void 0);ut([u()],We.prototype,"badge",void 0);ut([u()],We.prototype,"mobileFullScreen",void 0);We=ut([p("w3m-all-wallets-list")],We);const On=Z`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;var ht=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ne=class extends f{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=m.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?l`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await A.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){const{search:e}=A.state,i=tt.markWalletsAsInstalled(e),o=tt.filterWalletsByWcSupport(i);return o.length?l`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${o.map((a,n)=>l`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(a)}
              .wallet=${a}
              data-testid="wallet-search-item-${a.id}"
              explorerId=${a.id}
              certified=${this.badge==="certified"}
              walletQuery=${this.query}
              displayIndex=${n}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:l`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(e){b.selectWalletConnector(e)}};Ne.styles=On;ht([u()],Ne.prototype,"loading",void 0);ht([u()],Ne.prototype,"mobileFullScreen",void 0);ht([c()],Ne.prototype,"query",void 0);ht([c()],Ne.prototype,"badge",void 0);Ne=ht([p("w3m-all-wallets-search")],Ne);var ii=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let xt=class extends f{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=g.debounce(e=>{this.search=e})}render(){const e=this.search.length>=2;return l`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge==="certified"}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${e||this.badge?l`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:l`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge="certified",E.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return g.isMobile()?l`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){h.push("ConnectingWalletConnect")}};ii([u()],xt.prototype,"search",void 0);ii([u()],xt.prototype,"badge",void 0);xt=ii([p("w3m-all-wallets-view")],xt);const Pn=v`
  button {
    display: flex;
    gap: ${({spacing:t})=>t[1]};
    padding: ${({spacing:t})=>t[4]};
    width: 100%;
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[4]};
    justify-content: center;
    align-items: center;
  }

  :host([data-size='sm']) button {
    padding: ${({spacing:t})=>t[2]};
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  :host([data-size='md']) button {
    padding: ${({spacing:t})=>t[3]};
    border-radius: ${({borderRadius:t})=>t[3]};
  }

  button:hover {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  button:disabled {
    opacity: 0.5;
  }
`;var Qe=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let ye=class extends f{constructor(){super(...arguments),this.text="",this.disabled=!1,this.size="lg",this.icon="copy",this.tabIdx=void 0}render(){this.dataset.size=this.size;const e=`${this.size}-regular`;return l`
      <button ?disabled=${this.disabled} tabindex=${w(this.tabIdx)}>
        <wui-icon name=${this.icon} size=${this.size} color="default"></wui-icon>
        <wui-text align="center" variant=${e} color="primary">${this.text}</wui-text>
      </button>
    `}};ye.styles=[I,R,Pn];Qe([c()],ye.prototype,"text",void 0);Qe([c({type:Boolean})],ye.prototype,"disabled",void 0);Qe([c()],ye.prototype,"size",void 0);Qe([c()],ye.prototype,"icon",void 0);Qe([c()],ye.prototype,"tabIdx",void 0);ye=Qe([p("wui-list-button")],ye);const Dn=v`
  wui-separator {
    margin: ${({spacing:t})=>t[3]} calc(${({spacing:t})=>t[3]} * -1);
    width: calc(100% + ${({spacing:t})=>t[3]} * 2);
  }

  wui-email-input {
    width: 100%;
  }

  form {
    width: 100%;
    display: block;
    position: relative;
  }

  wui-icon-link,
  wui-loading-spinner {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  wui-icon-link {
    right: ${({spacing:t})=>t[2]};
  }

  wui-loading-spinner {
    right: ${({spacing:t})=>t[3]};
  }

  wui-text {
    margin: ${({spacing:t})=>t[2]} ${({spacing:t})=>t[3]}
      ${({spacing:t})=>t[0]} ${({spacing:t})=>t[3]};
  }
`;var Be=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let pe=class extends f{constructor(){super(),this.unsubscribe=[],this.formRef=Jt(),this.email="",this.loading=!1,this.error="",this.remoteFeatures=m.state.remoteFeatures,this.hasExceededUsageLimit=A.state.plan.hasExceededUsageLimit,this.unsubscribe.push(m.subscribeKey("remoteFeatures",e=>{this.remoteFeatures=e}),A.subscribeKey("plan",e=>this.hasExceededUsageLimit=e.hasExceededUsageLimit))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}firstUpdated(){this.formRef.value?.addEventListener("keydown",e=>{e.key==="Enter"&&this.onSubmitEmail(e)})}render(){const e=y.hasAnyConnection(C.CONNECTOR_ID.AUTH);return l`
      <form ${Zt(this.formRef)} @submit=${this.onSubmitEmail.bind(this)}>
        <wui-email-input
          @focus=${this.onFocusEvent.bind(this)}
          .disabled=${this.loading}
          @inputChange=${this.onEmailInputChange.bind(this)}
          tabIdx=${w(this.tabIdx)}
          ?disabled=${e||this.hasExceededUsageLimit}
        >
        </wui-email-input>

        ${this.submitButtonTemplate()}${this.loadingTemplate()}
        <input type="submit" hidden />
      </form>
      ${this.templateError()}
    `}submitButtonTemplate(){return!this.loading&&this.email.length>3?l`
          <wui-icon-link
            size="lg"
            icon="chevronRight"
            iconcolor="accent-100"
            @click=${this.onSubmitEmail.bind(this)}
          >
          </wui-icon-link>
        `:null}loadingTemplate(){return this.loading?l`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:null}templateError(){return this.error?l`<wui-text variant="sm-medium" color="error">${this.error}</wui-text>`:null}onEmailInputChange(e){this.email=e.detail.trim(),this.error=""}async onSubmitEmail(e){if(!Qt.isValidEmail(this.email)){Ai.open({displayMessage:Ki.ALERT_WARNINGS.INVALID_EMAIL.displayMessage},"warning");return}if(!C.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(o=>o===d.state.activeChain)){const o=d.getFirstCaipNetworkSupportsAuthConnector();if(o){h.push("SwitchNetwork",{network:o});return}}try{if(this.loading)return;this.loading=!0,e.preventDefault();const o=b.getAuthConnector();if(!o)throw new Error("w3m-email-login-widget: Auth connector not found");const{action:a}=await o.provider.connectEmail({email:this.email});if($.sendEvent({type:"track",event:"EMAIL_SUBMITTED"}),a==="VERIFY_OTP")$.sendEvent({type:"track",event:"EMAIL_VERIFICATION_CODE_SENT"}),h.push("EmailVerifyOtp",{email:this.email});else if(a==="VERIFY_DEVICE")h.push("EmailVerifyDevice",{email:this.email});else if(a==="CONNECT"){const n=this.remoteFeatures?.multiWallet;await y.connectExternal(o,d.state.activeChain),n?(h.replace("ProfileWallets"),E.showSuccess("New Wallet Added")):h.replace("Account")}}catch(o){g.parseError(o)?.includes("Invalid email")?this.error="Invalid email. Try again.":E.showError(o)}finally{this.loading=!1}}onFocusEvent(){$.sendEvent({type:"track",event:"EMAIL_LOGIN_SELECTED"})}};pe.styles=Dn;Be([c()],pe.prototype,"tabIdx",void 0);Be([u()],pe.prototype,"email",void 0);Be([u()],pe.prototype,"loading",void 0);Be([u()],pe.prototype,"error",void 0);Be([u()],pe.prototype,"remoteFeatures",void 0);Be([u()],pe.prototype,"hasExceededUsageLimit",void 0);pe=Be([p("w3m-email-login-widget")],pe);const Ln=v`
  :host {
    display: block;
    width: 100%;
  }

  button {
    width: 100%;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background: ${({tokens:t})=>t.theme.foregroundSecondary};
    }
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;var Nt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let He=class extends f{constructor(){super(...arguments),this.logo="google",this.disabled=!1,this.tabIdx=void 0}render(){return l`
      <button ?disabled=${this.disabled} tabindex=${w(this.tabIdx)}>
        <wui-icon size="xxl" name=${this.logo}></wui-icon>
      </button>
    `}};He.styles=[I,R,Ln];Nt([c()],He.prototype,"logo",void 0);Nt([c({type:Boolean})],He.prototype,"disabled",void 0);Nt([c()],He.prototype,"tabIdx",void 0);He=Nt([p("wui-logo-select")],He);const jn=v`
  wui-separator {
    margin: ${({spacing:t})=>t[3]} calc(${({spacing:t})=>t[3]} * -1)
      ${({spacing:t})=>t[3]} calc(${({spacing:t})=>t[3]} * -1);
    width: calc(100% + ${({spacing:t})=>t[3]} * 2);
  }
`;var Ce=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const bi=2,gi=6;let ce=class extends f{constructor(){super(),this.unsubscribe=[],this.walletGuide="get-started",this.tabIdx=void 0,this.connectors=b.state.connectors,this.remoteFeatures=m.state.remoteFeatures,this.authConnector=this.connectors.find(e=>e.type==="AUTH"),this.isPwaLoading=!1,this.hasExceededUsageLimit=A.state.plan.hasExceededUsageLimit,this.unsubscribe.push(b.subscribeKey("connectors",e=>{this.connectors=e,this.authConnector=this.connectors.find(i=>i.type==="AUTH")}),m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e),A.subscribeKey("plan",e=>this.hasExceededUsageLimit=e.hasExceededUsageLimit))}connectedCallback(){super.connectedCallback(),this.handlePwaFrameLoad()}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-flex
        class="container"
        flexDirection="column"
        gap="2"
        data-testid="w3m-social-login-widget"
      >
        ${this.topViewTemplate()}${this.bottomViewTemplate()}
      </wui-flex>
    `}topViewTemplate(){const e=this.walletGuide==="explore";let i=this.remoteFeatures?.socials;return!i&&e?(i=O.DEFAULT_SOCIALS,this.renderTopViewContent(i)):i?this.renderTopViewContent(i):null}renderTopViewContent(e){return e.length===2?l` <wui-flex gap="2">
        ${e.slice(0,bi).map(i=>l`<wui-logo-select
              data-testid=${`social-selector-${i}`}
              @click=${()=>{this.onSocialClick(i)}}
              logo=${i}
              tabIdx=${w(this.tabIdx)}
              ?disabled=${this.isPwaLoading||this.hasConnection()}
            ></wui-logo-select>`)}
      </wui-flex>`:l` <wui-list-button
      data-testid=${`social-selector-${e[0]}`}
      @click=${()=>{this.onSocialClick(e[0])}}
      size="lg"
      icon=${w(e[0])}
      text=${`Continue with ${U.capitalize(e[0])}`}
      tabIdx=${w(this.tabIdx)}
      ?disabled=${this.isPwaLoading||this.hasConnection()}
    ></wui-list-button>`}bottomViewTemplate(){let e=this.remoteFeatures?.socials;const i=this.walletGuide==="explore";return(!this.authConnector||!e||e.length===0)&&i&&(e=O.DEFAULT_SOCIALS),!e||e.length<=bi?null:e&&e.length>gi?l`<wui-flex gap="2">
        ${e.slice(1,gi-1).map(a=>l`<wui-logo-select
              data-testid=${`social-selector-${a}`}
              @click=${()=>{this.onSocialClick(a)}}
              logo=${a}
              tabIdx=${w(this.tabIdx)}
              ?focusable=${this.tabIdx!==void 0&&this.tabIdx>=0}
              ?disabled=${this.isPwaLoading||this.hasConnection()}
            ></wui-logo-select>`)}
        <wui-logo-select
          logo="more"
          tabIdx=${w(this.tabIdx)}
          @click=${this.onMoreSocialsClick.bind(this)}
          ?disabled=${this.isPwaLoading||this.hasConnection()}
          data-testid="social-selector-more"
        ></wui-logo-select>
      </wui-flex>`:e?l`<wui-flex gap="2">
      ${e.slice(1,e.length).map(a=>l`<wui-logo-select
            data-testid=${`social-selector-${a}`}
            @click=${()=>{this.onSocialClick(a)}}
            logo=${a}
            tabIdx=${w(this.tabIdx)}
            ?focusable=${this.tabIdx!==void 0&&this.tabIdx>=0}
            ?disabled=${this.isPwaLoading||this.hasConnection()}
          ></wui-logo-select>`)}
    </wui-flex>`:null}onMoreSocialsClick(){h.push("ConnectSocials")}async onSocialClick(e){if(this.hasExceededUsageLimit){h.push("UsageExceeded");return}if(!C.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(o=>o===d.state.activeChain)){const o=d.getFirstCaipNetworkSupportsAuthConnector();if(o){h.push("SwitchNetwork",{network:o});return}}e&&await en(e)}async handlePwaFrameLoad(){if(g.isPWA()){this.isPwaLoading=!0;try{this.authConnector?.provider instanceof Gi&&await this.authConnector.provider.init()}catch(e){Ai.open({displayMessage:"Error loading embedded wallet in PWA",debugMessage:e.message},"error")}finally{this.isPwaLoading=!1}}}hasConnection(){return y.hasAnyConnection(C.CONNECTOR_ID.AUTH)}};ce.styles=jn;Ce([c()],ce.prototype,"walletGuide",void 0);Ce([c()],ce.prototype,"tabIdx",void 0);Ce([u()],ce.prototype,"connectors",void 0);Ce([u()],ce.prototype,"remoteFeatures",void 0);Ce([u()],ce.prototype,"authConnector",void 0);Ce([u()],ce.prototype,"isPwaLoading",void 0);Ce([u()],ce.prototype,"hasExceededUsageLimit",void 0);ce=Ce([p("w3m-social-login-widget")],ce);var Je=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Oe=class extends f{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=b.state.connectors,this.count=A.state.count,this.filteredCount=A.state.filteredWallets.length,this.isFetchingRecommendedWallets=A.state.isFetchingRecommendedWallets,this.unsubscribe.push(b.subscribeKey("connectors",e=>this.connectors=e),A.subscribeKey("count",e=>this.count=e),A.subscribeKey("filteredWallets",e=>this.filteredCount=e.length),A.subscribeKey("isFetchingRecommendedWallets",e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.connectors.find(S=>S.id==="walletConnect"),{allWallets:i}=m.state;if(!e||i==="HIDE"||i==="ONLY_MOBILE"&&!g.isMobile())return null;const o=A.state.featured.length,a=this.count+o,n=a<10?a:Math.floor(a/10)*10,r=this.filteredCount>0?this.filteredCount:n;let s=`${r}`;this.filteredCount>0?s=`${this.filteredCount}`:r<a&&(s=`${r}+`);const x=y.hasAnyConnection(C.CONNECTOR_ID.WALLET_CONNECT);return l`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${s}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${w(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${x}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){$.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),h.push("AllWallets",{redirectView:h.state.data?.redirectView})}};Je([c()],Oe.prototype,"tabIdx",void 0);Je([u()],Oe.prototype,"connectors",void 0);Je([u()],Oe.prototype,"count",void 0);Je([u()],Oe.prototype,"filteredCount",void 0);Je([u()],Oe.prototype,"isFetchingRecommendedWallets",void 0);Oe=Je([p("w3m-all-wallets-widget")],Oe);const Bn=v`
  :host {
    margin-top: ${({spacing:t})=>t[1]};
  }
  wui-separator {
    margin: ${({spacing:t})=>t[3]} calc(${({spacing:t})=>t[3]} * -1)
      ${({spacing:t})=>t[2]} calc(${({spacing:t})=>t[3]} * -1);
    width: calc(100% + ${({spacing:t})=>t[3]} * 2);
  }
`;var Ze=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let ve=class extends f{constructor(){super(),this.unsubscribe=[],this.explorerWallets=A.state.explorerWallets,this.connections=y.state.connections,this.connectorImages=ke.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(y.subscribeKey("connections",e=>this.connections=e),ke.subscribeKey("connectorImages",e=>this.connectorImages=e),A.subscribeKey("explorerFilteredWallets",e=>{this.explorerWallets=e?.length?e:A.state.explorerWallets}),A.subscribeKey("explorerWallets",e=>{this.explorerWallets?.length||(this.explorerWallets=e)})),g.isTelegram()&&g.isIos()&&(this.loadingTelegram=!y.state.wcUri,this.unsubscribe.push(y.subscribeKey("wcUri",e=>this.loadingTelegram=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){return Gt.connectorList().map((e,i)=>e.kind==="connector"?this.renderConnector(e,i):this.renderWallet(e,i))}getConnectorNamespaces(e){return e.subtype==="walletConnect"?[]:e.subtype==="multiChain"?e.connector.connectors?.map(i=>i.chain)||[]:[e.connector.chain]}renderConnector(e,i){const o=e.connector,a=k.getConnectorImage(o)||this.connectorImages[o?.imageId??""],r=(this.connections.get(o.chain)??[]).some(G=>Q.isLowerCaseMatch(G.connectorId,o.id));let s,x;e.subtype==="walletConnect"?(s="qr code",x="accent"):e.subtype==="injected"||e.subtype==="announced"?(s=r?"connected":"installed",x=r?"info":"success"):(s=void 0,x=void 0);const S=y.hasAnyConnection(C.CONNECTOR_ID.WALLET_CONNECT),_=e.subtype==="walletConnect"||e.subtype==="external"?S:!1;return l`
      <w3m-list-wallet
        displayIndex=${i}
        imageSrc=${w(a)}
        .installed=${!0}
        name=${o.name??"Unknown"}
        .tagVariant=${x}
        tagLabel=${w(s)}
        data-testid=${`wallet-selector-${o.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(e)}
        tabIdx=${w(this.tabIdx)}
        ?disabled=${_}
        rdnsId=${w(o.explorerWallet?.rdns||void 0)}
        walletRank=${w(o.explorerWallet?.order)}
        .namespaces=${this.getConnectorNamespaces(e)}
      >
      </w3m-list-wallet>
    `}onClickConnector(e){const i=h.state.data?.redirectView;if(e.subtype==="walletConnect"){b.setActiveConnector(e.connector),g.isMobile()?h.push("AllWallets"):h.push("ConnectingWalletConnect",{redirectView:i});return}if(e.subtype==="multiChain"){b.setActiveConnector(e.connector),h.push("ConnectingMultiChain",{redirectView:i});return}if(e.subtype==="injected"){b.setActiveConnector(e.connector),h.push("ConnectingExternal",{connector:e.connector,redirectView:i,wallet:e.connector.explorerWallet});return}if(e.subtype==="announced"){if(e.connector.id==="walletConnect"){g.isMobile()?h.push("AllWallets"):h.push("ConnectingWalletConnect",{redirectView:i});return}h.push("ConnectingExternal",{connector:e.connector,redirectView:i,wallet:e.connector.explorerWallet});return}h.push("ConnectingExternal",{connector:e.connector,redirectView:i})}renderWallet(e,i){const o=e.wallet,a=k.getWalletImage(o),r=y.hasAnyConnection(C.CONNECTOR_ID.WALLET_CONNECT),s=this.loadingTelegram,x=e.subtype==="recent"?"recent":void 0,S=e.subtype==="recent"?"info":void 0;return l`
      <w3m-list-wallet
        displayIndex=${i}
        imageSrc=${w(a)}
        name=${o.name??"Unknown"}
        @click=${()=>this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${o.id}`}
        tabIdx=${w(this.tabIdx)}
        ?loading=${s}
        ?disabled=${r}
        rdnsId=${w(o.rdns||void 0)}
        walletRank=${w(o.order)}
        tagLabel=${w(x)}
        .tagVariant=${S}
      >
      </w3m-list-wallet>
    `}onClickWallet(e){const i=h.state.data?.redirectView,o=d.state.activeChain;if(e.subtype==="featured"){b.selectWalletConnector(e.wallet);return}if(e.subtype==="recent"){if(this.loadingTelegram)return;b.selectWalletConnector(e.wallet);return}if(e.subtype==="custom"){if(this.loadingTelegram)return;h.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:i});return}if(this.loadingTelegram)return;const a=o?b.getConnector({id:e.wallet.id,namespace:o}):void 0;a?h.push("ConnectingExternal",{connector:a,redirectView:i}):h.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:i})}};ve.styles=Bn;Ze([c({type:Number})],ve.prototype,"tabIdx",void 0);Ze([u()],ve.prototype,"explorerWallets",void 0);Ze([u()],ve.prototype,"connections",void 0);Ze([u()],ve.prototype,"connectorImages",void 0);Ze([u()],ve.prototype,"loadingTelegram",void 0);ve=Ze([p("w3m-connector-list")],ve);var Oi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ft=class extends f{constructor(){super(...arguments),this.tabIdx=void 0}render(){return l`
      <wui-flex flexDirection="column" gap="2">
        <w3m-connector-list tabIdx=${w(this.tabIdx)}></w3m-connector-list>
        <w3m-all-wallets-widget tabIdx=${w(this.tabIdx)}></w3m-all-wallets-widget>
      </wui-flex>
    `}};Oi([c()],Ft.prototype,"tabIdx",void 0);Ft=Oi([p("w3m-wallet-login-list")],Ft);const Un=v`
  :host {
    --connect-scroll--top-opacity: 0;
    --connect-scroll--bottom-opacity: 0;
    --connect-mask-image: none;
  }

  .connect {
    max-height: clamp(360px, 470px, 80vh);
    scrollbar-width: none;
    overflow-y: scroll;
    overflow-x: hidden;
    transition: opacity ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: opacity;
    mask-image: var(--connect-mask-image);
  }

  .guide {
    transition: opacity ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: opacity;
  }

  .connect::-webkit-scrollbar {
    display: none;
  }

  .all-wallets {
    flex-flow: column;
  }

  .connect.disabled,
  .guide.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }

  wui-separator {
    margin: ${({spacing:t})=>t[3]} calc(${({spacing:t})=>t[3]} * -1);
    width: calc(100% + ${({spacing:t})=>t[3]} * 2);
  }
`;var ne=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const zn=470;let M=class extends f{constructor(){super(),this.unsubscribe=[],this.connectors=b.state.connectors,this.authConnector=this.connectors.find(e=>e.type==="AUTH"),this.features=m.state.features,this.remoteFeatures=m.state.remoteFeatures,this.enableWallets=m.state.enableWallets,this.noAdapters=d.state.noAdapters,this.walletGuide="get-started",this.checked=bt.state.isLegalCheckboxChecked,this.isEmailEnabled=this.remoteFeatures?.email&&!d.state.noAdapters,this.isSocialEnabled=this.remoteFeatures?.socials&&this.remoteFeatures.socials.length>0&&!d.state.noAdapters,this.isAuthEnabled=this.checkIfAuthEnabled(this.connectors),this.unsubscribe.push(b.subscribeKey("connectors",e=>{this.connectors=e,this.authConnector=this.connectors.find(i=>i.type==="AUTH"),this.isAuthEnabled=this.checkIfAuthEnabled(this.connectors)}),m.subscribeKey("features",e=>{this.features=e}),m.subscribeKey("remoteFeatures",e=>{this.remoteFeatures=e,this.setEmailAndSocialEnableCheck(this.noAdapters,this.remoteFeatures)}),m.subscribeKey("enableWallets",e=>this.enableWallets=e),d.subscribeKey("noAdapters",e=>this.setEmailAndSocialEnableCheck(e,this.remoteFeatures)),bt.subscribeKey("isLegalCheckboxChecked",e=>this.checked=e))}disconnectedCallback(){this.unsubscribe.forEach(i=>i()),this.resizeObserver?.disconnect(),this.shadowRoot?.querySelector(".connect")?.removeEventListener("scroll",this.handleConnectListScroll.bind(this))}firstUpdated(){const e=this.shadowRoot?.querySelector(".connect");e&&(requestAnimationFrame(this.handleConnectListScroll.bind(this)),e?.addEventListener("scroll",this.handleConnectListScroll.bind(this)),this.resizeObserver=new ResizeObserver(()=>{this.handleConnectListScroll()}),this.resizeObserver?.observe(e),this.handleConnectListScroll())}render(){const{termsConditionsUrl:e,privacyPolicyUrl:i}=m.state,o=m.state.features?.legalCheckbox,r=!!(e||i)&&!!o&&this.walletGuide==="get-started"&&!this.checked,s={connect:!0,disabled:r},x=m.state.enableWalletGuide,S=this.enableWallets,_=this.isSocialEnabled||this.authConnector,G=r?-1:void 0;return l`
      <wui-flex flexDirection="column">
        ${this.legalCheckboxTemplate()}
        <wui-flex
          data-testid="w3m-connect-scroll-view"
          flexDirection="column"
          .padding=${["0","0","4","0"]}
          class=${Ii(s)}
        >
          <wui-flex
            class="connect-methods"
            flexDirection="column"
            gap="2"
            .padding=${_&&S&&x&&this.walletGuide==="get-started"?["0","3","0","3"]:["0","3","3","3"]}
          >
            ${this.renderConnectMethod(G)}
          </wui-flex>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `}reownBrandingTemplate(){return Qt.hasFooter()||!this.remoteFeatures?.reownBranding?null:l`<wui-ux-by-reown></wui-ux-by-reown>`}setEmailAndSocialEnableCheck(e,i){this.isEmailEnabled=i?.email&&!e,this.isSocialEnabled=i?.socials&&i.socials.length>0&&!e,this.remoteFeatures=i,this.noAdapters=e}checkIfAuthEnabled(e){const i=e.filter(a=>a.type===Xi.CONNECTOR_TYPE_AUTH).map(a=>a.chain);return C.AUTH_CONNECTOR_SUPPORTED_CHAINS.some(a=>i.includes(a))}renderConnectMethod(e){const i=tt.getConnectOrderMethod(this.features,this.connectors);return l`${i.map((o,a)=>{switch(o){case"email":return l`${this.emailTemplate(e)} ${this.separatorTemplate(a,"email")}`;case"social":return l`${this.socialListTemplate(e)}
          ${this.separatorTemplate(a,"social")}`;case"wallet":return l`${this.walletListTemplate(e)}
          ${this.separatorTemplate(a,"wallet")}`;default:return null}})}`}checkMethodEnabled(e){switch(e){case"wallet":return this.enableWallets;case"social":return this.isSocialEnabled&&this.isAuthEnabled;case"email":return this.isEmailEnabled&&this.isAuthEnabled;default:return null}}checkIsThereNextMethod(e){const o=tt.getConnectOrderMethod(this.features,this.connectors)[e+1];return o?this.checkMethodEnabled(o)?o:this.checkIsThereNextMethod(e+1):void 0}separatorTemplate(e,i){const o=this.checkIsThereNextMethod(e),a=this.walletGuide==="explore";switch(i){case"wallet":return this.enableWallets&&o&&!a?l`<wui-separator data-testid="wui-separator" text="or"></wui-separator>`:null;case"email":{const n=o==="social";return this.isAuthEnabled&&this.isEmailEnabled&&!n&&o?l`<wui-separator
              data-testid="w3m-email-login-or-separator"
              text="or"
            ></wui-separator>`:null}case"social":{const n=o==="email";return this.isAuthEnabled&&this.isSocialEnabled&&!n&&o?l`<wui-separator data-testid="wui-separator" text="or"></wui-separator>`:null}default:return null}}emailTemplate(e){return!this.isEmailEnabled||!this.isAuthEnabled?null:l`<w3m-email-login-widget tabIdx=${w(e)}></w3m-email-login-widget>`}socialListTemplate(e){return!this.isSocialEnabled||!this.isAuthEnabled?null:l`<w3m-social-login-widget
      walletGuide=${this.walletGuide}
      tabIdx=${w(e)}
    ></w3m-social-login-widget>`}walletListTemplate(e){const i=this.enableWallets,o=this.features?.emailShowWallets===!1,a=this.features?.collapseWallets,n=o||a;return!i||(g.isTelegram()&&(g.isSafari()||g.isIos())&&y.connectWalletConnect().catch(s=>({})),this.walletGuide==="explore")?null:this.isAuthEnabled&&(this.isEmailEnabled||this.isSocialEnabled)&&n?l`<wui-list-button
        data-testid="w3m-collapse-wallets-button"
        tabIdx=${w(e)}
        @click=${this.onContinueWalletClick.bind(this)}
        text="Continue with a wallet"
        icon="wallet"
      ></wui-list-button>`:l`<w3m-wallet-login-list tabIdx=${w(e)}></w3m-wallet-login-list>`}legalCheckboxTemplate(){return this.walletGuide==="explore"?null:l`<w3m-legal-checkbox data-testid="w3m-legal-checkbox"></w3m-legal-checkbox>`}handleConnectListScroll(){const e=this.shadowRoot?.querySelector(".connect");if(!e)return;e.scrollHeight>zn?(e.style.setProperty("--connect-mask-image",`linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
          black 100px,
          black calc(100% - 100px),
          rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
        )`),e.style.setProperty("--connect-scroll--top-opacity",mt.interpolate([0,50],[0,1],e.scrollTop).toString()),e.style.setProperty("--connect-scroll--bottom-opacity",mt.interpolate([0,50],[0,1],e.scrollHeight-e.scrollTop-e.offsetHeight).toString())):(e.style.setProperty("--connect-mask-image","none"),e.style.setProperty("--connect-scroll--top-opacity","0"),e.style.setProperty("--connect-scroll--bottom-opacity","0"))}onContinueWalletClick(){h.push("ConnectWallets")}};M.styles=Un;ne([u()],M.prototype,"connectors",void 0);ne([u()],M.prototype,"authConnector",void 0);ne([u()],M.prototype,"features",void 0);ne([u()],M.prototype,"remoteFeatures",void 0);ne([u()],M.prototype,"enableWallets",void 0);ne([u()],M.prototype,"noAdapters",void 0);ne([c()],M.prototype,"walletGuide",void 0);ne([u()],M.prototype,"checked",void 0);ne([u()],M.prototype,"isEmailEnabled",void 0);ne([u()],M.prototype,"isSocialEnabled",void 0);ne([u()],M.prototype,"isAuthEnabled",void 0);M=ne([p("w3m-connect-view")],M);const Fn=v`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-radius: ${({borderRadius:t})=>t[5]};
    padding-left: ${({spacing:t})=>t[3]};
    padding-right: ${({spacing:t})=>t[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:t})=>t[6]};
  }

  wui-text {
    color: ${({tokens:t})=>t.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;var Ot=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let qe=class extends f{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return l`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};qe.styles=[I,R,Fn];Ot([c({type:Boolean})],qe.prototype,"disabled",void 0);Ot([c()],qe.prototype,"label",void 0);Ot([c()],qe.prototype,"buttonLabel",void 0);qe=Ot([p("wui-cta-button")],qe);const Mn=v`
  :host {
    display: block;
    padding: 0 ${({spacing:t})=>t[5]} ${({spacing:t})=>t[5]};
  }
`;var Pi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let $t=class extends f{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;const{name:e,app_store:i,play_store:o,chrome_store:a,homepage:n}=this.wallet,r=g.isMobile(),s=g.isIos(),x=g.isAndroid(),S=[i,o,n,a].filter(Boolean).length>1,_=U.getTruncateString({string:e,charsStart:12,charsEnd:0,truncate:"end"});return S&&!r?l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${()=>h.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!S&&n?l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:i&&s?l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:o&&x?l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&g.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&g.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&g.openHref(this.wallet.homepage,"_blank")}};$t.styles=[Mn];Pi([c({type:Object})],$t.prototype,"wallet",void 0);$t=Pi([p("w3m-mobile-download-links")],$t);const Vn=v`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:t})=>t[1]} * -1);
    bottom: calc(${({spacing:t})=>t[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:t})=>t.lg};
    transition-timing-function: ${({easings:t})=>t["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:t})=>t[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:t})=>t["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;var se=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};class W extends f{constructor(){super(),this.wallet=h.state.data?.wallet,this.connector=h.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=k.getConnectorImage(this.connector)??k.getWalletImage(this.wallet),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=y.state.wcUri,this.error=y.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(y.subscribeKey("wcUri",e=>{this.uri=e,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),y.subscribeKey("wcError",e=>this.error=e)),(g.isTelegram()||g.isSafari())&&g.isIos()&&y.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),y.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();const e=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel;let i="";return this.label?i=this.label:(i=`Continue in ${this.name}`,this.error&&(i="Connection declined")),l`
      <wui-flex
        data-error=${w(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${w(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","0","0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?"error":"primary"}>
            ${i}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?l`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?l`
              <wui-flex .padding=${["0","5","5","5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){this.error&&!this.showRetry&&(this.showRetry=!0,this.shadowRoot?.querySelector("wui-button")?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"}))}onTryAgain(){y.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){const e=ft.state.themeVariables["--w3m-border-radius-master"],i=e?parseInt(e.replace("px",""),10):4;return l`<wui-loading-thumbnail radius=${i*9}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(g.copyToClopboard(this.uri),E.showSuccess("Link copied"))}catch{E.showError("Failed to copy")}}}W.styles=Vn;se([u()],W.prototype,"isRetrying",void 0);se([u()],W.prototype,"uri",void 0);se([u()],W.prototype,"error",void 0);se([u()],W.prototype,"ready",void 0);se([u()],W.prototype,"showRetry",void 0);se([u()],W.prototype,"label",void 0);se([u()],W.prototype,"secondaryBtnLabel",void 0);se([u()],W.prototype,"secondaryLabel",void 0);se([u()],W.prototype,"isLoading",void 0);se([c({type:Boolean})],W.prototype,"isMobile",void 0);se([c()],W.prototype,"onRetry",void 0);var Hn=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let yi=class extends W{constructor(){if(super(),this.externalViewUnsubscribe=[],this.connectionsByNamespace=y.getConnections(this.connector?.chain),this.hasMultipleConnections=this.connectionsByNamespace.length>0,this.remoteFeatures=m.state.remoteFeatures,this.currentActiveConnectorId=b.state.activeConnectorIds[this.connector?.chain],!this.connector)throw new Error("w3m-connecting-view: No connector provided");const e=this.connector?.chain;this.isAlreadyConnected(this.connector)&&(this.secondaryBtnLabel=void 0,this.label=`This account is already linked, change your account in ${this.connector.name}`,this.secondaryLabel=`To link a new account, open ${this.connector.name} and switch to the account you want to link`),$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.connector.name??"Unknown",platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:h.state.view}}),this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),this.isWalletConnect=!1,this.externalViewUnsubscribe.push(b.subscribeKey("activeConnectorIds",i=>{const o=i[e],a=this.remoteFeatures?.multiWallet,{redirectView:n}=h.state.data??{};o!==this.currentActiveConnectorId&&(this.hasMultipleConnections&&a?(h.replace("ProfileWallets"),E.showSuccess("New Wallet Added")):n?h.replace(n):N.close())}),y.subscribeKey("connections",this.onConnectionsChange.bind(this)))}disconnectedCallback(){this.externalViewUnsubscribe.forEach(e=>e())}async onConnectProxy(){try{if(this.error=!1,this.connector){if(this.isAlreadyConnected(this.connector))return;(!(this.connector.id===C.CONNECTOR_ID.COINBASE_SDK||this.connector.id===C.CONNECTOR_ID.BASE_ACCOUNT)||!this.error)&&await y.connectExternal(this.connector,this.connector.chain)}}catch(e){e instanceof Xt&&e.originalName===Yt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?$.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:e.message}}):$.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),this.error=!0}}onConnectionsChange(e){if(this.connector?.chain&&e.get(this.connector.chain)&&this.isAlreadyConnected(this.connector)){const i=e.get(this.connector.chain)??[],o=this.remoteFeatures?.multiWallet;if(i.length===0)h.replace("Connect");else{const a=he.getConnectionsByConnectorId(this.connectionsByNamespace,this.connector.id).flatMap(r=>r.accounts),n=he.getConnectionsByConnectorId(i,this.connector.id).flatMap(r=>r.accounts);n.length===0?this.hasMultipleConnections&&o?(h.replace("ProfileWallets"),E.showSuccess("Wallet deleted")):N.close():!a.every(s=>n.some(x=>Q.isLowerCaseMatch(s.address,x.address)))&&o&&h.replace("ProfileWallets")}}}isAlreadyConnected(e){return!!e&&this.connectionsByNamespace.some(i=>Q.isLowerCaseMatch(i.connectorId,e.id))}};yi=Hn([p("w3m-connecting-external-view")],yi);const qn=Z`
  wui-flex,
  wui-list-wallet {
    width: 100%;
  }
`;var Di=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ct=class extends f{constructor(){super(),this.unsubscribe=[],this.activeConnector=b.state.activeConnector,this.unsubscribe.push(b.subscribeKey("activeConnector",e=>this.activeConnector=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["3","5","5","5"]}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-wallet-image
            size="lg"
            imageSrc=${w(k.getConnectorImage(this.activeConnector))}
          ></wui-wallet-image>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["0","3","0","3"]}
        >
          <wui-text variant="lg-medium" color="primary">
            Select Chain for ${this.activeConnector?.name}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary"
            >Select which chain to connect to your multi chain wallet</wui-text
          >
        </wui-flex>
        <wui-flex
          flexGrow="1"
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","2","0"]}
        >
          ${this.networksTemplate()}
        </wui-flex>
      </wui-flex>
    `}networksTemplate(){return this.activeConnector?.connectors?.map((e,i)=>e.name?l`
            <w3m-list-wallet
              displayIndex=${i}
              imageSrc=${w(k.getChainImage(e.chain))}
              name=${C.CHAIN_NAME_MAP[e.chain]}
              @click=${()=>this.onConnector(e)}
              size="sm"
              data-testid="wui-list-chain-${e.chain}"
              rdnsId=${e.explorerWallet?.rdns}
            ></w3m-list-wallet>
          `:null)}onConnector(e){const i=this.activeConnector?.connectors?.find(a=>a.chain===e.chain),o=h.state.data?.redirectView;if(!i){E.showError("Failed to find connector");return}i.id==="walletConnect"?g.isMobile()?h.push("AllWallets"):h.push("ConnectingWalletConnect",{redirectView:o}):h.push("ConnectingExternal",{connector:i,redirectView:o,wallet:this.activeConnector?.explorerWallet})}};Ct.styles=qn;Di([u()],Ct.prototype,"activeConnector",void 0);Ct=Di([p("w3m-connecting-multi-chain-view")],Ct);var ni=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let St=class extends f{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.generateTabs();return l`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){const e=this.platforms.map(i=>i==="browser"?{label:"Browser",icon:"extension",platform:"browser"}:i==="mobile"?{label:"Mobile",icon:"mobile",platform:"mobile"}:i==="qrcode"?{label:"Mobile",icon:"mobile",platform:"qrcode"}:i==="web"?{label:"Webapp",icon:"browser",platform:"web"}:i==="desktop"?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=e.map(({platform:i})=>i),e}onTabChange(e){const i=this.platformTabs[e];i&&this.onSelectPlatfrom?.(i)}};ni([c({type:Array})],St.prototype,"platforms",void 0);ni([c()],St.prototype,"onSelectPlatfrom",void 0);St=ni([p("w3m-connecting-header")],St);var Kn=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let vi=class extends W{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:h.state.view}})}async onConnectProxy(){try{this.error=!1;const{connectors:e}=b.state,i=e.find(o=>o.type==="ANNOUNCED"&&o.info?.rdns===this.wallet?.rdns||o.type==="INJECTED"||o.name===this.wallet?.name);if(i)await y.connectExternal(i,i.chain);else throw new Error("w3m-connecting-wc-browser: No connector found");N.close()}catch(e){e instanceof Xt&&e.originalName===Yt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?$.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:e.message}}):$.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),this.error=!0}}};vi=Kn([p("w3m-connecting-wc-browser")],vi);var Gn=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let xi=class extends W{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:h.state.view}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;const{desktop_link:e,name:i}=this.wallet,{redirect:o,href:a}=g.formatNativeUrl(e,this.uri);y.setWcLinking({name:i,href:a}),y.setRecentWallet(this.wallet),g.openHref(o,"_blank")}catch{this.error=!0}}};xi=Gn([p("w3m-connecting-wc-desktop")],xi);var et=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Pe=class extends W{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=m.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{he.onConnectMobile(this.wallet)},!this.wallet)throw new Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=O.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(y.subscribeKey("wcUri",()=>{this.onHandleURI()})),$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:h.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){y.setWcError(!1),this.onConnect?.()}};et([u()],Pe.prototype,"redirectDeeplink",void 0);et([u()],Pe.prototype,"redirectUniversalLink",void 0);et([u()],Pe.prototype,"target",void 0);et([u()],Pe.prototype,"preferUniversalLinks",void 0);et([u()],Pe.prototype,"isLoading",void 0);Pe=et([p("w3m-connecting-wc-mobile")],Pe);const Xn=v`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:t})=>t.xl};
    animation-timing-function: ${({easings:t})=>t["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var Li=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let kt=class extends W{constructor(){super(),this.basic=!1}firstUpdated(){this.basic||$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:h.state.view}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(e=>e())}render(){return this.onRenderProxy(),l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","5","5","5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){if(!this.uri||!this.ready)return null;const e=this.wallet?this.wallet.name:void 0;y.setWcLinking(void 0),y.setRecentWallet(this.wallet);const i=ft.state.themeVariables["--apkt-qr-color"]??ft.state.themeVariables["--w3m-qr-color"];return l` <wui-qr-code
      theme=${ft.state.themeMode}
      uri=${this.uri}
      imageSrc=${w(k.getWalletImage(this.wallet))}
      color=${w(i)}
      alt=${w(e)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){const e=!this.uri||!this.ready;return l`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};kt.styles=Xn;Li([c({type:Boolean})],kt.prototype,"basic",void 0);kt=Li([p("w3m-connecting-wc-qrcode")],kt);var Yn=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let $i=class extends f{constructor(){if(super(),this.wallet=h.state.data?.wallet,!this.wallet)throw new Error("w3m-connecting-wc-unsupported: No wallet provided");$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:h.state.view}})}render(){return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${w(k.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};$i=Yn([p("w3m-connecting-wc-unsupported")],$i);var ji=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Mt=class extends W{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw new Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=O.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(y.subscribeKey("wcUri",()=>{this.updateLoadingState()})),$.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:h.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;const{webapp_link:e,name:i}=this.wallet,{redirect:o,href:a}=g.formatUniversalUrl(e,this.uri);y.setWcLinking({name:i,href:a}),y.setRecentWallet(this.wallet),g.openHref(o,"_blank")}catch{this.error=!0}}};ji([u()],Mt.prototype,"isLoading",void 0);Mt=ji([p("w3m-connecting-wc-web")],Mt);const Qn=v`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;var Ue=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let we=class extends f{constructor(){super(),this.wallet=h.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!m.state.siwx,this.remoteFeatures=m.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return m.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),l`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return!this.remoteFeatures?.reownBranding||!this.displayBranding?null:l`<wui-ux-by-reown></wui-ux-by-reown>`}async initializeConnection(e=!1){if(!(this.platform==="browser"||m.state.manualWCControl&&!e))try{const{wcPairingExpiry:i,status:o}=y.state,{redirectView:a}=h.state.data??{};if(e||m.state.enableEmbedded||g.isPairingExpired(i)||o==="connecting"){const n=y.getConnections(d.state.activeChain),r=this.remoteFeatures?.multiWallet,s=n.length>0;await y.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(s&&r?(h.replace("ProfileWallets"),E.showSuccess("New Wallet Added")):a?h.replace(a):N.close())}}catch(i){if(i instanceof Error&&i.message.includes("An error occurred when attempting to switch chain")&&!m.state.enableNetworkSwitch&&d.state.activeChain){d.setActiveCaipNetwork(Yi.getUnsupportedNetwork(`${d.state.activeChain}:${d.state.activeCaipNetwork?.id}`)),d.showUnsupportedChainUI();return}i instanceof Xt&&i.originalName===Yt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?$.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:i.message}}):$.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:i?.message??"Unknown"}}),y.setWcError(!0),E.showError(i.message??"Connection error"),y.resetWcConnection(),h.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;const{mobile_link:e,desktop_link:i,webapp_link:o,injected:a,rdns:n}=this.wallet,r=a?.map(({injected_id:Hi})=>Hi).filter(Boolean),s=[...n?[n]:r??[]],x=m.state.isUniversalProvider?!1:s.length,S=e,_=o,G=y.checkInstalled(s),le=x&&G,Mi=i&&!g.isMobile();le&&!d.state.noAdapters&&this.platforms.push("browser"),S&&this.platforms.push(g.isMobile()?"mobile":"qrcode"),_&&this.platforms.push("web"),Mi&&this.platforms.push("desktop");const Vi=Qi.isCustomDeeplinkWallet(this.wallet.id,d.state.activeChain);!le&&x&&!d.state.noAdapters&&!Vi&&this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return l`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return l`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return l`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return l`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return l`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return l`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?l`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(e){const i=this.shadowRoot?.querySelector("div");i&&(await i.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=e,i.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};we.styles=Qn;Ue([u()],we.prototype,"platform",void 0);Ue([u()],we.prototype,"platforms",void 0);Ue([u()],we.prototype,"isSiwxEnabled",void 0);Ue([u()],we.prototype,"remoteFeatures",void 0);Ue([c({type:Boolean})],we.prototype,"displayBranding",void 0);Ue([c({type:Boolean})],we.prototype,"basic",void 0);we=Ue([p("w3m-connecting-wc-view")],we);var oi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Et=class extends f{constructor(){super(),this.unsubscribe=[],this.isMobile=g.isMobile(),this.remoteFeatures=m.state.remoteFeatures,this.unsubscribe.push(m.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){const{featured:e,recommended:i}=A.state,{customWallets:o}=m.state,a=me.getRecentWallets(),n=e.length||i.length||o?.length||a.length;return l`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${n?l`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return l`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?l` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};oi([u()],Et.prototype,"isMobile",void 0);oi([u()],Et.prototype,"remoteFeatures",void 0);Et=oi([p("w3m-connecting-wc-basic-view")],Et);const Jn=Z`
  .continue-button-container {
    width: 100%;
  }
`;var Bi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let At=class extends f{constructor(){super(...arguments),this.loading=!1}render(){return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="6"
        .padding=${["0","0","4","0"]}
      >
        ${this.onboardingTemplate()} ${this.buttonsTemplate()}
        <wui-link
          @click=${()=>{g.openHref(tn.URLS.FAQ,"_blank")}}
        >
          Learn more about names
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-link>
      </wui-flex>
    `}onboardingTemplate(){return l` <wui-flex
      flexDirection="column"
      gap="6"
      alignItems="center"
      .padding=${["0","6","0","6"]}
    >
      <wui-flex gap="3" alignItems="center" justifyContent="center">
        <wui-icon-box icon="id" size="xl" iconSize="xxl" color="default"></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="3">
        <wui-text align="center" variant="lg-medium" color="primary">
          Choose your account name
        </wui-text>
        <wui-text align="center" variant="md-regular" color="primary">
          Finally say goodbye to 0x addresses, name your account to make it easier to exchange
          assets
        </wui-text>
      </wui-flex>
    </wui-flex>`}buttonsTemplate(){return l`<wui-flex
      .padding=${["0","8","0","8"]}
      gap="3"
      class="continue-button-container"
    >
      <wui-button
        fullWidth
        .loading=${this.loading}
        size="lg"
        borderRadius="xs"
        @click=${this.handleContinue.bind(this)}
        >Choose name
      </wui-button>
    </wui-flex>`}handleContinue(){h.push("RegisterAccountName"),$.sendEvent({type:"track",event:"OPEN_ENS_FLOW",properties:{isSmartAccount:ze(d.state.activeChain)===Fe.ACCOUNT_TYPES.SMART_ACCOUNT}})}};At.styles=Jn;Bi([u()],At.prototype,"loading",void 0);At=Bi([p("w3m-choose-account-name-view")],At);var Zn=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ci=class extends f{constructor(){super(...arguments),this.wallet=h.state.data?.wallet}render(){if(!this.wallet)throw new Error("w3m-downloads-view");return l`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?l`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?l`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?l`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?l`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(e){e.href&&this.wallet&&($.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:e.type}}),g.openHref(e.href,"_blank"))}onChromeStore(){this.wallet?.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){this.wallet?.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){this.wallet?.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){this.wallet?.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};Ci=Zn([p("w3m-downloads-view")],Ci);var eo=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const to="https://walletguide.walletconnect.network";let Si=class extends f{render(){return l`
      <wui-flex flexDirection="column" .padding=${["0","3","3","3"]} gap="2">
        ${this.recommendedWalletsTemplate()}
        <w3m-list-wallet
          name="Explore all"
          showAllWallets
          walletIcon="allWallets"
          icon="externalLink"
          size="sm"
          @click=${()=>{g.openHref("https://walletguide.walletconnect.network/","_blank")}}
        ></w3m-list-wallet>
      </wui-flex>
    `}recommendedWalletsTemplate(){const{recommended:e,featured:i}=A.state,{customWallets:o}=m.state;return[...i,...o??[],...e].slice(0,4).map((n,r)=>l`
        <w3m-list-wallet
          displayIndex=${r}
          name=${n.name??"Unknown"}
          tagVariant="accent"
          size="sm"
          imageSrc=${w(k.getWalletImage(n))}
          @click=${()=>{this.onWalletClick(n)}}
        ></w3m-list-wallet>
      `)}onWalletClick(e){$.sendEvent({type:"track",event:"GET_WALLET",properties:{name:e.name,walletRank:void 0,explorerId:e.id,type:"homepage"}}),g.openHref(e.homepage??to,"_blank")}};Si=eo([p("w3m-get-wallet-view")],Si);var Ui=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Vt=class extends f{constructor(){super(...arguments),this.data=[]}render(){return l`
      <wui-flex flexDirection="column" alignItems="center" gap="4">
        ${this.data.map(e=>l`
            <wui-flex flexDirection="column" alignItems="center" gap="5">
              <wui-flex flexDirection="row" justifyContent="center" gap="1">
                ${e.images.map(i=>l`<wui-visual size="sm" name=${i}></wui-visual>`)}
              </wui-flex>
            </wui-flex>
            <wui-flex flexDirection="column" alignItems="center" gap="1">
              <wui-text variant="md-regular" color="primary" align="center">${e.title}</wui-text>
              <wui-text variant="sm-regular" color="secondary" align="center"
                >${e.text}</wui-text
              >
            </wui-flex>
          `)}
      </wui-flex>
    `}};Ui([c({type:Array})],Vt.prototype,"data",void 0);Vt=Ui([p("w3m-help-widget")],Vt);var io=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const no=[{images:["login","profile","lock"],title:"One login for all of web3",text:"Log in to any app by connecting your wallet. Say goodbye to countless passwords!"},{images:["defi","nft","eth"],title:"A home for your digital assets",text:"A wallet lets you store, send and receive digital assets like cryptocurrencies and NFTs."},{images:["browser","noun","dao"],title:"Your gateway to a new web",text:"With your wallet, you can explore and interact with DeFi, NFTs, DAOs, and much more."}];let ki=class extends f{render(){return l`
      <wui-flex
        flexDirection="column"
        .padding=${["6","5","5","5"]}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${no}></w3m-help-widget>
        <wui-button variant="accent-primary" size="md" @click=${this.onGetWallet.bind(this)}>
          <wui-icon color="inherit" slot="iconLeft" name="wallet"></wui-icon>
          Get a wallet
        </wui-button>
      </wui-flex>
    `}onGetWallet(){$.sendEvent({type:"track",event:"CLICK_GET_WALLET_HELP"}),h.push("GetWallet")}};ki=io([p("w3m-what-is-a-wallet-view")],ki);const oo=v`
  wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    transition: opacity ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: opacity;
  }
  wui-flex::-webkit-scrollbar {
    display: none;
  }
  wui-flex.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }
`;var zi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let It=class extends f{constructor(){super(),this.unsubscribe=[],this.checked=bt.state.isLegalCheckboxChecked,this.unsubscribe.push(bt.subscribeKey("isLegalCheckboxChecked",e=>{this.checked=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const{termsConditionsUrl:e,privacyPolicyUrl:i}=m.state,o=m.state.features?.legalCheckbox,n=!!(e||i)&&!!o,r=n&&!this.checked,s=r?-1:void 0;return l`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${n?["0","3","3","3"]:"3"}
        gap="2"
        class=${w(r?"disabled":void 0)}
      >
        <w3m-wallet-login-list tabIdx=${w(s)}></w3m-wallet-login-list>
      </wui-flex>
    `}};It.styles=oo;zi([u()],It.prototype,"checked",void 0);It=zi([p("w3m-connect-wallets-view")],It);const ao=v`
  :host {
    display: block;
    width: 120px;
    height: 120px;
  }

  svg {
    width: 120px;
    height: 120px;
    fill: none;
    stroke: transparent;
    stroke-linecap: round;
  }

  use {
    stroke: ${t=>t.colors.accent100};
    stroke-width: 2px;
    stroke-dasharray: 54, 118;
    stroke-dashoffset: 172;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var ro=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ht=class extends f{render(){return l`
      <svg viewBox="0 0 54 59">
        <path
          id="wui-loader-path"
          d="M17.22 5.295c3.877-2.277 5.737-3.363 7.72-3.726a11.44 11.44 0 0 1 4.12 0c1.983.363 3.844 1.45 7.72 3.726l6.065 3.562c3.876 2.276 5.731 3.372 7.032 4.938a11.896 11.896 0 0 1 2.06 3.63c.683 1.928.688 4.11.688 8.663v7.124c0 4.553-.005 6.735-.688 8.664a11.896 11.896 0 0 1-2.06 3.63c-1.3 1.565-3.156 2.66-7.032 4.937l-6.065 3.563c-3.877 2.276-5.737 3.362-7.72 3.725a11.46 11.46 0 0 1-4.12 0c-1.983-.363-3.844-1.449-7.72-3.726l-6.065-3.562c-3.876-2.276-5.731-3.372-7.032-4.938a11.885 11.885 0 0 1-2.06-3.63c-.682-1.928-.688-4.11-.688-8.663v-7.124c0-4.553.006-6.735.688-8.664a11.885 11.885 0 0 1 2.06-3.63c1.3-1.565 3.156-2.66 7.032-4.937l6.065-3.562Z"
        />
        <use xlink:href="#wui-loader-path"></use>
      </svg>
    `}};Ht.styles=[I,ao];Ht=ro([p("wui-loading-hexagon")],Ht);const so=Z`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-hexagon {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: 4px;
    bottom: 0;
    opacity: 0;
    transform: scale(0.5);
    z-index: 1;
  }

  wui-button {
    display: none;
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  wui-button[data-retry='true'] {
    display: block;
    opacity: 1;
  }
`;var ai=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let ot=class extends f{constructor(){super(),this.network=h.state.data?.network,this.unsubscribe=[],this.showRetry=!1,this.error=!1}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}firstUpdated(){this.onSwitchNetwork()}render(){if(!this.network)throw new Error("w3m-network-switch-view: No network provided");this.onShowRetry();const e=this.getLabel(),i=this.getSubLabel();return l`
      <wui-flex
        data-error=${this.error}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","10","5"]}
        gap="7"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-network-image
            size="lg"
            imageSrc=${w(k.getNetworkImage(this.network))}
          ></wui-network-image>

          ${this.error?null:l`<wui-loading-hexagon></wui-loading-hexagon>`}

          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="h6-regular" color="primary">${e}</wui-text>
          <wui-text align="center" variant="md-regular" color="secondary">${i}</wui-text>
        </wui-flex>

        <wui-button
          data-retry=${this.showRetry}
          variant="accent-primary"
          size="md"
          .disabled=${!this.error}
          @click=${this.onSwitchNetwork.bind(this)}
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try again
        </wui-button>
      </wui-flex>
    `}getSubLabel(){const e=b.getConnectorId(d.state.activeChain);return b.getAuthConnector()&&e===C.CONNECTOR_ID.AUTH?"":this.error?"Switch can be declined if chain is not supported by a wallet or previous request is still active":"Accept connection request in your wallet"}getLabel(){const e=b.getConnectorId(d.state.activeChain);return b.getAuthConnector()&&e===C.CONNECTOR_ID.AUTH?`Switching to ${this.network?.name??"Unknown"} network...`:this.error?"Switch declined":"Approve in wallet"}onShowRetry(){this.error&&!this.showRetry&&(this.showRetry=!0,this.shadowRoot?.querySelector("wui-button")?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"}))}async onSwitchNetwork(){try{this.error=!1,d.state.activeChain!==this.network?.chainNamespace&&d.setIsSwitchingNamespace(!0),this.network&&(await d.switchActiveNetwork(this.network),await jt.isAuthenticated()&&h.goBack())}catch{this.error=!0}}};ot.styles=so;ai([u()],ot.prototype,"showRetry",void 0);ai([u()],ot.prototype,"error",void 0);ot=ai([p("w3m-network-switch-view")],ot);const lo=v`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:t})=>t[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  wui-text {
    text-transform: capitalize;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var pt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let De=class extends f{constructor(){super(...arguments),this.imageSrc=void 0,this.name="Ethereum",this.disabled=!1}render(){return l`
      <button ?disabled=${this.disabled} tabindex=${w(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          ${this.imageTemplate()}
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `}imageTemplate(){return this.imageSrc?l`<wui-image ?boxed=${!0} src=${this.imageSrc}></wui-image>`:l`<wui-image
      ?boxed=${!0}
      icon="networkPlaceholder"
      size="lg"
      iconColor="default"
    ></wui-image>`}};De.styles=[I,R,lo];pt([c()],De.prototype,"imageSrc",void 0);pt([c()],De.prototype,"name",void 0);pt([c()],De.prototype,"tabIdx",void 0);pt([c({type:Boolean})],De.prototype,"disabled",void 0);De=pt([p("wui-list-network")],De);const co=Z`
  .container {
    max-height: 360px;
    overflow: auto;
  }

  .container::-webkit-scrollbar {
    display: none;
  }
`;var wt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Le=class extends f{constructor(){super(),this.unsubscribe=[],this.network=d.state.activeCaipNetwork,this.requestedCaipNetworks=d.getCaipNetworks(),this.search="",this.onDebouncedSearch=g.debounce(e=>{this.search=e},100),this.unsubscribe.push(ke.subscribeNetworkImages(()=>this.requestUpdate()),d.subscribeKey("activeCaipNetwork",e=>this.network=e),d.subscribe(()=>{this.requestedCaipNetworks=d.getAllRequestedCaipNetworks()}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      ${this.templateSearchInput()}
      <wui-flex
        class="container"
        .padding=${["0","3","3","3"]}
        flexDirection="column"
        gap="2"
      >
        ${this.networksTemplate()}
      </wui-flex>
    `}templateSearchInput(){return l`
      <wui-flex gap="2" .padding=${["0","3","3","3"]}>
        <wui-input-text
          @inputChange=${this.onInputChange.bind(this)}
          class="network-search-input"
          size="md"
          placeholder="Search network"
          icon="search"
        ></wui-input-text>
      </wui-flex>
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}networksTemplate(){const e=d.getAllApprovedCaipNetworkIds(),i=g.sortRequestedNetworks(e,this.requestedCaipNetworks);return this.search?this.filteredNetworks=i?.filter(o=>o?.name?.toLowerCase().includes(this.search.toLowerCase())):this.filteredNetworks=i,this.filteredNetworks?.map(o=>l`
        <wui-list-network
          .selected=${this.network?.id===o.id}
          imageSrc=${w(k.getNetworkImage(o))}
          type="network"
          name=${o.name??o.id}
          @click=${()=>this.onSwitchNetwork(o)}
          .disabled=${d.isCaipNetworkDisabled(o)}
          data-testid=${`w3m-network-switch-${o.name??o.id}`}
        ></wui-list-network>
      `)}onSwitchNetwork(e){Ji.onSwitchNetwork({network:e})}};Le.styles=co;wt([u()],Le.prototype,"network",void 0);wt([u()],Le.prototype,"requestedCaipNetworks",void 0);wt([u()],Le.prototype,"filteredNetworks",void 0);wt([u()],Le.prototype,"search",void 0);Le=wt([p("w3m-networks-view")],Le);const uo=v`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-visual {
    border-radius: calc(
      ${({borderRadius:t})=>t[1]} * 9 - ${({borderRadius:t})=>t[3]}
    );
    position: relative;
    overflow: hidden;
  }

  wui-visual::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    border-radius: calc(
      ${({borderRadius:t})=>t[1]} * 9 - ${({borderRadius:t})=>t[3]}
    );
    box-shadow: inset 0 0 0 1px ${({tokens:t})=>t.core.glass010};
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:t})=>t[1]} * -1);
    bottom: calc(${({spacing:t})=>t[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({durations:t})=>t.lg} ${({easings:t})=>t["ease-out-power-2"]},
      transform ${({durations:t})=>t.lg}
        ${({easings:t})=>t["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:t})=>t[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:t})=>t["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  wui-link {
    padding: ${({spacing:t})=>t["01"]} ${({spacing:t})=>t[2]};
  }

  .capitalize {
    text-transform: capitalize;
  }
`;var Fi=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const ho={eip155:"eth",solana:"solana",bip122:"bitcoin",polkadot:void 0};let _t=class extends f{constructor(){super(...arguments),this.unsubscribe=[],this.switchToChain=h.state.data?.switchToChain,this.caipNetwork=h.state.data?.network,this.activeChain=d.state.activeChain}firstUpdated(){this.unsubscribe.push(d.subscribeKey("activeChain",e=>this.activeChain=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.switchToChain?C.CHAIN_NAME_MAP[this.switchToChain]:"supported";if(!this.switchToChain)return null;const i=C.CHAIN_NAME_MAP[this.switchToChain];return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["4","2","2","2"]}
        gap="4"
      >
        <wui-flex justifyContent="center" flexDirection="column" alignItems="center" gap="2">
          <wui-visual
            size="md"
            name=${w(ho[this.switchToChain])}
          ></wui-visual>
          <wui-flex gap="2" flexDirection="column" alignItems="center">
            <wui-text
              data-testid=${`w3m-switch-active-chain-to-${i}`}
              variant="lg-regular"
              color="primary"
              align="center"
              >Switch to <span class="capitalize">${i}</span></wui-text
            >
            <wui-text variant="md-regular" color="secondary" align="center">
              Connected wallet doesn't support connecting to ${e} chain. You
              need to connect with a different wallet.
            </wui-text>
          </wui-flex>
          <wui-button
            data-testid="w3m-switch-active-chain-button"
            size="md"
            @click=${this.switchActiveChain.bind(this)}
            >Switch</wui-button
          >
        </wui-flex>
      </wui-flex>
    `}async switchActiveChain(){this.switchToChain&&(d.setIsSwitchingNamespace(!0),b.setFilterByNamespace(this.switchToChain),this.caipNetwork?await d.switchActiveNetwork(this.caipNetwork):d.setActiveNamespace(this.switchToChain),h.reset("Connect"))}};_t.styles=uo;Fi([c()],_t.prototype,"activeChain",void 0);_t=Fi([p("w3m-switch-active-chain-view")],_t);var po=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};const wo=[{images:["network","layers","system"],title:"The system’s nuts and bolts",text:"A network is what brings the blockchain to life, as this technical infrastructure allows apps to access the ledger and smart contract services."},{images:["noun","defiAlt","dao"],title:"Designed for different uses",text:"Each network is designed differently, and may therefore suit certain apps and experiences."}];let Ei=class extends f{render(){return l`
      <wui-flex
        flexDirection="column"
        .padding=${["6","5","5","5"]}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${wo}></w3m-help-widget>
        <wui-button
          variant="accent-primary"
          size="md"
          @click=${()=>{g.openHref("https://ethereum.org/en/developers/docs/networks/","_blank")}}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};Ei=po([p("w3m-what-is-a-network-view")],Ei);const fo=Z`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`;var ri=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let at=class extends f{constructor(){super(),this.swapUnsupportedChain=h.state.data?.swapUnsupportedChain,this.unsubscribe=[],this.disconnecting=!1,this.remoteFeatures=m.state.remoteFeatures,this.unsubscribe.push(ke.subscribeNetworkImages(()=>this.requestUpdate()),m.subscribeKey("remoteFeatures",e=>{this.remoteFeatures=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-flex class="container" flexDirection="column" gap="0">
        <wui-flex
          class="container"
          flexDirection="column"
          .padding=${["3","5","2","5"]}
          alignItems="center"
          gap="5"
        >
          ${this.descriptionTemplate()}
        </wui-flex>

        <wui-flex flexDirection="column" padding="3" gap="2"> ${this.networksTemplate()} </wui-flex>

        <wui-separator text="or"></wui-separator>
        <wui-flex flexDirection="column" padding="3" gap="2">
          <wui-list-item
            variant="icon"
            iconVariant="overlay"
            icon="signOut"
            ?chevron=${!1}
            .loading=${this.disconnecting}
            @click=${this.onDisconnect.bind(this)}
            data-testid="disconnect-button"
          >
            <wui-text variant="md-medium" color="secondary">Disconnect</wui-text>
          </wui-list-item>
        </wui-flex>
      </wui-flex>
    `}descriptionTemplate(){return this.swapUnsupportedChain?l`
        <wui-text variant="sm-regular" color="secondary" align="center">
          The swap feature doesn’t support your current network. Switch to an available option to
          continue.
        </wui-text>
      `:l`
      <wui-text variant="sm-regular" color="secondary" align="center">
        This app doesn’t support your current network. Switch to an available option to continue.
      </wui-text>
    `}networksTemplate(){const e=d.getAllRequestedCaipNetworks(),i=d.getAllApprovedCaipNetworkIds(),o=g.sortRequestedNetworks(i,e);return(this.swapUnsupportedChain?o.filter(n=>O.SWAP_SUPPORTED_NETWORKS.includes(n.caipNetworkId)):o).map(n=>l`
        <wui-list-network
          imageSrc=${w(k.getNetworkImage(n))}
          name=${n.name??"Unknown"}
          @click=${()=>this.onSwitchNetwork(n)}
        >
        </wui-list-network>
      `)}async onDisconnect(){try{this.disconnecting=!0;const e=d.state.activeChain,o=y.getConnections(e).length>0,a=e&&b.state.activeConnectorIds[e],n=this.remoteFeatures?.multiWallet;await y.disconnect(n?{id:a,namespace:e}:{}),o&&n&&(h.push("ProfileWallets"),E.showSuccess("Wallet deleted"))}catch{$.sendEvent({type:"track",event:"DISCONNECT_ERROR",properties:{message:"Failed to disconnect"}}),E.showError("Failed to disconnect")}finally{this.disconnecting=!1}}async onSwitchNetwork(e){const i=d.getActiveCaipAddress(),o=d.getAllApprovedCaipNetworkIds(),a=d.getNetworkProp("supportsAllNetworks",e.chainNamespace),n=h.state.data;i?o?.includes(e.caipNetworkId)?await d.switchActiveNetwork(e):a?h.push("SwitchNetwork",{...n,network:e}):h.push("SwitchNetwork",{...n,network:e}):i||(d.setActiveCaipNetwork(e),h.push("Connect"))}};at.styles=fo;ri([u()],at.prototype,"disconnecting",void 0);ri([u()],at.prototype,"remoteFeatures",void 0);at=ri([p("w3m-unsupported-chain-view")],at);const mo=v`
  wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:t})=>t[2]};
    border-radius: ${({borderRadius:t})=>t[4]};
    padding: ${({spacing:t})=>t[3]};
  }

  /* -- Types --------------------------------------------------------- */
  wui-flex[data-type='info'] {
    color: ${({tokens:t})=>t.theme.textSecondary};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  wui-flex[data-type='success'] {
    color: ${({tokens:t})=>t.core.textSuccess};
    background-color: ${({tokens:t})=>t.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] {
    color: ${({tokens:t})=>t.core.textError};
    background-color: ${({tokens:t})=>t.core.backgroundError};
  }

  wui-flex[data-type='warning'] {
    color: ${({tokens:t})=>t.core.textWarning};
    background-color: ${({tokens:t})=>t.core.backgroundWarning};
  }

  wui-flex[data-type='info'] wui-icon-box {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  wui-flex[data-type='success'] wui-icon-box {
    background-color: ${({tokens:t})=>t.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] wui-icon-box {
    background-color: ${({tokens:t})=>t.core.backgroundError};
  }

  wui-flex[data-type='warning'] wui-icon-box {
    background-color: ${({tokens:t})=>t.core.backgroundWarning};
  }

  wui-text {
    flex: 1;
  }
`;var Pt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ke=class extends f{constructor(){super(...arguments),this.icon="externalLink",this.text="",this.type="info"}render(){return l`
      <wui-flex alignItems="center" data-type=${this.type}>
        <wui-icon-box size="sm" color="inherit" icon=${this.icon}></wui-icon-box>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
      </wui-flex>
    `}};Ke.styles=[I,R,mo];Pt([c()],Ke.prototype,"icon",void 0);Pt([c()],Ke.prototype,"text",void 0);Pt([c()],Ke.prototype,"type",void 0);Ke=Pt([p("wui-banner")],Ke);const bo=Z`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`;var go=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let qt=class extends f{constructor(){super(),this.unsubscribe=[]}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l` <wui-flex flexDirection="column" .padding=${["2","3","3","3"]} gap="2">
      <wui-banner
        icon="warningCircle"
        text="You can only receive assets on these networks"
      ></wui-banner>
      ${this.networkTemplate()}
    </wui-flex>`}networkTemplate(){const e=d.getAllRequestedCaipNetworks(),i=d.getAllApprovedCaipNetworkIds(),o=d.state.activeCaipNetwork,a=d.checkIfSmartAccountEnabled();let n=g.sortRequestedNetworks(i,e);if(a&&ze(o?.chainNamespace)===Fe.ACCOUNT_TYPES.SMART_ACCOUNT){if(!o)return null;n=[o]}return n.filter(s=>s.chainNamespace===o?.chainNamespace).map(s=>l`
        <wui-list-network
          imageSrc=${w(k.getNetworkImage(s))}
          name=${s.name??"Unknown"}
          ?transparent=${!0}
        >
        </wui-list-network>
      `)}};qt.styles=bo;qt=go([p("w3m-wallet-compatible-networks-view")],qt);const yo=v`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 56px;
    height: 56px;
    box-shadow: 0 0 0 8px ${({tokens:t})=>t.theme.borderPrimary};
    border-radius: ${({borderRadius:t})=>t[4]};
    overflow: hidden;
  }

  :host([data-border-radius-full='true']) {
    border-radius: 50px;
  }

  wui-icon {
    width: 32px;
    height: 32px;
  }
`;var Dt=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Ge=class extends f{render(){return this.dataset.borderRadiusFull=this.borderRadiusFull?"true":"false",l`${this.templateVisual()}`}templateVisual(){return this.imageSrc?l`<wui-image src=${this.imageSrc} alt=${this.alt??""}></wui-image>`:l`<wui-icon
      data-parent-size="md"
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`}};Ge.styles=[I,yo];Dt([c()],Ge.prototype,"imageSrc",void 0);Dt([c()],Ge.prototype,"alt",void 0);Dt([c({type:Boolean})],Ge.prototype,"borderRadiusFull",void 0);Ge=Dt([p("wui-visual-thumbnail")],Ge);const vo=v`
  :host {
    display: flex;
    justify-content: center;
    gap: ${({spacing:t})=>t[4]};
  }

  wui-visual-thumbnail:nth-child(1) {
    z-index: 1;
  }
`;var xo=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Kt=class extends f{constructor(){super(...arguments),this.dappImageUrl=m.state.metadata?.icons,this.walletImageUrl=d.getAccountData()?.connectedWalletInfo?.icon}firstUpdated(){const e=this.shadowRoot?.querySelectorAll("wui-visual-thumbnail");e?.[0]&&this.createAnimation(e[0],"translate(18px)"),e?.[1]&&this.createAnimation(e[1],"translate(-18px)")}render(){return l`
      <wui-visual-thumbnail
        ?borderRadiusFull=${!0}
        .imageSrc=${this.dappImageUrl?.[0]}
      ></wui-visual-thumbnail>
      <wui-visual-thumbnail .imageSrc=${this.walletImageUrl}></wui-visual-thumbnail>
    `}createAnimation(e,i){e.animate([{transform:"translateX(0px)"},{transform:i}],{duration:1600,easing:"cubic-bezier(0.56, 0, 0.48, 1)",direction:"alternate",iterations:1/0})}};Kt.styles=vo;Kt=xo([p("w3m-siwx-sign-message-thumbnails")],Kt);var si=function(t,e,i,o){var a=arguments.length,n=a<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(t,e,i,o);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n};let Tt=class extends f{constructor(){super(...arguments),this.dappName=m.state.metadata?.name,this.isCancelling=!1,this.isSigning=!1}render(){return l`
      <wui-flex justifyContent="center" .padding=${["8","0","6","0"]}>
        <w3m-siwx-sign-message-thumbnails></w3m-siwx-sign-message-thumbnails>
      </wui-flex>
      <wui-flex .padding=${["0","20","5","20"]} gap="3" justifyContent="space-between">
        <wui-text variant="lg-medium" align="center" color="primary"
          >${this.dappName??"Dapp"} needs to connect to your wallet</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${["0","10","4","10"]} gap="3" justifyContent="space-between">
        <wui-text variant="md-regular" align="center" color="secondary"
          >Sign this message to prove you own this wallet and proceed. Canceling will disconnect
          you.</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${["4","5","5","5"]} gap="3" justifyContent="space-between">
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-secondary"
          ?loading=${this.isCancelling}
          @click=${this.onCancel.bind(this)}
          data-testid="w3m-connecting-siwe-cancel"
        >
          ${this.isCancelling?"Cancelling...":"Cancel"}
        </wui-button>
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-primary"
          @click=${this.onSign.bind(this)}
          ?loading=${this.isSigning}
          data-testid="w3m-connecting-siwe-sign"
        >
          ${this.isSigning?"Signing...":"Sign"}
        </wui-button>
      </wui-flex>
    `}async onSign(){this.isSigning=!0;try{await jt.requestSignMessage()}catch(e){if(e instanceof Error&&e.message.includes("OTP is required")){E.showError({message:"Something went wrong. We need to verify your account again."}),h.replace("DataCapture");return}throw e}finally{this.isSigning=!1}}async onCancel(){this.isCancelling=!0,await jt.cancelSignMessage().finally(()=>this.isCancelling=!1)}};si([u()],Tt.prototype,"isCancelling",void 0);si([u()],Tt.prototype,"isSigning",void 0);Tt=si([p("w3m-siwx-sign-message-view")],Tt);export{ci as AppKitAccountButton,ui as AppKitButton,pi as AppKitConnectButton,fi as AppKitNetworkButton,li as W3mAccountButton,be as W3mAccountSettingsView,zt as W3mAccountView,xt as W3mAllWalletsView,di as W3mButton,At as W3mChooseAccountNameView,hi as W3mConnectButton,M as W3mConnectView,It as W3mConnectWalletsView,yi as W3mConnectingExternalView,Ct as W3mConnectingMultiChainView,Et as W3mConnectingWcBasicView,we as W3mConnectingWcView,Ci as W3mDownloadsView,Cr as W3mFooter,Re as W3mFundWalletView,Si as W3mGetWalletView,wi as W3mNetworkButton,ot as W3mNetworkSwitchView,Le as W3mNetworksView,L as W3mProfileWalletsView,Sr as W3mRouter,Tt as W3mSIWXSignMessageView,_t as W3mSwitchActiveChainView,at as W3mUnsupportedChainView,qt as W3mWalletCompatibleNetworksView,Ei as W3mWhatIsANetworkView,ki as W3mWhatIsAWalletView};
