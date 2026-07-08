import{n as y,l as $,m as l,O as m,R as p,C as f,S as h,I as E,J as C}from"./index-CoFh73Qz.js";import{n as S,c as x,r as u,U as _}from"./index-DCJTGv4T.js";import{W as R}from"./index-_lMDdLUD.js";import{ReownAuthentication as v}from"./features-B_JGqwpL.js";import"./index-Cuvv0_dX.js";import"./index-BbP3371Q.js";import"./index-D5ZFNMbs.js";import"./index-0Lcq-j9K.js";const D=y`
  .email-sufixes {
    display: flex;
    flex-direction: row;
    gap: var(--wui-spacing-3xs);
    overflow-x: auto;
    max-width: 100%;
    margin-top: var(--wui-spacing-s);
    margin-bottom: calc(-1 * var(--wui-spacing-m));
    padding-bottom: var(--wui-spacing-m);
    margin-left: calc(-1 * var(--wui-spacing-m));
    margin-right: calc(-1 * var(--wui-spacing-m));
    padding-left: var(--wui-spacing-m);
    padding-right: var(--wui-spacing-m);

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;var O=function(r,t,i,a){var n=arguments.length,e=n<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(r,t,i,a);else for(var s=r.length-1;s>=0;s--)(o=r[s])&&(e=(n<3?o(e):n>3?o(t,i,e):o(t,i))||e);return n>3&&e&&Object.defineProperty(t,i,e),e};const I=["@gmail.com","@outlook.com","@yahoo.com","@hotmail.com","@aol.com","@icloud.com","@zoho.com"];let g=class extends ${constructor(){super(...arguments),this.email=""}render(){const t=I.filter(this.filter.bind(this)).map(this.item.bind(this));return t.length===0?null:l`<div class="email-sufixes">${t}</div>`}filter(t){if(!this.email)return!1;const i=this.email.split("@");if(i.length<2)return!0;const a=i.pop();return t.includes(a)&&t!==`@${a}`}item(t){return l`<wui-button variant="neutral" size="sm" @click=${()=>{const a=this.email.split("@");a.length>1&&a.pop();const n=a[0]+t;this.dispatchEvent(new CustomEvent("change",{detail:n,bubbles:!0,composed:!0}))}}
      >${t}</wui-button
    >`}};g.styles=[D];O([S()],g.prototype,"email",void 0);g=O([x("w3m-email-suffixes-widget")],g);const j=y`
  .recent-emails {
    display: flex;
    flex-direction: column;
    padding: var(--wui-spacing-s) 0;
    border-top: 1px solid var(--wui-color-gray-glass-005);
    border-bottom: 1px solid var(--wui-color-gray-glass-005);
  }

  .recent-emails-heading {
    margin-bottom: var(--wui-spacing-s);
  }

  .recent-emails-list-item {
    --wui-color-gray-glass-002: transparent;
  }
