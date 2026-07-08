import{j as g,l as f,R as u,m as e,E as P,r as k,k as A}from"./index-B5I1SqSM.js";import{r as y,c as b,n as w,o as v}from"./index-UOodl-4X.js";import"./index-FUWkZQ53.js";import{H as x}from"./HelpersUtil-Biigxaae.js";import"./index-DU16z3cE.js";import"./index-DM3QKwYx.js";const I=g`
  :host {
    display: block;
  }

  div.container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: auto;
    display: block;
  }

  div.container[status='hide'] {
    animation: fade-out;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:t})=>t["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: 0s;
  }

  div.container[status='show'] {
    animation: fade-in;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:t})=>t["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      filter: blur(0px);
    }
    to {
      opacity: 0;
      filter: blur(6px);
    }
  }
`;var $=function(t,i,n,r){var o=arguments.length,a=o<3?i:r===null?r=Object.getOwnPropertyDescriptor(i,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(t,i,n,r);else for(var c=t.length-1;c>=0;c--)(s=t[c])&&(a=(o<3?s(a):o>3?s(i,n,a):s(i,n))||a);return o>3&&a&&Object.defineProperty(i,n,a),a};let p=class extends f{constructor(){super(...arguments),this.resizeObserver=void 0,this.unsubscribe=[],this.status="hide",this.view=u.state.view}firstUpdated(){this.status=x.hasFooter()?"show":"hide",this.unsubscribe.push(u.subscribeKey("view",i=>{this.view=i,this.status=x.hasFooter()?"show":"hide",this.status==="hide"&&document.documentElement.style.setProperty("--apkt-footer-height","0px")})),this.resizeObserver=new ResizeObserver(i=>{for(const n of i)if(n.target===this.getWrapper()){const r=`${n.contentRect.height}px`;document.documentElement.style.setProperty("--apkt-footer-height",r)}}),this.resizeObserver.observe(this.getWrapper())}render(){return e`
      <div class="container" status=${this.status}>${this.templatePageContainer()}</div>
    `}templatePageContainer(){return x.hasFooter()?e` ${this.templateFooter()}`:null}templateFooter(){switch(this.view){case"Networks":return this.templateNetworksFooter();case"Connect":case"ConnectWallets":case"OnRampFiatSelect":case"OnRampTokenSelect":return e`<w3m-legal-footer></w3m-legal-footer>`;case"OnRampProviders":return e`<w3m-onramp-providers-footer></w3m-onramp-providers-footer>`;default:return null}}templateNetworksFooter(){return e` <wui-flex
      class="footer-in"
      padding="3"
      flexDirection="column"
      gap="3"
      alignItems="center"
    >
      <wui-text variant="md-regular" color="secondary" align="center">
        Your connected wallet may not support some of the networks available for this dApp
      </wui-text>
      <wui-link @click=${this.onNetworkHelp.bind(this)}>
        <wui-icon size="sm" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
        What is a network
      </wui-link>
    </wui-flex>`}onNetworkHelp(){P.sendEvent({type:"track",event:"CLICK_NETWORK_HELP"}),u.push("WhatIsANetwork")}getWrapper(){return this.shadowRoot?.querySelector("div.container")}};p.styles=[I];$([y()],p.prototype,"status",void 0);$([y()],p.prototype,"view",void 0);p=$([b("w3m-footer")],p);const R=g`
  :host {
    display: block;
    width: inherit;
  }
`;var W=function(t,i,n,r){var o=arguments.length,a=o<3?i:r===null?r=Object.getOwnPropertyDescriptor(i,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(t,i,n,r);else for(var c=t.length-1;c>=0;c--)(s=t[c])&&(a=(o<3?s(a):o>3?s(i,n,a):s(i,n))||a);return o>3&&a&&Object.defineProperty(i,n,a),a};let d=class extends f{constructor(){super(),this.unsubscribe=[],this.viewState=u.state.view,this.history=u.state.history.join(","),this.unsubscribe.push(u.subscribeKey("view",()=>{this.history=u.state.history.join(","),document.documentElement.style.setProperty("--apkt-duration-dynamic","var(--apkt-durations-lg)")}))}disconnectedCallback(){this.unsubscribe.forEach(i=>i()),document.documentElement.style.setProperty("--apkt-duration-dynamic","0s")}render(){return e`${this.templatePageContainer()}`}templatePageContainer(){return e`<w3m-router-container
      history=${this.history}
      .setView=${()=>{this.viewState=u.state.view}}
    >
      ${this.viewTemplate(this.viewState)}
    </w3m-router-container>`}viewTemplate(i){switch(i){case"AccountSettings":return e`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return e`<w3m-account-view></w3m-account-view>`;case"AllWallets":return e`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return e`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return e`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return e`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":return e`<w3m-connect-view></w3m-connect-view>`;case"Create":return e`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return e`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return e`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return e`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return e`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return e`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return e`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return e`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"DataCapture":return e`<w3m-data-capture-view></w3m-data-capture-view>`;case"DataCaptureOtpConfirm":return e`<w3m-data-capture-otp-confirm-view></w3m-data-capture-otp-confirm-view>`;case"Downloads":return e`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return e`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return e`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return e`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return e`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return e`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return e`<w3m-network-switch-view></w3m-network-switch-view>`;case"ProfileWallets":return e`<w3m-profile-wallets-view></w3m-profile-wallets-view>`;case"Transactions":return e`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return e`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampTokenSelect":return e`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return e`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return e`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return e`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return e`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return e`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return e`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return e`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return e`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return e`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return e`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return e`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return e`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WalletSendConfirmed":return e`<w3m-send-confirmed-view></w3m-send-confirmed-view>`;case"WhatIsABuy":return e`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return e`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return e`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return e`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return e`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return e`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return e`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return e`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return e`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return e`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return e`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return e`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return e`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return e`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return e`<w3m-pay-loading-view></w3m-pay-loading-view>`;case"PayQuote":return e`<w3m-pay-quote-view></w3m-pay-quote-view>`;case"FundWallet":return e`<w3m-fund-wallet-view></w3m-fund-wallet-view>`;case"PayWithExchange":return e`<w3m-deposit-from-exchange-view></w3m-deposit-from-exchange-view>`;case"PayWithExchangeSelectAsset":return e`<w3m-deposit-from-exchange-select-asset-view></w3m-deposit-from-exchange-select-asset-view>`;case"UsageExceeded":return e`<w3m-usage-exceeded-view></w3m-usage-exceeded-view>`;case"SmartAccountSettings":return e`<w3m-smart-account-settings-view></w3m-smart-account-settings-view>`;default:return e`<w3m-connect-view></w3m-connect-view>`}}};d.styles=[R];W([y()],d.prototype,"viewState",void 0);W([y()],d.prototype,"history",void 0);d=W([b("w3m-router")],d);const O=g`
  :host {
    position: relative;
    border-radius: ${({borderRadius:t})=>t[2]};
    width: 40px;
    height: 40px;
    overflow: hidden;
    background: ${({tokens:t})=>t.theme.foregroundPrimary};
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    column-gap: ${({spacing:t})=>t[1]};
    padding: ${({spacing:t})=>t[1]};
  }

  :host > wui-wallet-image {
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }
`;var C=function(t,i,n,r){var o=arguments.length,a=o<3?i:r===null?r=Object.getOwnPropertyDescriptor(i,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(t,i,n,r);else for(var c=t.length-1;c>=0;c--)(s=t[c])&&(a=(o<3?s(a):o>3?s(i,n,a):s(i,n))||a);return o>3&&a&&Object.defineProperty(i,n,a),a};const S=4;let h=class extends f{constructor(){super(...arguments),this.walletImages=[]}render(){const i=this.walletImages.length<S;return e`${this.walletImages.slice(0,S).map(({src:n,walletName:r})=>e`
          <wui-wallet-image
            size="sm"
            imageSrc=${n}
            name=${v(r)}
          ></wui-wallet-image>
        `)}
    ${i?[...Array(S-this.walletImages.length)].map(()=>e` <wui-wallet-image size="sm" name=""></wui-wallet-image>`):null} `}};h.styles=[k,O];C([w({type:Array})],h.prototype,"walletImages",void 0);h=C([b("wui-all-wallets-image")],h);const E=g`
  :host {
    width: 100%;
  }

  button {
    column-gap: ${({spacing:t})=>t[2]};
    padding: ${({spacing:t})=>t[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({borderRadius:t})=>t[4]};
    color: ${({tokens:t})=>t.theme.textPrimary};
  }

  button > wui-wallet-image {
    background: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  button > wui-text:nth-child(2) {
    display: flex;
    flex: 1;
  }

  button:hover:enabled {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  button[data-all-wallets='true'] {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  button[data-all-wallets='true']:hover:enabled {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  button:focus-visible:enabled {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    box-shadow: 0 0 0 4px ${({tokens:t})=>t.core.foregroundAccent020};
  }

  button:disabled {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:disabled > wui-tag {
    background-color: ${({tokens:t})=>t.core.glass010};
    color: ${({tokens:t})=>t.theme.foregroundTertiary};
  }

  wui-flex.namespace-icon {
    width: 16px;
    height: 16px;
    border-radius: ${({borderRadius:t})=>t.round};
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    box-shadow: 0 0 0 2px ${({tokens:t})=>t.theme.backgroundPrimary};
    transition: box-shadow var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2);
  }

  button:hover:enabled wui-flex.namespace-icon {
    box-shadow: 0 0 0 2px ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  wui-flex.namespace-icon > wui-icon {
    width: 10px;
    height: 10px;
  }

  wui-flex.namespace-icon:not(:first-child) {
    margin-left: -4px;
  }
`;var m=function(t,i,n,r){var o=arguments.length,a=o<3?i:r===null?r=Object.getOwnPropertyDescriptor(i,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(t,i,n,r);else for(var c=t.length-1;c>=0;c--)(s=t[c])&&(a=(o<3?s(a):o>3?s(i,n,a):s(i,n))||a);return o>3&&a&&Object.defineProperty(i,n,a),a};const z={eip155:"ethereum",solana:"solana",bip122:"bitcoin",polkadot:void 0,cosmos:void 0,sui:void 0,stacks:void 0,ton:"ton",tron:"tron"};let l=class extends f{constructor(){super(...arguments),this.walletImages=[],this.imageSrc="",this.name="",this.size="md",this.tabIdx=void 0,this.namespaces=[],this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100"}render(){return this.dataset.size=this.size,e`
      <button
        ?disabled=${this.disabled}
        data-all-wallets=${this.showAllWallets}
        tabindex=${v(this.tabIdx)}
      >
        ${this.templateAllWallets()} ${this.templateWalletImage()}
        <wui-flex flexDirection="column" justifyContent="center" alignItems="flex-start" gap="1">
          <wui-text variant="lg-regular" color="inherit">${this.name}</wui-text>
          ${this.templateNamespaces()}
        </wui-flex>
        ${this.templateStatus()}
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `}templateNamespaces(){return this.namespaces?.length?e`<wui-flex alignItems="center" gap="0">
        ${this.namespaces.map((i,n)=>e`<wui-flex
              alignItems="center"
              justifyContent="center"
              zIndex=${(this.namespaces?.length??0)*2-n}
              class="namespace-icon"
            >
              <wui-icon
                name=${v(z[i])}
                size="sm"
                color="default"
              ></wui-icon>
            </wui-flex>`)}
      </wui-flex>`:null}templateAllWallets(){return this.showAllWallets&&this.imageSrc?e` <wui-all-wallets-image .imageeSrc=${this.imageSrc}> </wui-all-wallets-image> `:this.showAllWallets&&this.walletIcon?e` <wui-wallet-image .walletIcon=${this.walletIcon} size="sm"> </wui-wallet-image> `:null}templateWalletImage(){return!this.showAllWallets&&this.imageSrc?e`<wui-wallet-image
        size=${v(this.size==="sm"?"sm":"md")}
        imageSrc=${this.imageSrc}
        name=${this.name}
      ></wui-wallet-image>`:!this.showAllWallets&&!this.imageSrc?e`<wui-wallet-image size="sm" name=${this.name}></wui-wallet-image>`:null}templateStatus(){return this.loading?e`<wui-loading-spinner size="lg" color="accent-primary"></wui-loading-spinner>`:this.tagLabel&&this.tagVariant?e`<wui-tag size="sm" variant=${this.tagVariant}>${this.tagLabel}</wui-tag>`:null}};l.styles=[k,A,E];m([w({type:Array})],l.prototype,"walletImages",void 0);m([w()],l.prototype,"imageSrc",void 0);m([w()],l.prototype,"name",void 0);m([w()],l.prototype,"size",void 0);m([w()],l.prototype,"tagLabel",void 0);m([w()],l.prototype,"tagVariant",void 0);m([w()],l.prototype,"walletIcon",void 0);m([w()],l.prototype,"tabIdx",void 0);m([w({type:Array})],l.prototype,"namespaces",void 0);m([w({type:Boolean})],l.prototype,"disabled",void 0);m([w({type:Boolean})],l.prototype,"showAllWallets",void 0);m([w({type:Boolean})],l.prototype,"loading",void 0);m([w({type:String})],l.prototype,"loadingSpinnerColor",void 0);l=m([b("wui-list-wallet")],l);export{p as W,d as a};
