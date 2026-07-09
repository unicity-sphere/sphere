import{j as h,r as m,k as g,l as y,m as d}from"./index-SHvJ_SIR.js";import{n as i,c as b,o as p}from"./index-lwM0RWb1.js";import"./index-B5Eu0C32.js";const f=h`
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
`;var t=function(e,n,a,l){var s=arguments.length,r=s<3?n:l===null?l=Object.getOwnPropertyDescriptor(n,a):l,u;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(e,n,a,l);else for(var c=e.length-1;c>=0;c--)(u=e[c])&&(r=(s<3?u(r):s>3?u(n,a,r):u(n,a))||r);return s>3&&r&&Object.defineProperty(n,a,r),r};let o=class extends y{constructor(){super(...arguments),this.type="primary",this.imageSrc="google",this.imageSize=void 0,this.loading=!1,this.boxColor="foregroundPrimary",this.disabled=!1,this.rightIcon=!0,this.boxed=!0,this.rounded=!1,this.fullSize=!1}render(){return this.dataset.rounded=this.rounded?"true":"false",this.dataset.type=this.type,d`
      <button
        ?disabled=${this.loading?!0:!!this.disabled}
        data-loading=${this.loading}
        tabindex=${p(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `}templateLeftIcon(){return this.icon?d`<wui-image
        icon=${this.icon}
        iconColor=${p(this.iconColor)}
        ?boxed=${this.boxed}
        ?rounded=${this.rounded}
        boxColor=${this.boxColor}
      ></wui-image>`:d`<wui-image
      ?boxed=${this.boxed}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      size=${p(this.imageSize)}
      src=${this.imageSrc}
      boxColor=${this.boxColor}
    ></wui-image>`}templateRightIcon(){return this.rightIcon?this.loading?d`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:d`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`:null}};o.styles=[m,g,f];t([i()],o.prototype,"type",void 0);t([i()],o.prototype,"imageSrc",void 0);t([i()],o.prototype,"imageSize",void 0);t([i()],o.prototype,"icon",void 0);t([i()],o.prototype,"iconColor",void 0);t([i({type:Boolean})],o.prototype,"loading",void 0);t([i()],o.prototype,"tabIdx",void 0);t([i()],o.prototype,"boxColor",void 0);t([i({type:Boolean})],o.prototype,"disabled",void 0);t([i({type:Boolean})],o.prototype,"rightIcon",void 0);t([i({type:Boolean})],o.prototype,"boxed",void 0);t([i({type:Boolean})],o.prototype,"rounded",void 0);t([i({type:Boolean})],o.prototype,"fullSize",void 0);o=t([b("wui-list-item")],o);