`;var W=function(r,t,i,a){var n=arguments.length,e=n<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(r,t,i,a);else for(var s=r.length-1;s>=0;s--)(o=r[s])&&(e=(n<3?o(e):n>3?o(t,i,e):o(t,i))||e);return n>3&&e&&Object.defineProperty(t,i,e),e};let w=class extends ${constructor(){super(...arguments),this.emails=[]}render(){return this.emails.length===0?null:l`<div class="recent-emails">
      <wui-text variant="micro-600" color="fg-200" class="recent-emails-heading"
        >Recently used emails</wui-text
      >
      ${this.emails.map(this.item.bind(this))}
    </div>`}item(t){return l`<wui-list-item
      @click=${()=>{this.dispatchEvent(new CustomEvent("select",{detail:t,bubbles:!0,composed:!0}))}}
      ?chevron=${!0}
      icon="mail"
      iconVariant="overlay"
      class="recent-emails-list-item"
    >
      <wui-text variant="paragraph-500" color="fg-100">${t}</wui-text>
    </wui-list-item>`}};w.styles=[j];W([S()],w.prototype,"emails",void 0);w=W([x("w3m-recent-emails-widget")],w);var A=function(r,t,i,a){var n=arguments.length,e=n<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(r,t,i,a);else for(var s=r.length-1;s>=0;s--)(o=r[s])&&(e=(n<3?o(e):n>3?o(t,i,e):o(t,i))||e);return n>3&&e&&Object.defineProperty(t,i,e),e};let b=class extends R{constructor(){super(...arguments),this.siwx=m.state.siwx,this.onOtpSubmit=async t=>{await this.siwx.confirmEmailOtp({code:t}),p.replace("SIWXSignMessage")},this.onOtpResend=async t=>{const i=f.getAccountData();if(!i?.caipAddress)throw new Error("No account data found");await this.siwx.requestEmailOtp({email:t,account:i.caipAddress})}}connectedCallback(){(!this.siwx||!(this.siwx instanceof v))&&h.showError("ReownAuthentication is not initialized."),super.connectedCallback()}shouldSubmitOnOtpChange(){return this.otp.length===R.OTP_LENGTH}};A([u()],b.prototype,"siwx",void 0);b=A([x("w3m-data-capture-otp-confirm-view")],b);const P=y`
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--wui-spacing-3xs);

    transition-property: margin, height;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);
    margin-top: -100px;

    &[data-state='loading'] {
      margin-top: 0px;
    }

    position: relative;
    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      height: 252px;
      width: 360px;
      background: radial-gradient(
        96.11% 53.95% at 50% 51.28%,
        transparent 0%,
        color-mix(in srgb, var(--wui-color-bg-100) 5%, transparent) 49%,
        color-mix(in srgb, var(--wui-color-bg-100) 65%, transparent) 99.43%
      );
    }
  }

  .hero-main-icon {
    width: 176px;
    transition-property: background-color;
    transition-duration: var(--wui-duration-lg);
    transition-timing-function: var(--wui-ease-out-power-1);

    &[data-state='loading'] {
      width: 56px;
    }
  }

  .hero-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: var(--wui-spacing-3xs);
    flex-wrap: nowrap;
    min-width: fit-content;

    &:nth-child(1) {
      transform: translateX(-30px);
    }

    &:nth-child(2) {
      transform: translateX(30px);
    }

    &:nth-child(4) {
      transform: translateX(40px);
    }

    transition-property: height;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);
    height: 68px;

    &[data-state='loading'] {
      height: 0px;
    }
  }

  .hero-row-icon {
    opacity: 0.1;
    transition-property: opacity;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);

    &[data-state='loading'] {
      opacity: 0;
    }
  }
