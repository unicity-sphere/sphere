import{i as O,C as J,A as j,O as z,a as M,b as k,c as At,d as u,E as H,R as B,e as U,f as qt,g as Hn,h as ue,H as Kn,j as ee,r as Y,k as ye,T as je,S as Be,M as _n,l as Sn,m as Tn,n as Gn,o as In,w as Ue,p as Qn,q as Jn,s as Yn,t as zt,u as An,W as Pt}from"./core-kVX_dzo0.js";import{n as f,r as P,c as N,o as D,U as se,i as Xn,t as Zn,e as ei,a as ti}from"./index-DYIpa2hw.js";import{az as ni}from"./index-z78fTwNj.js";import"./index-ewuxOhm1.js";var Se=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let fe=class extends O{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=J.state.connectors,this.count=j.state.count,this.filteredCount=j.state.filteredWallets.length,this.isFetchingRecommendedWallets=j.state.isFetchingRecommendedWallets,this.unsubscribe.push(J.subscribeKey("connectors",t=>this.connectors=t),j.subscribeKey("count",t=>this.count=t),j.subscribeKey("filteredWallets",t=>this.filteredCount=t.length),j.subscribeKey("isFetchingRecommendedWallets",t=>this.isFetchingRecommendedWallets=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){const t=this.connectors.find(c=>c.id==="walletConnect"),{allWallets:i}=z.state;if(!t||i==="HIDE"||i==="ONLY_MOBILE"&&!M.isMobile())return null;const r=j.state.featured.length,o=this.count+r,n=o<10?o:Math.floor(o/10)*10,s=this.filteredCount>0?this.filteredCount:n;let a=`${s}`;this.filteredCount>0?a=`${this.filteredCount}`:s<o&&(a=`${s}+`);const l=k.hasAnyConnection(At.CONNECTOR_ID.WALLET_CONNECT);return u`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${a}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${D(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${l}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){H.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),B.push("AllWallets",{redirectView:B.state.data?.redirectView})}};Se([f()],fe.prototype,"tabIdx",void 0);Se([P()],fe.prototype,"connectors",void 0);Se([P()],fe.prototype,"count",void 0);Se([P()],fe.prototype,"filteredCount",void 0);Se([P()],fe.prototype,"isFetchingRecommendedWallets",void 0);fe=Se([N("w3m-all-wallets-widget")],fe);const ii=U`
  :host {
    margin-top: ${({spacing:e})=>e[1]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1)
      ${({spacing:e})=>e[2]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`;var Te=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let de=class extends O{constructor(){super(),this.unsubscribe=[],this.explorerWallets=j.state.explorerWallets,this.connections=k.state.connections,this.connectorImages=qt.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(k.subscribeKey("connections",t=>this.connections=t),qt.subscribeKey("connectorImages",t=>this.connectorImages=t),j.subscribeKey("explorerFilteredWallets",t=>{this.explorerWallets=t?.length?t:j.state.explorerWallets}),j.subscribeKey("explorerWallets",t=>{this.explorerWallets?.length||(this.explorerWallets=t)})),M.isTelegram()&&M.isIos()&&(this.loadingTelegram=!k.state.wcUri,this.unsubscribe.push(k.subscribeKey("wcUri",t=>this.loadingTelegram=!t)))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return u`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){return Hn.connectorList().map((t,i)=>t.kind==="connector"?this.renderConnector(t,i):this.renderWallet(t,i))}getConnectorNamespaces(t){return t.subtype==="walletConnect"?[]:t.subtype==="multiChain"?t.connector.connectors?.map(i=>i.chain)||[]:[t.connector.chain]}renderConnector(t,i){const r=t.connector,o=ue.getConnectorImage(r)||this.connectorImages[r?.imageId??""],s=(this.connections.get(r.chain)??[]).some($=>Kn.isLowerCaseMatch($.connectorId,r.id));let a,l;t.subtype==="walletConnect"?(a="qr code",l="accent"):t.subtype==="injected"||t.subtype==="announced"?(a=s?"connected":"installed",l=s?"info":"success"):(a=void 0,l=void 0);const c=k.hasAnyConnection(At.CONNECTOR_ID.WALLET_CONNECT),d=t.subtype==="walletConnect"||t.subtype==="external"?c:!1;return u`
      <w3m-list-wallet
        displayIndex=${i}
        imageSrc=${D(o)}
        .installed=${!0}
        name=${r.name??"Unknown"}
        .tagVariant=${l}
        tagLabel=${D(a)}
        data-testid=${`wallet-selector-${r.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(t)}
        tabIdx=${D(this.tabIdx)}
        ?disabled=${d}
        rdnsId=${D(r.explorerWallet?.rdns||void 0)}
        walletRank=${D(r.explorerWallet?.order)}
        .namespaces=${this.getConnectorNamespaces(t)}
      >
      </w3m-list-wallet>
    `}onClickConnector(t){const i=B.state.data?.redirectView;if(t.subtype==="walletConnect"){J.setActiveConnector(t.connector),M.isMobile()?B.push("AllWallets"):B.push("ConnectingWalletConnect",{redirectView:i});return}if(t.subtype==="multiChain"){J.setActiveConnector(t.connector),B.push("ConnectingMultiChain",{redirectView:i});return}if(t.subtype==="injected"){J.setActiveConnector(t.connector),B.push("ConnectingExternal",{connector:t.connector,redirectView:i,wallet:t.connector.explorerWallet});return}if(t.subtype==="announced"){if(t.connector.id==="walletConnect"){M.isMobile()?B.push("AllWallets"):B.push("ConnectingWalletConnect",{redirectView:i});return}B.push("ConnectingExternal",{connector:t.connector,redirectView:i,wallet:t.connector.explorerWallet});return}B.push("ConnectingExternal",{connector:t.connector,redirectView:i})}renderWallet(t,i){const r=t.wallet,o=ue.getWalletImage(r),s=k.hasAnyConnection(At.CONNECTOR_ID.WALLET_CONNECT),a=this.loadingTelegram,l=t.subtype==="recent"?"recent":void 0,c=t.subtype==="recent"?"info":void 0;return u`
      <w3m-list-wallet
        displayIndex=${i}
        imageSrc=${D(o)}
        name=${r.name??"Unknown"}
        @click=${()=>this.onClickWallet(t)}
        size="sm"
        data-testid=${`wallet-selector-${r.id}`}
        tabIdx=${D(this.tabIdx)}
        ?loading=${a}
        ?disabled=${s}
        rdnsId=${D(r.rdns||void 0)}
        walletRank=${D(r.order)}
        tagLabel=${D(l)}
        .tagVariant=${c}
      >
      </w3m-list-wallet>
    `}onClickWallet(t){const i=B.state.data?.redirectView,r=ee.state.activeChain;if(t.subtype==="featured"){J.selectWalletConnector(t.wallet);return}if(t.subtype==="recent"){if(this.loadingTelegram)return;J.selectWalletConnector(t.wallet);return}if(t.subtype==="custom"){if(this.loadingTelegram)return;B.push("ConnectingWalletConnect",{wallet:t.wallet,redirectView:i});return}if(this.loadingTelegram)return;const o=r?J.getConnector({id:t.wallet.id,namespace:r}):void 0;o?B.push("ConnectingExternal",{connector:o,redirectView:i}):B.push("ConnectingWalletConnect",{wallet:t.wallet,redirectView:i})}};de.styles=ii;Te([f({type:Number})],de.prototype,"tabIdx",void 0);Te([P()],de.prototype,"explorerWallets",void 0);Te([P()],de.prototype,"connections",void 0);Te([P()],de.prototype,"connectorImages",void 0);Te([P()],de.prototype,"loadingTelegram",void 0);de=Te([N("w3m-connector-list")],de);const ri=U`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`;var ke=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};const oi={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},si={lg:"md",md:"sm",sm:"sm"};let pe=class extends O{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return u`
      <button data-active=${this.active}>
        ${this.icon?u`<wui-icon size=${si[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${oi[this.size]}> ${this.label} </wui-text>
      </button>
    `}};pe.styles=[Y,ye,ri];ke([f()],pe.prototype,"icon",void 0);ke([f()],pe.prototype,"size",void 0);ke([f()],pe.prototype,"label",void 0);ke([f({type:Boolean})],pe.prototype,"active",void 0);pe=ke([N("wui-tab-item")],pe);const ai=U`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;var Le=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let ge=class extends O{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((t,i)=>{const r=i===this.activeTab;return u`
        <wui-tab-item
          @click=${()=>this.onTabClick(i)}
          icon=${t.icon}
          size=${this.size}
          label=${t.label}
          ?active=${r}
          data-active=${r}
          data-testid="tab-${t.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(t){this.activeTab=t,this.onTabChange(t)}};ge.styles=[Y,ye,ai];Le([f({type:Array})],ge.prototype,"tabs",void 0);Le([f()],ge.prototype,"onTabChange",void 0);Le([f()],ge.prototype,"size",void 0);Le([P()],ge.prototype,"activeTab",void 0);ge=Le([N("wui-tabs")],ge);var Bt=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let qe=class extends O{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(t=>t())}render(){const t=this.generateTabs();return u`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${t} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){const t=this.platforms.map(i=>i==="browser"?{label:"Browser",icon:"extension",platform:"browser"}:i==="mobile"?{label:"Mobile",icon:"mobile",platform:"mobile"}:i==="qrcode"?{label:"Mobile",icon:"mobile",platform:"qrcode"}:i==="web"?{label:"Webapp",icon:"browser",platform:"web"}:i==="desktop"?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=t.map(({platform:i})=>i),t}onTabChange(t){const i=this.platformTabs[t];i&&this.onSelectPlatfrom?.(i)}};Bt([f({type:Array})],qe.prototype,"platforms",void 0);Bt([f()],qe.prototype,"onSelectPlatfrom",void 0);qe=Bt([N("w3m-connecting-header")],qe);const li=U`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${e=>e.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var Pn=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let ze=class extends O{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){const t=this.radius>50?50:this.radius,r=36-t,o=116+r,n=245+r,s=360+r*1.75;return u`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${t}
          stroke-dasharray="${o} ${n}"
          stroke-dashoffset=${s}
        />
      </svg>
    `}};ze.styles=[Y,li];Pn([f({type:Number})],ze.prototype,"radius",void 0);ze=Pn([N("wui-loading-thumbnail")],ze);const ci=U`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;var Xe=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Re=class extends O{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return u`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};Re.styles=[Y,ye,ci];Xe([f({type:Boolean})],Re.prototype,"disabled",void 0);Xe([f()],Re.prototype,"label",void 0);Xe([f()],Re.prototype,"buttonLabel",void 0);Re=Xe([N("wui-cta-button")],Re);const ui=U`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e[5]} ${({spacing:e})=>e[5]};
  }
`;var Wn=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Fe=class extends O{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;const{name:t,app_store:i,play_store:r,chrome_store:o,homepage:n}=this.wallet,s=M.isMobile(),a=M.isIos(),l=M.isAndroid(),c=[i,r,n,o].filter(Boolean).length>1,d=se.getTruncateString({string:t,charsStart:12,charsEnd:0,truncate:"end"});return c&&!s?u`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${()=>B.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!c&&n?u`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:i&&a?u`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:r&&l?u`
        <wui-cta-button
          label=${`Don't have ${d}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&M.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&M.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&M.openHref(this.wallet.homepage,"_blank")}};Fe.styles=[ui];Wn([f({type:Object})],Fe.prototype,"wallet",void 0);Fe=Wn([N("w3m-mobile-download-links")],Fe);const di=U`
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
    right: calc(${({spacing:e})=>e[1]} * -1);
    bottom: calc(${({spacing:e})=>e[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e["ease-out-power-2"]} both;
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
`;var X=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};class q extends O{constructor(){super(),this.wallet=B.state.data?.wallet,this.connector=B.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=ue.getConnectorImage(this.connector)??ue.getWalletImage(this.wallet),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=k.state.wcUri,this.error=k.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(k.subscribeKey("wcUri",t=>{this.uri=t,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),k.subscribeKey("wcError",t=>this.error=t)),(M.isTelegram()||M.isSafari())&&M.isIos()&&k.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),k.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();const t=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel;let i="";return this.label?i=this.label:(i=`Continue in ${this.name}`,this.error&&(i="Connection declined")),u`
      <wui-flex
        data-error=${D(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${D(this.imageSrc)}></wui-wallet-image>

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
          <wui-text align="center" variant="lg-regular" color="secondary">${t}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?u`
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

      ${this.isWalletConnect?u`
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
    `}onShowRetry(){this.error&&!this.showRetry&&(this.showRetry=!0,this.shadowRoot?.querySelector("wui-button")?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"}))}onTryAgain(){k.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){const t=je.state.themeVariables["--w3m-border-radius-master"],i=t?parseInt(t.replace("px",""),10):4;return u`<wui-loading-thumbnail radius=${i*9}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(M.copyToClopboard(this.uri),Be.showSuccess("Link copied"))}catch{Be.showError("Failed to copy")}}}q.styles=di;X([P()],q.prototype,"isRetrying",void 0);X([P()],q.prototype,"uri",void 0);X([P()],q.prototype,"error",void 0);X([P()],q.prototype,"ready",void 0);X([P()],q.prototype,"showRetry",void 0);X([P()],q.prototype,"label",void 0);X([P()],q.prototype,"secondaryBtnLabel",void 0);X([P()],q.prototype,"secondaryLabel",void 0);X([P()],q.prototype,"isLoading",void 0);X([f({type:Boolean})],q.prototype,"isMobile",void 0);X([f()],q.prototype,"onRetry",void 0);var hi=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Ft=class extends q{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:B.state.view}})}async onConnectProxy(){try{this.error=!1;const{connectors:t}=J.state,i=t.find(r=>r.type==="ANNOUNCED"&&r.info?.rdns===this.wallet?.rdns||r.type==="INJECTED"||r.name===this.wallet?.name);if(i)await k.connectExternal(i,i.chain);else throw new Error("w3m-connecting-wc-browser: No connector found");_n.close()}catch(t){t instanceof Sn&&t.originalName===Tn.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?H.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:t.message}}):H.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:t?.message??"Unknown"}}),this.error=!0}}};Ft=hi([N("w3m-connecting-wc-browser")],Ft);var fi=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Vt=class extends q{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:B.state.view}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;const{desktop_link:t,name:i}=this.wallet,{redirect:r,href:o}=M.formatNativeUrl(t,this.uri);k.setWcLinking({name:i,href:o}),k.setRecentWallet(this.wallet),M.openHref(r,"_blank")}catch{this.error=!0}}};Vt=fi([N("w3m-connecting-wc-desktop")],Vt);var Ie=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let we=class extends q{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=z.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{Gn.onConnectMobile(this.wallet)},!this.wallet)throw new Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=In.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(k.subscribeKey("wcUri",()=>{this.onHandleURI()})),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:B.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){k.setWcError(!1),this.onConnect?.()}};Ie([P()],we.prototype,"redirectDeeplink",void 0);Ie([P()],we.prototype,"redirectUniversalLink",void 0);Ie([P()],we.prototype,"target",void 0);Ie([P()],we.prototype,"preferUniversalLinks",void 0);Ie([P()],we.prototype,"isLoading",void 0);we=Ie([N("w3m-connecting-wc-mobile")],we);var Ee={},rt,Ht;function pi(){return Ht||(Ht=1,rt=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}),rt}var ot={},ce={},Kt;function ve(){if(Kt)return ce;Kt=1;let e;const t=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];return ce.getSymbolSize=function(r){if(!r)throw new Error('"version" cannot be null or undefined');if(r<1||r>40)throw new Error('"version" should be in range from 1 to 40');return r*4+17},ce.getSymbolTotalCodewords=function(r){return t[r]},ce.getBCHDigit=function(i){let r=0;for(;i!==0;)r++,i>>>=1;return r},ce.setToSJISFunction=function(r){if(typeof r!="function")throw new Error('"toSJISFunc" is not a valid function.');e=r},ce.isKanjiModeEnabled=function(){return typeof e<"u"},ce.toSJIS=function(r){return e(r)},ce}var st={},Gt;function kt(){return Gt||(Gt=1,(function(e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(i){if(typeof i!="string")throw new Error("Param is not a string");switch(i.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+i)}}e.isValid=function(r){return r&&typeof r.bit<"u"&&r.bit>=0&&r.bit<4},e.from=function(r,o){if(e.isValid(r))return r;try{return t(r)}catch{return o}}})(st)),st}var at,Qt;function gi(){if(Qt)return at;Qt=1;function e(){this.buffer=[],this.length=0}return e.prototype={get:function(t){const i=Math.floor(t/8);return(this.buffer[i]>>>7-t%8&1)===1},put:function(t,i){for(let r=0;r<i;r++)this.putBit((t>>>i-r-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(t){const i=Math.floor(this.length/8);this.buffer.length<=i&&this.buffer.push(0),t&&(this.buffer[i]|=128>>>this.length%8),this.length++}},at=e,at}var lt,Jt;function wi(){if(Jt)return lt;Jt=1;function e(t){if(!t||t<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=t,this.data=new Uint8Array(t*t),this.reservedBit=new Uint8Array(t*t)}return e.prototype.set=function(t,i,r,o){const n=t*this.size+i;this.data[n]=r,o&&(this.reservedBit[n]=!0)},e.prototype.get=function(t,i){return this.data[t*this.size+i]},e.prototype.xor=function(t,i,r){this.data[t*this.size+i]^=r},e.prototype.isReserved=function(t,i){return this.reservedBit[t*this.size+i]},lt=e,lt}var ct={},Yt;function mi(){return Yt||(Yt=1,(function(e){const t=ve().getSymbolSize;e.getRowColCoords=function(r){if(r===1)return[];const o=Math.floor(r/7)+2,n=t(r),s=n===145?26:Math.ceil((n-13)/(2*o-2))*2,a=[n-7];for(let l=1;l<o-1;l++)a[l]=a[l-1]-s;return a.push(6),a.reverse()},e.getPositions=function(r){const o=[],n=e.getRowColCoords(r),s=n.length;for(let a=0;a<s;a++)for(let l=0;l<s;l++)a===0&&l===0||a===0&&l===s-1||a===s-1&&l===0||o.push([n[a],n[l]]);return o}})(ct)),ct}var ut={},Xt;function bi(){if(Xt)return ut;Xt=1;const e=ve().getSymbolSize,t=7;return ut.getPositions=function(r){const o=e(r);return[[0,0],[o-t,0],[0,o-t]]},ut}var dt={},Zt;function yi(){return Zt||(Zt=1,(function(e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(o){return o!=null&&o!==""&&!isNaN(o)&&o>=0&&o<=7},e.from=function(o){return e.isValid(o)?parseInt(o,10):void 0},e.getPenaltyN1=function(o){const n=o.size;let s=0,a=0,l=0,c=null,d=null;for(let $=0;$<n;$++){a=l=0,c=d=null;for(let v=0;v<n;v++){let p=o.get($,v);p===c?a++:(a>=5&&(s+=t.N1+(a-5)),c=p,a=1),p=o.get(v,$),p===d?l++:(l>=5&&(s+=t.N1+(l-5)),d=p,l=1)}a>=5&&(s+=t.N1+(a-5)),l>=5&&(s+=t.N1+(l-5))}return s},e.getPenaltyN2=function(o){const n=o.size;let s=0;for(let a=0;a<n-1;a++)for(let l=0;l<n-1;l++){const c=o.get(a,l)+o.get(a,l+1)+o.get(a+1,l)+o.get(a+1,l+1);(c===4||c===0)&&s++}return s*t.N2},e.getPenaltyN3=function(o){const n=o.size;let s=0,a=0,l=0;for(let c=0;c<n;c++){a=l=0;for(let d=0;d<n;d++)a=a<<1&2047|o.get(c,d),d>=10&&(a===1488||a===93)&&s++,l=l<<1&2047|o.get(d,c),d>=10&&(l===1488||l===93)&&s++}return s*t.N3},e.getPenaltyN4=function(o){let n=0;const s=o.data.length;for(let l=0;l<s;l++)n+=o.data[l];return Math.abs(Math.ceil(n*100/s/5)-10)*t.N4};function i(r,o,n){switch(r){case e.Patterns.PATTERN000:return(o+n)%2===0;case e.Patterns.PATTERN001:return o%2===0;case e.Patterns.PATTERN010:return n%3===0;case e.Patterns.PATTERN011:return(o+n)%3===0;case e.Patterns.PATTERN100:return(Math.floor(o/2)+Math.floor(n/3))%2===0;case e.Patterns.PATTERN101:return o*n%2+o*n%3===0;case e.Patterns.PATTERN110:return(o*n%2+o*n%3)%2===0;case e.Patterns.PATTERN111:return(o*n%3+(o+n)%2)%2===0;default:throw new Error("bad maskPattern:"+r)}}e.applyMask=function(o,n){const s=n.size;for(let a=0;a<s;a++)for(let l=0;l<s;l++)n.isReserved(l,a)||n.xor(l,a,i(o,l,a))},e.getBestMask=function(o,n){const s=Object.keys(e.Patterns).length;let a=0,l=1/0;for(let c=0;c<s;c++){n(c),e.applyMask(c,o);const d=e.getPenaltyN1(o)+e.getPenaltyN2(o)+e.getPenaltyN3(o)+e.getPenaltyN4(o);e.applyMask(c,o),d<l&&(l=d,a=c)}return a}})(dt)),dt}var De={},en;function Bn(){if(en)return De;en=1;const e=kt(),t=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],i=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];return De.getBlocksCount=function(o,n){switch(n){case e.L:return t[(o-1)*4+0];case e.M:return t[(o-1)*4+1];case e.Q:return t[(o-1)*4+2];case e.H:return t[(o-1)*4+3];default:return}},De.getTotalCodewordsCount=function(o,n){switch(n){case e.L:return i[(o-1)*4+0];case e.M:return i[(o-1)*4+1];case e.Q:return i[(o-1)*4+2];case e.H:return i[(o-1)*4+3];default:return}},De}var ht={},Pe={},tn;function vi(){if(tn)return Pe;tn=1;const e=new Uint8Array(512),t=new Uint8Array(256);return(function(){let r=1;for(let o=0;o<255;o++)e[o]=r,t[r]=o,r<<=1,r&256&&(r^=285);for(let o=255;o<512;o++)e[o]=e[o-255]})(),Pe.log=function(r){if(r<1)throw new Error("log("+r+")");return t[r]},Pe.exp=function(r){return e[r]},Pe.mul=function(r,o){return r===0||o===0?0:e[t[r]+t[o]]},Pe}var nn;function Ci(){return nn||(nn=1,(function(e){const t=vi();e.mul=function(r,o){const n=new Uint8Array(r.length+o.length-1);for(let s=0;s<r.length;s++)for(let a=0;a<o.length;a++)n[s+a]^=t.mul(r[s],o[a]);return n},e.mod=function(r,o){let n=new Uint8Array(r);for(;n.length-o.length>=0;){const s=n[0];for(let l=0;l<o.length;l++)n[l]^=t.mul(o[l],s);let a=0;for(;a<n.length&&n[a]===0;)a++;n=n.slice(a)}return n},e.generateECPolynomial=function(r){let o=new Uint8Array([1]);for(let n=0;n<r;n++)o=e.mul(o,new Uint8Array([1,t.exp(n)]));return o}})(ht)),ht}var ft,rn;function $i(){if(rn)return ft;rn=1;const e=Ci();function t(i){this.genPoly=void 0,this.degree=i,this.degree&&this.initialize(this.degree)}return t.prototype.initialize=function(r){this.degree=r,this.genPoly=e.generateECPolynomial(this.degree)},t.prototype.encode=function(r){if(!this.genPoly)throw new Error("Encoder not initialized");const o=new Uint8Array(r.length+this.degree);o.set(r);const n=e.mod(o,this.genPoly),s=this.degree-n.length;if(s>0){const a=new Uint8Array(this.degree);return a.set(n,s),a}return n},ft=t,ft}var pt={},gt={},wt={},on;function kn(){return on||(on=1,wt.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40}),wt}var Z={},sn;function Ln(){if(sn)return Z;sn=1;const e="[0-9]+",t="[A-Z $%*+\\-./:]+";let i="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";i=i.replace(/u/g,"\\u");const r="(?:(?![A-Z0-9 $%*+\\-./:]|"+i+`)(?:.|[\r
]))+`;Z.KANJI=new RegExp(i,"g"),Z.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),Z.BYTE=new RegExp(r,"g"),Z.NUMERIC=new RegExp(e,"g"),Z.ALPHANUMERIC=new RegExp(t,"g");const o=new RegExp("^"+i+"$"),n=new RegExp("^"+e+"$"),s=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");return Z.testKanji=function(l){return o.test(l)},Z.testNumeric=function(l){return n.test(l)},Z.testAlphanumeric=function(l){return s.test(l)},Z}var an;function Ce(){return an||(an=1,(function(e){const t=kn(),i=Ln();e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(n,s){if(!n.ccBits)throw new Error("Invalid mode: "+n);if(!t.isValid(s))throw new Error("Invalid version: "+s);return s>=1&&s<10?n.ccBits[0]:s<27?n.ccBits[1]:n.ccBits[2]},e.getBestModeForData=function(n){return i.testNumeric(n)?e.NUMERIC:i.testAlphanumeric(n)?e.ALPHANUMERIC:i.testKanji(n)?e.KANJI:e.BYTE},e.toString=function(n){if(n&&n.id)return n.id;throw new Error("Invalid mode")},e.isValid=function(n){return n&&n.bit&&n.ccBits};function r(o){if(typeof o!="string")throw new Error("Param is not a string");switch(o.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+o)}}e.from=function(n,s){if(e.isValid(n))return n;try{return r(n)}catch{return s}}})(gt)),gt}var ln;function xi(){return ln||(ln=1,(function(e){const t=ve(),i=Bn(),r=kt(),o=Ce(),n=kn(),s=7973,a=t.getBCHDigit(s);function l(v,p,_){for(let w=1;w<=40;w++)if(p<=e.getCapacity(w,_,v))return w}function c(v,p){return o.getCharCountIndicator(v,p)+4}function d(v,p){let _=0;return v.forEach(function(w){const S=c(w.mode,p);_+=S+w.getBitsLength()}),_}function $(v,p){for(let _=1;_<=40;_++)if(d(v,_)<=e.getCapacity(_,p,o.MIXED))return _}e.from=function(p,_){return n.isValid(p)?parseInt(p,10):_},e.getCapacity=function(p,_,w){if(!n.isValid(p))throw new Error("Invalid QR Code version");typeof w>"u"&&(w=o.BYTE);const S=t.getSymbolTotalCodewords(p),m=i.getTotalCodewordsCount(p,_),g=(S-m)*8;if(w===o.MIXED)return g;const b=g-c(w,p);switch(w){case o.NUMERIC:return Math.floor(b/10*3);case o.ALPHANUMERIC:return Math.floor(b/11*2);case o.KANJI:return Math.floor(b/13);case o.BYTE:default:return Math.floor(b/8)}},e.getBestVersionForData=function(p,_){let w;const S=r.from(_,r.M);if(Array.isArray(p)){if(p.length>1)return $(p,S);if(p.length===0)return 1;w=p[0]}else w=p;return l(w.mode,w.getLength(),S)},e.getEncodedBits=function(p){if(!n.isValid(p)||p<7)throw new Error("Invalid QR Code version");let _=p<<12;for(;t.getBCHDigit(_)-a>=0;)_^=s<<t.getBCHDigit(_)-a;return p<<12|_}})(pt)),pt}var mt={},cn;function Ei(){if(cn)return mt;cn=1;const e=ve(),t=1335,i=21522,r=e.getBCHDigit(t);return mt.getEncodedBits=function(n,s){const a=n.bit<<3|s;let l=a<<10;for(;e.getBCHDigit(l)-r>=0;)l^=t<<e.getBCHDigit(l)-r;return(a<<10|l)^i},mt}var bt={},yt,un;function Ri(){if(un)return yt;un=1;const e=Ce();function t(i){this.mode=e.NUMERIC,this.data=i.toString()}return t.getBitsLength=function(r){return 10*Math.floor(r/3)+(r%3?r%3*3+1:0)},t.prototype.getLength=function(){return this.data.length},t.prototype.getBitsLength=function(){return t.getBitsLength(this.data.length)},t.prototype.write=function(r){let o,n,s;for(o=0;o+3<=this.data.length;o+=3)n=this.data.substr(o,3),s=parseInt(n,10),r.put(s,10);const a=this.data.length-o;a>0&&(n=this.data.substr(o),s=parseInt(n,10),r.put(s,a*3+1))},yt=t,yt}var vt,dn;function _i(){if(dn)return vt;dn=1;const e=Ce(),t=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function i(r){this.mode=e.ALPHANUMERIC,this.data=r}return i.getBitsLength=function(o){return 11*Math.floor(o/2)+6*(o%2)},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(o){let n;for(n=0;n+2<=this.data.length;n+=2){let s=t.indexOf(this.data[n])*45;s+=t.indexOf(this.data[n+1]),o.put(s,11)}this.data.length%2&&o.put(t.indexOf(this.data[n]),6)},vt=i,vt}var Ct,hn;function Si(){return hn||(hn=1,Ct=function(t){for(var i=[],r=t.length,o=0;o<r;o++){var n=t.charCodeAt(o);if(n>=55296&&n<=56319&&r>o+1){var s=t.charCodeAt(o+1);s>=56320&&s<=57343&&(n=(n-55296)*1024+s-56320+65536,o+=1)}if(n<128){i.push(n);continue}if(n<2048){i.push(n>>6|192),i.push(n&63|128);continue}if(n<55296||n>=57344&&n<65536){i.push(n>>12|224),i.push(n>>6&63|128),i.push(n&63|128);continue}if(n>=65536&&n<=1114111){i.push(n>>18|240),i.push(n>>12&63|128),i.push(n>>6&63|128),i.push(n&63|128);continue}i.push(239,191,189)}return new Uint8Array(i).buffer}),Ct}var $t,fn;function Ti(){if(fn)return $t;fn=1;const e=Si(),t=Ce();function i(r){this.mode=t.BYTE,typeof r=="string"&&(r=e(r)),this.data=new Uint8Array(r)}return i.getBitsLength=function(o){return o*8},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(r){for(let o=0,n=this.data.length;o<n;o++)r.put(this.data[o],8)},$t=i,$t}var xt,pn;function Ii(){if(pn)return xt;pn=1;const e=Ce(),t=ve();function i(r){this.mode=e.KANJI,this.data=r}return i.getBitsLength=function(o){return o*13},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(r){let o;for(o=0;o<this.data.length;o++){let n=t.toSJIS(this.data[o]);if(n>=33088&&n<=40956)n-=33088;else if(n>=57408&&n<=60351)n-=49472;else throw new Error("Invalid SJIS character: "+this.data[o]+`
Make sure your charset is UTF-8`);n=(n>>>8&255)*192+(n&255),r.put(n,13)}},xt=i,xt}var Et={exports:{}},gn;function Ai(){return gn||(gn=1,(function(e){var t={single_source_shortest_paths:function(i,r,o){var n={},s={};s[r]=0;var a=t.PriorityQueue.make();a.push(r,0);for(var l,c,d,$,v,p,_,w,S;!a.empty();){l=a.pop(),c=l.value,$=l.cost,v=i[c]||{};for(d in v)v.hasOwnProperty(d)&&(p=v[d],_=$+p,w=s[d],S=typeof s[d]>"u",(S||w>_)&&(s[d]=_,a.push(d,_),n[d]=c))}if(typeof o<"u"&&typeof s[o]>"u"){var m=["Could not find a path from ",r," to ",o,"."].join("");throw new Error(m)}return n},extract_shortest_path_from_predecessor_list:function(i,r){for(var o=[],n=r;n;)o.push(n),i[n],n=i[n];return o.reverse(),o},find_path:function(i,r,o){var n=t.single_source_shortest_paths(i,r,o);return t.extract_shortest_path_from_predecessor_list(n,o)},PriorityQueue:{make:function(i){var r=t.PriorityQueue,o={},n;i=i||{};for(n in r)r.hasOwnProperty(n)&&(o[n]=r[n]);return o.queue=[],o.sorter=i.sorter||r.default_sorter,o},default_sorter:function(i,r){return i.cost-r.cost},push:function(i,r){var o={value:i,cost:r};this.queue.push(o),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};e.exports=t})(Et)),Et.exports}var wn;function Pi(){return wn||(wn=1,(function(e){const t=Ce(),i=Ri(),r=_i(),o=Ti(),n=Ii(),s=Ln(),a=ve(),l=Ai();function c(m){return unescape(encodeURIComponent(m)).length}function d(m,g,b){const h=[];let L;for(;(L=m.exec(b))!==null;)h.push({data:L[0],index:L.index,mode:g,length:L[0].length});return h}function $(m){const g=d(s.NUMERIC,t.NUMERIC,m),b=d(s.ALPHANUMERIC,t.ALPHANUMERIC,m);let h,L;return a.isKanjiModeEnabled()?(h=d(s.BYTE,t.BYTE,m),L=d(s.KANJI,t.KANJI,m)):(h=d(s.BYTE_KANJI,t.BYTE,m),L=[]),g.concat(b,h,L).sort(function(T,R){return T.index-R.index}).map(function(T){return{data:T.data,mode:T.mode,length:T.length}})}function v(m,g){switch(g){case t.NUMERIC:return i.getBitsLength(m);case t.ALPHANUMERIC:return r.getBitsLength(m);case t.KANJI:return n.getBitsLength(m);case t.BYTE:return o.getBitsLength(m)}}function p(m){return m.reduce(function(g,b){const h=g.length-1>=0?g[g.length-1]:null;return h&&h.mode===b.mode?(g[g.length-1].data+=b.data,g):(g.push(b),g)},[])}function _(m){const g=[];for(let b=0;b<m.length;b++){const h=m[b];switch(h.mode){case t.NUMERIC:g.push([h,{data:h.data,mode:t.ALPHANUMERIC,length:h.length},{data:h.data,mode:t.BYTE,length:h.length}]);break;case t.ALPHANUMERIC:g.push([h,{data:h.data,mode:t.BYTE,length:h.length}]);break;case t.KANJI:g.push([h,{data:h.data,mode:t.BYTE,length:c(h.data)}]);break;case t.BYTE:g.push([{data:h.data,mode:t.BYTE,length:c(h.data)}])}}return g}function w(m,g){const b={},h={start:{}};let L=["start"];for(let C=0;C<m.length;C++){const T=m[C],R=[];for(let y=0;y<T.length;y++){const A=T[y],x=""+C+y;R.push(x),b[x]={node:A,lastCount:0},h[x]={};for(let I=0;I<L.length;I++){const E=L[I];b[E]&&b[E].node.mode===A.mode?(h[E][x]=v(b[E].lastCount+A.length,A.mode)-v(b[E].lastCount,A.mode),b[E].lastCount+=A.length):(b[E]&&(b[E].lastCount=A.length),h[E][x]=v(A.length,A.mode)+4+t.getCharCountIndicator(A.mode,g))}}L=R}for(let C=0;C<L.length;C++)h[L[C]].end=0;return{map:h,table:b}}function S(m,g){let b;const h=t.getBestModeForData(m);if(b=t.from(g,h),b!==t.BYTE&&b.bit<h.bit)throw new Error('"'+m+'" cannot be encoded with mode '+t.toString(b)+`.
 Suggested mode is: `+t.toString(h));switch(b===t.KANJI&&!a.isKanjiModeEnabled()&&(b=t.BYTE),b){case t.NUMERIC:return new i(m);case t.ALPHANUMERIC:return new r(m);case t.KANJI:return new n(m);case t.BYTE:return new o(m)}}e.fromArray=function(g){return g.reduce(function(b,h){return typeof h=="string"?b.push(S(h,null)):h.data&&b.push(S(h.data,h.mode)),b},[])},e.fromString=function(g,b){const h=$(g,a.isKanjiModeEnabled()),L=_(h),C=w(L,b),T=l.find_path(C.map,"start","end"),R=[];for(let y=1;y<T.length-1;y++)R.push(C.table[T[y]].node);return e.fromArray(p(R))},e.rawSplit=function(g){return e.fromArray($(g,a.isKanjiModeEnabled()))}})(bt)),bt}var mn;function Wi(){if(mn)return ot;mn=1;const e=ve(),t=kt(),i=gi(),r=wi(),o=mi(),n=bi(),s=yi(),a=Bn(),l=$i(),c=xi(),d=Ei(),$=Ce(),v=Pi();function p(C,T){const R=C.size,y=n.getPositions(T);for(let A=0;A<y.length;A++){const x=y[A][0],I=y[A][1];for(let E=-1;E<=7;E++)if(!(x+E<=-1||R<=x+E))for(let W=-1;W<=7;W++)I+W<=-1||R<=I+W||(E>=0&&E<=6&&(W===0||W===6)||W>=0&&W<=6&&(E===0||E===6)||E>=2&&E<=4&&W>=2&&W<=4?C.set(x+E,I+W,!0,!0):C.set(x+E,I+W,!1,!0))}}function _(C){const T=C.size;for(let R=8;R<T-8;R++){const y=R%2===0;C.set(R,6,y,!0),C.set(6,R,y,!0)}}function w(C,T){const R=o.getPositions(T);for(let y=0;y<R.length;y++){const A=R[y][0],x=R[y][1];for(let I=-2;I<=2;I++)for(let E=-2;E<=2;E++)I===-2||I===2||E===-2||E===2||I===0&&E===0?C.set(A+I,x+E,!0,!0):C.set(A+I,x+E,!1,!0)}}function S(C,T){const R=C.size,y=c.getEncodedBits(T);let A,x,I;for(let E=0;E<18;E++)A=Math.floor(E/3),x=E%3+R-8-3,I=(y>>E&1)===1,C.set(A,x,I,!0),C.set(x,A,I,!0)}function m(C,T,R){const y=C.size,A=d.getEncodedBits(T,R);let x,I;for(x=0;x<15;x++)I=(A>>x&1)===1,x<6?C.set(x,8,I,!0):x<8?C.set(x+1,8,I,!0):C.set(y-15+x,8,I,!0),x<8?C.set(8,y-x-1,I,!0):x<9?C.set(8,15-x-1+1,I,!0):C.set(8,15-x-1,I,!0);C.set(y-8,8,1,!0)}function g(C,T){const R=C.size;let y=-1,A=R-1,x=7,I=0;for(let E=R-1;E>0;E-=2)for(E===6&&E--;;){for(let W=0;W<2;W++)if(!C.isReserved(A,E-W)){let le=!1;I<T.length&&(le=(T[I]>>>x&1)===1),C.set(A,E-W,le),x--,x===-1&&(I++,x=7)}if(A+=y,A<0||R<=A){A-=y,y=-y;break}}}function b(C,T,R){const y=new i;R.forEach(function(W){y.put(W.mode.bit,4),y.put(W.getLength(),$.getCharCountIndicator(W.mode,C)),W.write(y)});const A=e.getSymbolTotalCodewords(C),x=a.getTotalCodewordsCount(C,T),I=(A-x)*8;for(y.getLengthInBits()+4<=I&&y.put(0,4);y.getLengthInBits()%8!==0;)y.putBit(0);const E=(I-y.getLengthInBits())/8;for(let W=0;W<E;W++)y.put(W%2?17:236,8);return h(y,C,T)}function h(C,T,R){const y=e.getSymbolTotalCodewords(T),A=a.getTotalCodewordsCount(T,R),x=y-A,I=a.getBlocksCount(T,R),E=y%I,W=I-E,le=Math.floor(y/I),Ae=Math.floor(x/I),zn=Ae+1,Dt=le-Ae,Fn=new l(Dt);let et=0;const Oe=new Array(I),jt=new Array(I);let tt=0;const Vn=new Uint8Array(C.buffer);for(let xe=0;xe<I;xe++){const it=xe<W?Ae:zn;Oe[xe]=Vn.slice(et,et+it),jt[xe]=Fn.encode(Oe[xe]),et+=it,tt=Math.max(tt,it)}const nt=new Uint8Array(y);let Ut=0,ie,re;for(ie=0;ie<tt;ie++)for(re=0;re<I;re++)ie<Oe[re].length&&(nt[Ut++]=Oe[re][ie]);for(ie=0;ie<Dt;ie++)for(re=0;re<I;re++)nt[Ut++]=jt[re][ie];return nt}function L(C,T,R,y){let A;if(Array.isArray(C))A=v.fromArray(C);else if(typeof C=="string"){let le=T;if(!le){const Ae=v.rawSplit(C);le=c.getBestVersionForData(Ae,R)}A=v.fromString(C,le||40)}else throw new Error("Invalid data");const x=c.getBestVersionForData(A,R);if(!x)throw new Error("The amount of data is too big to be stored in a QR Code");if(!T)T=x;else if(T<x)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+x+`.
`);const I=b(T,R,A),E=e.getSymbolSize(T),W=new r(E);return p(W,T),_(W),w(W,T),m(W,R,0),T>=7&&S(W,T),g(W,I),isNaN(y)&&(y=s.getBestMask(W,m.bind(null,W,R))),s.applyMask(y,W),m(W,R,y),{modules:W,version:T,errorCorrectionLevel:R,maskPattern:y,segments:A}}return ot.create=function(T,R){if(typeof T>"u"||T==="")throw new Error("No input text");let y=t.M,A,x;return typeof R<"u"&&(y=t.from(R.errorCorrectionLevel,t.M),A=c.from(R.version),x=s.from(R.maskPattern),R.toSJISFunc&&e.setToSJISFunction(R.toSJISFunc)),L(T,A,y,x)},ot}var Rt={},_t={},bn;function Nn(){return bn||(bn=1,(function(e){function t(i){if(typeof i=="number"&&(i=i.toString()),typeof i!="string")throw new Error("Color should be defined as hex string");let r=i.slice().replace("#","").split("");if(r.length<3||r.length===5||r.length>8)throw new Error("Invalid hex color: "+i);(r.length===3||r.length===4)&&(r=Array.prototype.concat.apply([],r.map(function(n){return[n,n]}))),r.length===6&&r.push("F","F");const o=parseInt(r.join(""),16);return{r:o>>24&255,g:o>>16&255,b:o>>8&255,a:o&255,hex:"#"+r.slice(0,6).join("")}}e.getOptions=function(r){r||(r={}),r.color||(r.color={});const o=typeof r.margin>"u"||r.margin===null||r.margin<0?4:r.margin,n=r.width&&r.width>=21?r.width:void 0,s=r.scale||4;return{width:n,scale:n?4:s,margin:o,color:{dark:t(r.color.dark||"#000000ff"),light:t(r.color.light||"#ffffffff")},type:r.type,rendererOpts:r.rendererOpts||{}}},e.getScale=function(r,o){return o.width&&o.width>=r+o.margin*2?o.width/(r+o.margin*2):o.scale},e.getImageWidth=function(r,o){const n=e.getScale(r,o);return Math.floor((r+o.margin*2)*n)},e.qrToImageData=function(r,o,n){const s=o.modules.size,a=o.modules.data,l=e.getScale(s,n),c=Math.floor((s+n.margin*2)*l),d=n.margin*l,$=[n.color.light,n.color.dark];for(let v=0;v<c;v++)for(let p=0;p<c;p++){let _=(v*c+p)*4,w=n.color.light;if(v>=d&&p>=d&&v<c-d&&p<c-d){const S=Math.floor((v-d)/l),m=Math.floor((p-d)/l);w=$[a[S*s+m]?1:0]}r[_++]=w.r,r[_++]=w.g,r[_++]=w.b,r[_]=w.a}}})(_t)),_t}var yn;function Bi(){return yn||(yn=1,(function(e){const t=Nn();function i(o,n,s){o.clearRect(0,0,n.width,n.height),n.style||(n.style={}),n.height=s,n.width=s,n.style.height=s+"px",n.style.width=s+"px"}function r(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(n,s,a){let l=a,c=s;typeof l>"u"&&(!s||!s.getContext)&&(l=s,s=void 0),s||(c=r()),l=t.getOptions(l);const d=t.getImageWidth(n.modules.size,l),$=c.getContext("2d"),v=$.createImageData(d,d);return t.qrToImageData(v.data,n,l),i($,c,d),$.putImageData(v,0,0),c},e.renderToDataURL=function(n,s,a){let l=a;typeof l>"u"&&(!s||!s.getContext)&&(l=s,s=void 0),l||(l={});const c=e.render(n,s,l),d=l.type||"image/png",$=l.rendererOpts||{};return c.toDataURL(d,$.quality)}})(Rt)),Rt}var St={},vn;function ki(){if(vn)return St;vn=1;const e=Nn();function t(o,n){const s=o.a/255,a=n+'="'+o.hex+'"';return s<1?a+" "+n+'-opacity="'+s.toFixed(2).slice(1)+'"':a}function i(o,n,s){let a=o+n;return typeof s<"u"&&(a+=" "+s),a}function r(o,n,s){let a="",l=0,c=!1,d=0;for(let $=0;$<o.length;$++){const v=Math.floor($%n),p=Math.floor($/n);!v&&!c&&(c=!0),o[$]?(d++,$>0&&v>0&&o[$-1]||(a+=c?i("M",v+s,.5+p+s):i("m",l,0),l=0,c=!1),v+1<n&&o[$+1]||(a+=i("h",d),d=0)):l++}return a}return St.render=function(n,s,a){const l=e.getOptions(s),c=n.modules.size,d=n.modules.data,$=c+l.margin*2,v=l.color.light.a?"<path "+t(l.color.light,"fill")+' d="M0 0h'+$+"v"+$+'H0z"/>':"",p="<path "+t(l.color.dark,"stroke")+' d="'+r(d,c,l.margin)+'"/>',_='viewBox="0 0 '+$+" "+$+'"',S='<svg xmlns="http://www.w3.org/2000/svg" '+(l.width?'width="'+l.width+'" height="'+l.width+'" ':"")+_+' shape-rendering="crispEdges">'+v+p+`</svg>
`;return typeof a=="function"&&a(null,S),S},St}var Cn;function Li(){if(Cn)return Ee;Cn=1;const e=pi(),t=Wi(),i=Bi(),r=ki();function o(n,s,a,l,c){const d=[].slice.call(arguments,1),$=d.length,v=typeof d[$-1]=="function";if(!v&&!e())throw new Error("Callback required as last argument");if(v){if($<2)throw new Error("Too few arguments provided");$===2?(c=a,a=s,s=l=void 0):$===3&&(s.getContext&&typeof c>"u"?(c=l,l=void 0):(c=l,l=a,a=s,s=void 0))}else{if($<1)throw new Error("Too few arguments provided");return $===1?(a=s,s=l=void 0):$===2&&!s.getContext&&(l=a,a=s,s=void 0),new Promise(function(p,_){try{const w=t.create(a,l);p(n(w,s,l))}catch(w){_(w)}})}try{const p=t.create(a,l);c(null,n(p,s,l))}catch(p){c(p)}}return Ee.create=t.create,Ee.toCanvas=o.bind(null,i.render),Ee.toDataURL=o.bind(null,i.renderToDataURL),Ee.toString=o.bind(null,function(n,s,a){return r.render(n,a)}),Ee}var Ni=Li();const Mi=ni(Ni),Oi=.1,$n=2.5,oe=7;function Tt(e,t,i){return e===t?!1:(e-t<0?t-e:e-t)<=i+Oi}function Di(e,t){const i=Array.prototype.slice.call(Mi.create(e,{errorCorrectionLevel:t}).modules.data,0),r=Math.sqrt(i.length);return i.reduce((o,n,s)=>(s%r===0?o.push([n]):o[o.length-1].push(n))&&o,[])}const ji={generate({uri:e,size:t,logoSize:i,padding:r=8,dotColor:o="var(--apkt-colors-black)"}){const s=[],a=Di(e,"Q"),l=(t-2*r)/a.length,c=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];c.forEach(({x:w,y:S})=>{const m=(a.length-oe)*l*w+r,g=(a.length-oe)*l*S+r,b=.45;for(let h=0;h<c.length;h+=1){const L=l*(oe-h*2);s.push(Ue`
            <rect
              fill=${h===2?"var(--apkt-colors-black)":"var(--apkt-colors-white)"}
              width=${h===0?L-10:L}
              rx= ${h===0?(L-10)*b:L*b}
              ry= ${h===0?(L-10)*b:L*b}
              stroke=${o}
              stroke-width=${h===0?10:0}
              height=${h===0?L-10:L}
              x= ${h===0?g+l*h+10/2:g+l*h}
              y= ${h===0?m+l*h+10/2:m+l*h}
            />
          `)}});const d=Math.floor((i+25)/l),$=a.length/2-d/2,v=a.length/2+d/2-1,p=[];a.forEach((w,S)=>{w.forEach((m,g)=>{if(a[S][g]&&!(S<oe&&g<oe||S>a.length-(oe+1)&&g<oe||S<oe&&g>a.length-(oe+1))&&!(S>$&&S<v&&g>$&&g<v)){const b=S*l+l/2+r,h=g*l+l/2+r;p.push([b,h])}})});const _={};return p.forEach(([w,S])=>{_[w]?_[w]?.push(S):_[w]=[S]}),Object.entries(_).map(([w,S])=>{const m=S.filter(g=>S.every(b=>!Tt(g,b,l)));return[Number(w),m]}).forEach(([w,S])=>{S.forEach(m=>{s.push(Ue`<circle cx=${w} cy=${m} fill=${o} r=${l/$n} />`)})}),Object.entries(_).filter(([w,S])=>S.length>1).map(([w,S])=>{const m=S.filter(g=>S.some(b=>Tt(g,b,l)));return[Number(w),m]}).map(([w,S])=>{S.sort((g,b)=>g<b?-1:1);const m=[];for(const g of S){const b=m.find(h=>h.some(L=>Tt(g,L,l)));b?b.push(g):m.push([g])}return[w,m.map(g=>[g[0],g[g.length-1]])]}).forEach(([w,S])=>{S.forEach(([m,g])=>{s.push(Ue`
              <line
                x1=${w}
                x2=${w}
                y1=${m}
                y2=${g}
                stroke=${o}
                stroke-width=${l/($n/2)}
                stroke-linecap="round"
              />
            `)})}),s}},Ui=U`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({colors:e})=>e.white};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  :host {
    border-radius: ${({borderRadius:e})=>e[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`;var he=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let te=class extends O{constructor(){super(...arguments),this.uri="",this.size=500,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),u`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return Ue`
      <svg viewBox="0 0 ${this.size} ${this.size}" width="100%" height="100%">
        ${ji.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){return this.imageSrc?u`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?u`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:u`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};te.styles=[Y,Ui];he([f()],te.prototype,"uri",void 0);he([f({type:Number})],te.prototype,"size",void 0);he([f()],te.prototype,"theme",void 0);he([f()],te.prototype,"imageSrc",void 0);he([f()],te.prototype,"alt",void 0);he([f({type:Boolean})],te.prototype,"arenaClear",void 0);he([f({type:Boolean})],te.prototype,"farcaster",void 0);te=he([N("wui-qr-code")],te);const qi=U`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
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
`;var Mn=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Ve=class extends q{constructor(){super(),this.basic=!1}firstUpdated(){this.basic||H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:B.state.view}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(t=>t())}render(){return this.onRenderProxy(),u`
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
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){if(!this.uri||!this.ready)return null;const t=this.wallet?this.wallet.name:void 0;k.setWcLinking(void 0),k.setRecentWallet(this.wallet);const i=je.state.themeVariables["--apkt-qr-color"]??je.state.themeVariables["--w3m-qr-color"];return u` <wui-qr-code
      theme=${je.state.themeMode}
      uri=${this.uri}
      imageSrc=${D(ue.getWalletImage(this.wallet))}
      color=${D(i)}
      alt=${D(t)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){const t=!this.uri||!this.ready;return u`<wui-button
      .disabled=${t}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};Ve.styles=qi;Mn([f({type:Boolean})],Ve.prototype,"basic",void 0);Ve=Mn([N("w3m-connecting-wc-qrcode")],Ve);var zi=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let xn=class extends O{constructor(){if(super(),this.wallet=B.state.data?.wallet,!this.wallet)throw new Error("w3m-connecting-wc-unsupported: No wallet provided");H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:B.state.view}})}render(){return u`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${D(ue.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};xn=zi([N("w3m-connecting-wc-unsupported")],xn);var On=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Wt=class extends q{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw new Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=In.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(k.subscribeKey("wcUri",()=>{this.updateLoadingState()})),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:B.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;const{webapp_link:t,name:i}=this.wallet,{redirect:r,href:o}=M.formatUniversalUrl(t,this.uri);k.setWcLinking({name:i,href:o}),k.setRecentWallet(this.wallet),M.openHref(r,"_blank")}catch{this.error=!0}}};On([P()],Wt.prototype,"isLoading",void 0);Wt=On([N("w3m-connecting-wc-web")],Wt);const Fi=U`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;var $e=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let ae=class extends O{constructor(){super(),this.wallet=B.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!z.state.siwx,this.remoteFeatures=z.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(z.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return z.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),u`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return!this.remoteFeatures?.reownBranding||!this.displayBranding?null:u`<wui-ux-by-reown></wui-ux-by-reown>`}async initializeConnection(t=!1){if(!(this.platform==="browser"||z.state.manualWCControl&&!t))try{const{wcPairingExpiry:i,status:r}=k.state,{redirectView:o}=B.state.data??{};if(t||z.state.enableEmbedded||M.isPairingExpired(i)||r==="connecting"){const n=k.getConnections(ee.state.activeChain),s=this.remoteFeatures?.multiWallet,a=n.length>0;await k.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(a&&s?(B.replace("ProfileWallets"),Be.showSuccess("New Wallet Added")):o?B.replace(o):_n.close())}}catch(i){if(i instanceof Error&&i.message.includes("An error occurred when attempting to switch chain")&&!z.state.enableNetworkSwitch&&ee.state.activeChain){ee.setActiveCaipNetwork(Qn.getUnsupportedNetwork(`${ee.state.activeChain}:${ee.state.activeCaipNetwork?.id}`)),ee.showUnsupportedChainUI();return}i instanceof Sn&&i.originalName===Tn.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?H.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:i.message}}):H.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:i?.message??"Unknown"}}),k.setWcError(!0),Be.showError(i.message??"Connection error"),k.resetWcConnection(),B.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;const{mobile_link:t,desktop_link:i,webapp_link:r,injected:o,rdns:n}=this.wallet,s=o?.map(({injected_id:w})=>w).filter(Boolean),a=[...n?[n]:s??[]],l=z.state.isUniversalProvider?!1:a.length,c=t,d=r,$=k.checkInstalled(a),v=l&&$,p=i&&!M.isMobile();v&&!ee.state.noAdapters&&this.platforms.push("browser"),c&&this.platforms.push(M.isMobile()?"mobile":"qrcode"),d&&this.platforms.push("web"),p&&this.platforms.push("desktop");const _=Jn.isCustomDeeplinkWallet(this.wallet.id,ee.state.activeChain);!v&&l&&!ee.state.noAdapters&&!_&&this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return u`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return u`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return u`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return u`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return u`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return u`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?u`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(t){const i=this.shadowRoot?.querySelector("div");i&&(await i.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=t,i.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};ae.styles=Fi;$e([P()],ae.prototype,"platform",void 0);$e([P()],ae.prototype,"platforms",void 0);$e([P()],ae.prototype,"isSiwxEnabled",void 0);$e([P()],ae.prototype,"remoteFeatures",void 0);$e([f({type:Boolean})],ae.prototype,"displayBranding",void 0);$e([f({type:Boolean})],ae.prototype,"basic",void 0);ae=$e([N("w3m-connecting-wc-view")],ae);var Lt=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let He=class extends O{constructor(){super(),this.unsubscribe=[],this.isMobile=M.isMobile(),this.remoteFeatures=z.state.remoteFeatures,this.unsubscribe.push(z.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){if(this.isMobile){const{featured:t,recommended:i}=j.state,{customWallets:r}=z.state,o=Yn.getRecentWallets(),n=t.length||i.length||r?.length||o.length;return u`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${n?u`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return u`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?u` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};Lt([P()],He.prototype,"isMobile",void 0);Lt([P()],He.prototype,"remoteFeatures",void 0);He=Lt([N("w3m-connecting-wc-basic-view")],He);const Vi=e=>e.strings===void 0;const We=(e,t)=>{const i=e._$AN;if(i===void 0)return!1;for(const r of i)r._$AO?.(t,!1),We(r,t);return!0},Ke=e=>{let t,i;do{if((t=e._$AM)===void 0)break;i=t._$AN,i.delete(e),e=t}while(i?.size===0)},Dn=e=>{for(let t;t=e._$AM;e=t){let i=t._$AN;if(i===void 0)t._$AN=i=new Set;else if(i.has(e))break;i.add(e),Gi(t)}};function Hi(e){this._$AN!==void 0?(Ke(this),this._$AM=e,Dn(this)):this._$AM=e}function Ki(e,t=!1,i=0){const r=this._$AH,o=this._$AN;if(o!==void 0&&o.size!==0)if(t)if(Array.isArray(r))for(let n=i;n<r.length;n++)We(r[n],!1),Ke(r[n]);else r!=null&&(We(r,!1),Ke(r));else We(this,e)}const Gi=e=>{e.type==Zn.CHILD&&(e._$AP??=Ki,e._$AQ??=Hi)};class Qi extends Xn{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,i,r){super._$AT(t,i,r),Dn(this),this.isConnected=t._$AU}_$AO(t,i=!0){t!==this.isConnected&&(this.isConnected=t,t?this.reconnected?.():this.disconnected?.()),i&&(We(this,t),Ke(this))}setValue(t){if(Vi(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}const Nt=()=>new Ji;class Ji{}const It=new WeakMap,Mt=ei(class extends Qi{render(e){return zt}update(e,[t]){const i=t!==this.G;return i&&this.rt(void 0),(i||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),zt}rt(e){if(this.G!==void 0)if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let i=It.get(t);i===void 0&&(i=new WeakMap,It.set(t,i)),i.get(this.G)!==void 0&&this.G.call(this.ht,void 0),i.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return typeof this.G=="function"?It.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),Yi=U`
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
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
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
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
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
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
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
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`;var Ze=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let _e=class extends O{constructor(){super(...arguments),this.inputElementRef=Nt(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return u`
      <label data-size=${this.size}>
        <input
          ${Mt(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};_e.styles=[Y,ye,Yi];Ze([f({type:Boolean})],_e.prototype,"checked",void 0);Ze([f({type:Boolean})],_e.prototype,"disabled",void 0);Ze([f()],_e.prototype,"size",void 0);_e=Ze([N("wui-toggle")],_e);const Xi=U`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var jn=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Ge=class extends O{constructor(){super(...arguments),this.checked=!1}render(){return u`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(t){t.stopPropagation(),this.checked=t.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};Ge.styles=[Y,ye,Xi];jn([f({type:Boolean})],Ge.prototype,"checked",void 0);Ge=jn([N("wui-certified-switch")],Ge);const Zi=U`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;var G=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let F=class extends O{constructor(){super(...arguments),this.inputElementRef=Nt(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return u` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${Mt(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${D(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?u`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){return this.onSubmit?u`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?u`<wui-icon name="spinner" size="md"></wui-icon>`:u`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?u`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?u`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};F.styles=[Y,ye,Zi];G([f()],F.prototype,"icon",void 0);G([f({type:Boolean})],F.prototype,"disabled",void 0);G([f({type:Boolean})],F.prototype,"loading",void 0);G([f()],F.prototype,"placeholder",void 0);G([f()],F.prototype,"type",void 0);G([f()],F.prototype,"value",void 0);G([f()],F.prototype,"errorText",void 0);G([f()],F.prototype,"warningText",void 0);G([f()],F.prototype,"onSubmit",void 0);G([f()],F.prototype,"size",void 0);G([f({attribute:!1})],F.prototype,"onKeyDown",void 0);F=G([N("wui-input-text")],F);const er=U`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`;var Un=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Qe=class extends O{constructor(){super(...arguments),this.inputComponentRef=Nt(),this.inputValue=""}render(){return u`
      <wui-input-text
        ${Mt(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?u`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(t){this.inputValue=t.detail||""}clearValue(){const i=this.inputComponentRef.value?.inputElementRef.value;i&&(i.value="",this.inputValue="",i.focus(),i.dispatchEvent(new Event("input")))}};Qe.styles=[Y,er];Un([f()],Qe.prototype,"inputValue",void 0);Qe=Un([N("wui-search-bar")],Qe);const tr=U`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
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
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var qn=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Je=class extends O{constructor(){super(...arguments),this.type="wallet"}render(){return u`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return this.type==="network"?u` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${ti}`:u`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};Je.styles=[Y,ye,tr];qn([f()],Je.prototype,"type",void 0);Je=qn([N("wui-card-select-loader")],Je);const nr=An`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var Q=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let V=class extends O{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&se.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&se.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&se.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&se.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&se.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&se.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&se.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&se.getSpacingStyles(this.margin,3)};
    `,u`<slot></slot>`}};V.styles=[Y,nr];Q([f()],V.prototype,"gridTemplateRows",void 0);Q([f()],V.prototype,"gridTemplateColumns",void 0);Q([f()],V.prototype,"justifyItems",void 0);Q([f()],V.prototype,"alignItems",void 0);Q([f()],V.prototype,"justifyContent",void 0);Q([f()],V.prototype,"alignContent",void 0);Q([f()],V.prototype,"columnGap",void 0);Q([f()],V.prototype,"rowGap",void 0);Q([f()],V.prototype,"gap",void 0);Q([f()],V.prototype,"padding",void 0);Q([f()],V.prototype,"margin",void 0);V=Q([N("wui-grid")],V);const ir=U`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[0]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e[4]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
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
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var ne=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let K=class extends O{constructor(){super(),this.observer=new IntersectionObserver(()=>{}),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(t=>{t.forEach(i=>{i.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){const t=this.wallet?.badge_type==="certified";return u`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${D(t?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${t?u`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():u`
      <wui-wallet-image
        size="lg"
        imageSrc=${D(this.imageSrc)}
        name=${D(this.wallet?.name)}
        .installed=${this.wallet?.installed??!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return u`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=ue.getWalletImage(this.wallet),!this.imageSrc&&(this.imageLoading=!0,this.imageSrc=await ue.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){!this.wallet||this.isImpressed||(this.isImpressed=!0,H.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:B.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};K.styles=ir;ne([P()],K.prototype,"visible",void 0);ne([P()],K.prototype,"imageSrc",void 0);ne([P()],K.prototype,"imageLoading",void 0);ne([P()],K.prototype,"isImpressed",void 0);ne([f()],K.prototype,"explorerId",void 0);ne([f()],K.prototype,"walletQuery",void 0);ne([f()],K.prototype,"certified",void 0);ne([f()],K.prototype,"displayIndex",void 0);ne([f({type:Object})],K.prototype,"wallet",void 0);K=ne([N("w3m-all-wallets-list-item")],K);const rr=U`
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
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-inout-power-2"]};
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
    padding-top: ${({spacing:e})=>e[4]};
    padding-bottom: ${({spacing:e})=>e[4]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var Ne=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};const En="local-paginator";let me=class extends O{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!j.state.wallets.length,this.wallets=j.state.wallets,this.mobileFullScreen=z.state.enableMobileFullScreen,this.unsubscribe.push(j.subscribeKey("wallets",t=>this.wallets=t))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),this.paginationObserver?.disconnect()}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),u`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;const t=this.shadowRoot?.querySelector("wui-grid");t&&(await j.fetchWalletsByPage({page:1}),await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(t,i){return[...Array(t)].map(()=>u`
        <wui-card-select-loader type="wallet" id=${D(i)}></wui-card-select-loader>
      `)}walletsTemplate(){return Pt.getWalletConnectWallets(this.wallets).map((t,i)=>u`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${t.id}"
          @click=${()=>this.onConnectWallet(t)}
          .wallet=${t}
          explorerId=${t.id}
          certified=${this.badge==="certified"}
          displayIndex=${i}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){const{wallets:t,recommended:i,featured:r,count:o,mobileFilteredOutWalletsLength:n}=j.state,s=window.innerWidth<352?3:4,a=t.length+i.length;let c=Math.ceil(a/s)*s-a+s;return c-=t.length?r.length%s:0,o===0&&r.length>0?null:o===0||[...r,...t,...i].length<o-(n??0)?this.shimmerTemplate(c,En):null}createPaginationObserver(){const t=this.shadowRoot?.querySelector(`#${En}`);t&&(this.paginationObserver=new IntersectionObserver(([i])=>{if(i?.isIntersecting&&!this.loading){const{page:r,count:o,wallets:n}=j.state;n.length<o&&j.fetchWalletsByPage({page:r+1})}}),this.paginationObserver.observe(t))}onConnectWallet(t){J.selectWalletConnector(t)}};me.styles=rr;Ne([P()],me.prototype,"loading",void 0);Ne([P()],me.prototype,"wallets",void 0);Ne([P()],me.prototype,"badge",void 0);Ne([P()],me.prototype,"mobileFullScreen",void 0);me=Ne([N("w3m-all-wallets-list")],me);const or=An`
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
`;var Me=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let be=class extends O{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=z.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?u`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await j.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){const{search:t}=j.state,i=Pt.markWalletsAsInstalled(t),r=Pt.filterWalletsByWcSupport(i);return r.length?u`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${r.map((o,n)=>u`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(o)}
              .wallet=${o}
              data-testid="wallet-search-item-${o.id}"
              explorerId=${o.id}
              certified=${this.badge==="certified"}
              walletQuery=${this.query}
              displayIndex=${n}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:u`
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
      `}onConnectWallet(t){J.selectWalletConnector(t)}};be.styles=or;Me([P()],be.prototype,"loading",void 0);Me([P()],be.prototype,"mobileFullScreen",void 0);Me([f()],be.prototype,"query",void 0);Me([f()],be.prototype,"badge",void 0);be=Me([N("w3m-all-wallets-search")],be);var Ot=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Ye=class extends O{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=M.debounce(t=>{this.search=t})}render(){const t=this.search.length>=2;return u`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge==="certified"}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${t||this.badge?u`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:u`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(t){this.onDebouncedSearch(t.detail)}onCertifiedSwitchChange(t){t.detail?(this.badge="certified",Be.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return M.isMobile()?u`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){B.push("ConnectingWalletConnect")}};Ot([P()],Ye.prototype,"search",void 0);Ot([P()],Ye.prototype,"badge",void 0);Ye=Ot([N("w3m-all-wallets-view")],Ye);var sr=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let Rn=class extends O{constructor(){super(...arguments),this.wallet=B.state.data?.wallet}render(){if(!this.wallet)throw new Error("w3m-downloads-view");return u`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?u`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?u`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?u`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?u`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(t){t.href&&this.wallet&&(H.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:t.type}}),M.openHref(t.href,"_blank"))}onChromeStore(){this.wallet?.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){this.wallet?.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){this.wallet?.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){this.wallet?.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};Rn=sr([N("w3m-downloads-view")],Rn);export{Ye as W3mAllWalletsView,He as W3mConnectingWcBasicView,Rn as W3mDownloadsView};
