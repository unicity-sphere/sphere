import{j as u,r as p,l as g,m as c}from"./index-B5I1SqSM.js";import{n as r,c as f,o as m}from"./index-UOodl-4X.js";const b=u`
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
`;var o=function(e,i,n,a){var d=arguments.length,s=d<3?i:a===null?a=Object.getOwnPropertyDescriptor(i,n):a,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(e,i,n,a);else for(var h=e.length-1;h>=0;h--)(l=e[h])&&(s=(d<3?l(s):d>3?l(i,n,s):l(i,n))||s);return d>3&&s&&Object.defineProperty(i,n,s),s};let t=class extends g{constructor(){super(...arguments),this.src="./path/to/image.jpg",this.alt="Image",this.size=void 0,this.boxed=!1,this.rounded=!1,this.fullSize=!1}render(){const i={inherit:"inherit",xxs:"2",xs:"3",sm:"4",md:"4",mdl:"5",lg:"5",xl:"6",xxl:"7","3xl":"8","4xl":"9","5xl":"10"};return this.style.cssText=`
      --local-width: ${this.size?`var(--apkt-spacing-${i[this.size]});`:"100%"};
      --local-height: ${this.size?`var(--apkt-spacing-${i[this.size]});`:"100%"};
      `,this.dataset.boxed=this.boxed?"true":"false",this.dataset.rounded=this.rounded?"true":"false",this.dataset.full=this.fullSize?"true":"false",this.dataset.icon=this.iconColor||"inherit",this.icon?c`<wui-icon
        color=${this.iconColor||"inherit"}
        name=${this.icon}
        size="lg"
      ></wui-icon> `:this.logo?c`<wui-icon size="lg" color="inherit" name=${this.logo}></wui-icon> `:c`<img src=${m(this.src)} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent("onLoadError",{bubbles:!0,composed:!0}))}};t.styles=[p,b];o([r()],t.prototype,"src",void 0);o([r()],t.prototype,"logo",void 0);o([r()],t.prototype,"icon",void 0);o([r()],t.prototype,"iconColor",void 0);o([r()],t.prototype,"alt",void 0);o([r()],t.prototype,"size",void 0);o([r({type:Boolean})],t.prototype,"boxed",void 0);o([r({type:Boolean})],t.prototype,"rounded",void 0);o([r({type:Boolean})],t.prototype,"fullSize",void 0);t=o([f("wui-image")],t);
