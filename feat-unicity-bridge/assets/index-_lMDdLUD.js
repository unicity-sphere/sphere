import{j as C,r as E,k as P,l as b,m as l,n as O,H as g,R as S,y as x,a as R,S as $}from"./index-CoFh73Qz.js";import{n as h,c as v,r as d,U as T}from"./index-DCJTGv4T.js";import"./index-D5ZFNMbs.js";import"./index-0Lcq-j9K.js";const L=C`
  :host {
    position: relative;
    display: inline-block;
  }

  input {
    width: 48px;
    height: 48px;
    background: ${({tokens:i})=>i.theme.foregroundPrimary};
    border-radius: ${({borderRadius:i})=>i[4]};
    border: 1px solid ${({tokens:i})=>i.theme.borderPrimary};
    font-family: ${({fontFamily:i})=>i.regular};
    font-size: ${({textSize:i})=>i.large};
    line-height: 18px;
    letter-spacing: -0.16px;
    text-align: center;
    color: ${({tokens:i})=>i.theme.textPrimary};
    caret-color: ${({tokens:i})=>i.core.textAccentPrimary};
    transition:
      background-color ${({durations:i})=>i.lg}
        ${({easings:i})=>i["ease-out-power-2"]},
      border-color ${({durations:i})=>i.lg}
        ${({easings:i})=>i["ease-out-power-2"]},
      box-shadow ${({durations:i})=>i.lg}
        ${({easings:i})=>i["ease-out-power-2"]};
    will-change: background-color, border-color, box-shadow;
    box-sizing: border-box;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    padding: ${({spacing:i})=>i[4]};
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  input:focus-visible:enabled {
    background-color: transparent;
    border: 1px solid ${({tokens:i})=>i.theme.borderSecondary};
    box-shadow: 0px 0px 0px 4px ${({tokens:i})=>i.core.foregroundAccent040};
  }
`;var y=function(i,t,e,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,e):n,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(i,t,e,n);else for(var a=i.length-1;a>=0;a--)(s=i[a])&&(o=(r<3?s(o):r>3?s(t,e,o):s(t,e))||o);return r>3&&o&&Object.defineProperty(t,e,o),o};let c=class extends b{constructor(){super(...arguments),this.disabled=!1,this.value=""}render(){return l`<input
      type="number"
      maxlength="1"
      inputmode="numeric"
      autofocus
      ?disabled=${this.disabled}
      value=${this.value}
    /> `}};c.styles=[E,P,L];y([h({type:Boolean})],c.prototype,"disabled",void 0);y([h({type:String})],c.prototype,"value",void 0);c=y([v("wui-input-numeric")],c);const _=O`
  :host {
    position: relative;
    display: block;
  }
`;var m=function(i,t,e,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,e):n,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(i,t,e,n);else for(var a=i.length-1;a>=0;a--)(s=i[a])&&(o=(r<3?s(o):r>3?s(t,e,o):s(t,e))||o);return r>3&&o&&Object.defineProperty(t,e,o),o};let p=class extends b{constructor(){super(...arguments),this.length=6,this.otp="",this.values=Array.from({length:this.length}).map(()=>""),this.numerics=[],this.shouldInputBeEnabled=t=>this.values.slice(0,t).every(n=>n!==""),this.handleKeyDown=(t,e)=>{const n=t.target,r=this.getInputElement(n),o=["ArrowLeft","ArrowRight","Shift","Delete"];if(!r)return;o.includes(t.key)&&t.preventDefault();const s=r.selectionStart;switch(t.key){case"ArrowLeft":s&&r.setSelectionRange(s+1,s+1),this.focusInputField("prev",e);break;case"ArrowRight":this.focusInputField("next",e);break;case"Shift":this.focusInputField("next",e);break;case"Delete":r.value===""?this.focusInputField("prev",e):this.updateInput(r,e,"");break;case"Backspace":r.value===""?this.focusInputField("prev",e):this.updateInput(r,e,"");break}},this.focusInputField=(t,e)=>{if(t==="next"){const n=e+1;if(!this.shouldInputBeEnabled(n))return;const r=this.numerics[n<this.length?n:e],o=r?this.getInputElement(r):void 0;o&&(o.disabled=!1,o.focus())}if(t==="prev"){const n=e-1,r=this.numerics[n>-1?n:e],o=r?this.getInputElement(r):void 0;o&&o.focus()}}}firstUpdated(){this.otp&&(this.values=this.otp.split(""));const t=this.shadowRoot?.querySelectorAll("wui-input-numeric");t&&(this.numerics=Array.from(t)),this.numerics[0]?.focus()}render(){return l`
      <wui-flex gap="1" data-testid="wui-otp-input">
        ${Array.from({length:this.length}).map((t,e)=>l`
            <wui-input-numeric
              @input=${n=>this.handleInput(n,e)}
              @click=${n=>this.selectInput(n)}
              @keydown=${n=>this.handleKeyDown(n,e)}
              .disabled=${!this.shouldInputBeEnabled(e)}
              .value=${this.values[e]||""}
            >
            </wui-input-numeric>
          `)}
      </wui-flex>
    `}updateInput(t,e,n){const r=this.numerics[e],o=t||(r?this.getInputElement(r):void 0);o&&(o.value=n,this.values=this.values.map((s,a)=>a===e?n:s))}selectInput(t){const e=t.target;e&&this.getInputElement(e)?.select()}handleInput(t,e){const n=t.target,r=this.getInputElement(n);if(r){const o=r.value;t.inputType==="insertFromPaste"?this.handlePaste(r,o,e):T.isNumber(o)&&t.data?(this.updateInput(r,e,t.data),this.focusInputField("next",e)):this.updateInput(r,e,"")}this.dispatchInputChangeEvent()}handlePaste(t,e,n){const r=e[0];if(r&&T.isNumber(r)){this.updateInput(t,n,r);const s=e.substring(1);if(n+1<this.length&&s.length){const a=this.numerics[n+1],I=a?this.getInputElement(a):void 0;I&&this.handlePaste(I,s,n+1)}else this.focusInputField("next",n)}else this.updateInput(t,n,"")}getInputElement(t){return t.shadowRoot?.querySelector("input")?t.shadowRoot.querySelector("input"):null}dispatchInputChangeEvent(){const t=this.values.join("");this.dispatchEvent(new CustomEvent("inputChange",{detail:t,bubbles:!0,composed:!0}))}};p.styles=[E,_];m([h({type:Number})],p.prototype,"length",void 0);m([h({type:String})],p.prototype,"otp",void 0);m([d()],p.prototype,"values",void 0);p=m([v("wui-otp")],p);const k=O`
  wui-loading-spinner {
    margin: 9px auto;
  }

  .email-display,
  .email-display wui-text {
    max-width: 100%;
  }
`;var f=function(i,t,e,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,e):n,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(i,t,e,n);else for(var a=i.length-1;a>=0;a--)(s=i[a])&&(o=(r<3?s(o):r>3?s(t,e,o):s(t,e))||o);return r>3&&o&&Object.defineProperty(t,e,o),o},w;let u=w=class extends b{firstUpdated(){this.startOTPTimeout()}disconnectedCallback(){clearTimeout(this.OTPTimeout)}constructor(){super(),this.loading=!1,this.timeoutTimeLeft=g.getTimeToNextEmailLogin(),this.error="",this.otp="",this.email=S.state.data?.email,this.authConnector=x.getAuthConnector()}render(){if(!this.email)throw new Error("w3m-email-otp-widget: No email provided");const t=!!this.timeoutTimeLeft,e=this.getFooterLabels(t);return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["4","0","4","0"]}
        gap="4"
      >
        <wui-flex
          class="email-display"
          flexDirection="column"
          alignItems="center"
          .padding=${["0","5","0","5"]}
        >
          <wui-text variant="md-regular" color="primary" align="center">
            Enter the code we sent to
          </wui-text>
          <wui-text variant="md-medium" color="primary" lineClamp="1" align="center">
            ${this.email}
          </wui-text>
        </wui-flex>

        <wui-text variant="sm-regular" color="secondary">The code expires in 20 minutes</wui-text>

        ${this.loading?l`<wui-loading-spinner size="xl" color="accent-primary"></wui-loading-spinner>`:l` <wui-flex flexDirection="column" alignItems="center" gap="2">
              <wui-otp
                dissabled
                length="6"
                @inputChange=${this.onOtpInputChange.bind(this)}
                .otp=${this.otp}
              ></wui-otp>
              ${this.error?l`
                    <wui-text variant="sm-regular" align="center" color="error">
                      ${this.error}. Try Again
                    </wui-text>
                  `:null}
            </wui-flex>`}

        <wui-flex alignItems="center" gap="2">
          <wui-text variant="sm-regular" color="secondary">${e.title}</wui-text>
          <wui-link @click=${this.onResendCode.bind(this)} .disabled=${t}>
            ${e.action}
          </wui-link>
        </wui-flex>
      </wui-flex>
    `}startOTPTimeout(){this.timeoutTimeLeft=g.getTimeToNextEmailLogin(),this.OTPTimeout=setInterval(()=>{this.timeoutTimeLeft>0?this.timeoutTimeLeft=g.getTimeToNextEmailLogin():clearInterval(this.OTPTimeout)},1e3)}async onOtpInputChange(t){try{this.loading||(this.otp=t.detail,this.shouldSubmitOnOtpChange()&&(this.loading=!0,await this.onOtpSubmit?.(this.otp)))}catch(e){this.error=R.parseError(e),this.loading=!1}}async onResendCode(){try{if(this.onOtpResend){if(!this.loading&&!this.timeoutTimeLeft){if(this.error="",this.otp="",!x.getAuthConnector()||!this.email)throw new Error("w3m-email-otp-widget: Unable to resend email");this.loading=!0,await this.onOtpResend(this.email),this.startOTPTimeout(),$.showSuccess("Code email resent")}}else this.onStartOver&&this.onStartOver()}catch(t){$.showError(t)}finally{this.loading=!1}}getFooterLabels(t){return this.onStartOver?{title:"Something wrong?",action:`Try again ${t?`in ${this.timeoutTimeLeft}s`:""}`}:{title:"Didn't receive it?",action:`Resend ${t?`in ${this.timeoutTimeLeft}s`:"Code"}`}}shouldSubmitOnOtpChange(){return this.authConnector&&this.otp.length===w.OTP_LENGTH}};u.OTP_LENGTH=6;u.styles=k;f([d()],u.prototype,"loading",void 0);f([d()],u.prototype,"timeoutTimeLeft",void 0);f([d()],u.prototype,"error",void 0);u=w=f([v("w3m-email-otp-widget")],u);export{u as W};