`;var d=function(r,t,i,a){var n=arguments.length,e=n<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(r,t,i,a);else for(var s=r.length-1;s>=0;s--)(o=r[s])&&(e=(n<3?o(e):n>3?o(t,i,e):o(t,i))||e);return n>3&&e&&Object.defineProperty(t,i,e),e};let c=class extends ${constructor(){super(...arguments),this.email=p.state.data?.email??f.getAccountData()?.user?.email??"",this.address=f.getAccountData()?.address??"",this.loading=!1,this.appName=m.state.metadata?.name??"AppKit",this.siwx=m.state.siwx,this.isRequired=Array.isArray(m.state.remoteFeatures?.emailCapture)&&m.state.remoteFeatures?.emailCapture.includes("required"),this.recentEmails=this.getRecentEmails()}connectedCallback(){(!this.siwx||!(this.siwx instanceof v))&&h.showError("ReownAuthentication is not initialized. Please contact support."),super.connectedCallback()}firstUpdated(){this.loading=!1,this.recentEmails=this.getRecentEmails(),this.email&&this.onSubmit()}render(){return l`
      <wui-flex flexDirection="column" .padding=${["3xs","m","m","m"]} gap="l">
        ${this.hero()} ${this.paragraph()} ${this.emailInput()} ${this.recentEmailsWidget()}
        ${this.footerActions()}
      </wui-flex>
    `}hero(){return l`
      <div class="hero" data-state=${this.loading?"loading":"default"}>
        ${this.heroRow(["id","mail","wallet","x","solana","qrCode"])}
        ${this.heroRow(["mail","farcaster","wallet","discord","mobile","qrCode"])}
        <div class="hero-row">
          ${this.heroIcon("github")} ${this.heroIcon("bank")}
          <wui-icon-box
            size="xl"
            iconSize="xxl"
            iconColor=${this.loading?"fg-100":"accent-100"}
            backgroundColor=${this.loading?"fg-100":"accent-100"}
            icon=${this.loading?"id":"user"}
            isOpaque
            class="hero-main-icon"
            data-state=${this.loading?"loading":"default"}
          >
          </wui-icon-box>
          ${this.heroIcon("id")} ${this.heroIcon("card")}
        </div>
        ${this.heroRow(["google","id","github","verify","apple","mobile"])}
      </div>
    `}heroRow(t){return l`
      <div class="hero-row" data-state=${this.loading?"loading":"default"}>
        ${t.map(this.heroIcon.bind(this))}
      </div>
    `}heroIcon(t){return l`
      <wui-icon-box
        size="xl"
        iconSize="xxl"
        iconColor="fg-100"
        backgroundColor="fg-100"
        icon=${t}
        data-state=${this.loading?"loading":"default"}
        isOpaque
        class="hero-row-icon"
      >
      </wui-icon-box>
    `}paragraph(){return this.loading?l`
        <wui-text variant="paragraph-400" color="fg-200" align="center"
          >We are verifying your account with email
          <wui-text variant="paragraph-600" color="accent-100">${this.email}</wui-text> and address
          <wui-text variant="paragraph-600" color="fg-100">
            ${_.getTruncateString({string:this.address,charsEnd:4,charsStart:4,truncate:"middle"})} </wui-text
          >, please wait a moment.</wui-text
        >
      `:this.isRequired?l`
        <wui-text variant="paragraph-600" color="fg-100" align="center">
          ${this.appName} requires your email for authentication.
        </wui-text>
      `:l`
      <wui-flex flexDirection="column" gap="xs" alignItems="center">
        <wui-text variant="paragraph-600" color="fg-100" align="center" size>
          ${this.appName} would like to collect your email.
        </wui-text>

        <wui-text variant="small-400" color="fg-200" align="center">
          Don't worry, it's optional&mdash;you can skip this step.
        </wui-text>
      </wui-flex>
    `}emailInput(){if(this.loading)return null;const t=a=>{a.key==="Enter"&&this.onSubmit()},i=a=>{this.email=a.detail};return l`
      <wui-flex flexDirection="column">
        <wui-email-input
          .value=${this.email}
          .disabled=${this.loading}
          @inputChange=${i}
          @keydown=${t}
        ></wui-email-input>

        <w3m-email-suffixes-widget
          .email=${this.email}
          @change=${i}
        ></w3m-email-suffixes-widget>
      </wui-flex>
    `}recentEmailsWidget(){if(this.recentEmails.length===0||this.loading)return null;const t=i=>{this.email=i.detail,this.onSubmit()};return l`
      <w3m-recent-emails-widget
        .emails=${this.recentEmails}
        @select=${t}
      ></w3m-recent-emails-widget>
    `}footerActions(){return l`
      <wui-flex flexDirection="row" fullWidth gap="s">
        ${this.isRequired?null:l`<wui-button
              size="lg"
              variant="neutral"
              fullWidth
              .disabled=${this.loading}
              @click=${this.onSkip.bind(this)}
              >Skip this step</wui-button
            >`}

        <wui-button
          size="lg"
          variant="main"
          type="submit"
          fullWidth
          .disabled=${!this.email||!this.isValidEmail(this.email)}
          .loading=${this.loading}
          @click=${this.onSubmit.bind(this)}
        >
          Continue
        </wui-button>
      </wui-flex>
    `}async onSubmit(){if(!(this.siwx instanceof v)){h.showError("ReownAuthentication is not initialized. Please contact support.");return}const t=f.getActiveCaipAddress();if(!t)throw new Error("Account is not connected.");if(!this.isValidEmail(this.email)){h.showError("Please provide a valid email.");return}try{this.loading=!0;const i=await this.siwx.requestEmailOtp({email:this.email,account:t});this.pushRecentEmail(this.email),i.uuid===null?p.replace("SIWXSignMessage"):p.replace("DataCaptureOtpConfirm",{email:this.email})}catch{h.showError("Failed to send email OTP"),this.loading=!1}}onSkip(){p.replace("SIWXSignMessage")}getRecentEmails(){const t=E.getItem(C.RECENT_EMAILS);return(t?t.split(","):[]).filter(this.isValidEmail.bind(this)).slice(0,3)}pushRecentEmail(t){const i=this.getRecentEmails(),a=Array.from(new Set([t,...i])).slice(0,3);E.setItem(C.RECENT_EMAILS,a.join(","))}isValidEmail(t){return/^\S+@\S+\.\S+$/u.test(t)}};c.styles=[P];d([u()],c.prototype,"email",void 0);d([u()],c.prototype,"address",void 0);d([u()],c.prototype,"loading",void 0);d([u()],c.prototype,"appName",void 0);d([u()],c.prototype,"siwx",void 0);d([u()],c.prototype,"isRequired",void 0);d([u()],c.prototype,"recentEmails",void 0);c=d([x("w3m-data-capture-view")],c);export{b as W3mDataCaptureOtpConfirmView,c as W3mDataCaptureView,g as W3mEmailSuffixesWidget,w as W3mRecentEmailsWidget};
