import{n as g,Y as d,t as r,p as u,O as p,s as c}from"./property-CnFDNXw5.js";var w=Object.defineProperty,y=Object.getOwnPropertyDescriptor,o=(a,l,s,i)=>{for(var e=i>1?void 0:i?y(l,s):l,h=a.length-1,n;h>=0;h--)(n=a[h])&&(e=(i?n(l,s,e):n(e))||e);return i&&e&&w(l,s,e),e};let t=class extends g{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var a;return d`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${t.weightsMap.get((a=this.weight)!=null?a:"regular")}
    </svg>`}};t.weightsMap=new Map([["thin",r`<path d="M202.83,114.83a4,4,0,0,1-5.66,0L132,49.66V216a4,4,0,0,1-8,0V49.66L58.83,114.83a4,4,0,0,1-5.66-5.66l72-72a4,4,0,0,1,5.66,0l72,72A4,4,0,0,1,202.83,114.83Z"/>`],["light",r`<path d="M204.24,116.24a6,6,0,0,1-8.48,0L134,54.49V216a6,6,0,0,1-12,0V54.49L60.24,116.24a6,6,0,0,1-8.48-8.48l72-72a6,6,0,0,1,8.48,0l72,72A6,6,0,0,1,204.24,116.24Z"/>`],["regular",r`<path d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"/>`],["bold",r`<path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"/>`],["fill",r`<path d="M207.39,115.06A8,8,0,0,1,200,120H136v96a8,8,0,0,1-16,0V120H56a8,8,0,0,1-5.66-13.66l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,207.39,115.06Z"/>`],["duotone",r`<path d="M200,112H56l72-72Z" opacity="0.2"/><path d="M205.66,106.34l-72-72a8,8,0,0,0-11.32,0l-72,72A8,8,0,0,0,56,120h64v96a8,8,0,0,0,16,0V120h64a8,8,0,0,0,5.66-13.66ZM75.31,104,128,51.31,180.69,104Z"/>`]]);t.styles=u`
    :host {
      display: contents;
    }
  `;o([p({type:String,reflect:!0})],t.prototype,"size",2);o([p({type:String,reflect:!0})],t.prototype,"weight",2);o([p({type:String,reflect:!0})],t.prototype,"color",2);o([p({type:Boolean,reflect:!0})],t.prototype,"mirrored",2);t=o([c("ph-arrow-up")],t);export{t as PhArrowUp};
