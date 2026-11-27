import{n as g,Y as d,t as r,p as w,O as s,s as c}from"./property-CnFDNXw5.js";var u=Object.defineProperty,y=Object.getOwnPropertyDescriptor,l=(a,o,h,i)=>{for(var e=i>1?void 0:i?y(o,h):o,p=a.length-1,n;p>=0;p--)(n=a[p])&&(e=(i?n(o,h,e):n(e))||e);return i&&e&&u(o,h,e),e};let t=class extends g{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var a;return d`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${t.weightsMap.get((a=this.weight)!=null?a:"regular")}
    </svg>`}};t.weightsMap=new Map([["thin",r`<path d="M202.83,146.83l-72,72a4,4,0,0,1-5.66,0l-72-72a4,4,0,0,1,5.66-5.66L124,206.34V40a4,4,0,0,1,8,0V206.34l65.17-65.17a4,4,0,0,1,5.66,5.66Z"/>`],["light",r`<path d="M204.24,148.24l-72,72a6,6,0,0,1-8.48,0l-72-72a6,6,0,0,1,8.48-8.48L122,201.51V40a6,6,0,0,1,12,0V201.51l61.76-61.75a6,6,0,0,1,8.48,8.48Z"/>`],["regular",r`<path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z"/>`],["bold",r`<path d="M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z"/>`],["fill",r`<path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72A8,8,0,0,1,56,136h64V40a8,8,0,0,1,16,0v96h64a8,8,0,0,1,5.66,13.66Z"/>`],["duotone",r`<path d="M200,144l-72,72L56,144Z" opacity="0.2"/><path d="M207.39,140.94A8,8,0,0,0,200,136H136V40a8,8,0,0,0-16,0v96H56a8,8,0,0,0-5.66,13.66l72,72a8,8,0,0,0,11.32,0l72-72A8,8,0,0,0,207.39,140.94ZM128,204.69,75.31,152H180.69Z"/>`]]);t.styles=w`
    :host {
      display: contents;
    }
  `;l([s({type:String,reflect:!0})],t.prototype,"size",2);l([s({type:String,reflect:!0})],t.prototype,"weight",2);l([s({type:String,reflect:!0})],t.prototype,"color",2);l([s({type:Boolean,reflect:!0})],t.prototype,"mirrored",2);t=l([c("ph-arrow-down")],t);export{t as PhArrowDown};
