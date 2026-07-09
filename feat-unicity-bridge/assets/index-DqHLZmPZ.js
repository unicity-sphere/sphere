import{j as u,r as h,k as f,l as p,m as g}from"./index-SHvJ_SIR.js";import{n as d,c as m,o as b}from"./index-lwM0RWb1.js";const y=u`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    border-radius: ${({borderRadius:o})=>o[2]};
    padding: ${({spacing:o})=>o[1]} !important;
    background-color: ${({tokens:o})=>o.theme.backgroundPrimary};
    position: relative;
  }

  :host([data-padding='2']) {
    padding: ${({spacing:o})=>o[2]} !important;
  }

  :host:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: ${({borderRadius:o})=>o[2]};
  }

  :host > wui-icon {
    z-index: 10;
  }

  /* -- Colors --------------------------------------------------- */
  :host([data-color='accent-primary']) {
    color: ${({tokens:o})=>o.core.iconAccentPrimary};
  }

  :host([data-color='accent-primary']):after {
    background-color: ${({tokens:o})=>o.core.foregroundAccent010};
  }

  :host([data-color='default']),
  :host([data-color='secondary']) {
    color: ${({tokens:o})=>o.theme.iconDefault};
  }

  :host([data-color='default']):after {
    background-color: ${({tokens:o})=>o.theme.foregroundPrimary};
  }

  :host([data-color='secondary']):after {
    background-color: ${({tokens:o})=>o.theme.foregroundSecondary};
  }

  :host([data-color='success']) {
    color: ${({tokens:o})=>o.core.iconSuccess};
  }

  :host([data-color='success']):after {
    background-color: ${({tokens:o})=>o.core.backgroundSuccess};
  }

  :host([data-color='error']) {
    color: ${({tokens:o})=>o.core.iconError};
  }

  :host([data-color='error']):after {
    background-color: ${({tokens:o})=>o.core.backgroundError};
  }

  :host([data-color='warning']) {
    color: ${({tokens:o})=>o.core.iconWarning};
  }

  :host([data-color='warning']):after {
    background-color: ${({tokens:o})=>o.core.backgroundWarning};
  }

  :host([data-color='inverse']) {
    color: ${({tokens:o})=>o.theme.iconInverse};
  }

  :host([data-color='inverse']):after {
    background-color: transparent;
  }
`;var a=function(o,e,c,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,c):n,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(o,e,c,n);else for(var l=o.length-1;l>=0;l--)(s=o[l])&&(r=(i<3?s(r):i>3?s(e,c,r):s(e,c))||r);return i>3&&r&&Object.defineProperty(e,c,r),r};let t=class extends p{constructor(){super(...arguments),this.icon="copy",this.size="md",this.padding="1",this.color="default"}render(){return this.dataset.padding=this.padding,this.dataset.color=this.color,g`
      <wui-icon size=${b(this.size)} name=${this.icon} color="inherit"></wui-icon>
    `}};t.styles=[h,f,y];a([d()],t.prototype,"icon",void 0);a([d()],t.prototype,"size",void 0);a([d()],t.prototype,"padding",void 0);a([d()],t.prototype,"color",void 0);t=a([m("wui-icon-box")],t);
