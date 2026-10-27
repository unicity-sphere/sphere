import{n,Y as d,t as r,p as M,O as o,s as c}from"./property-CnFDNXw5.js";var u=Object.defineProperty,y=Object.getOwnPropertyDescriptor,s=(a,l,p,i)=>{for(var e=i>1?void 0:i?y(l,p):l,h=a.length-1,g;h>=0;h--)(g=a[h])&&(e=(i?g(l,p,e):g(e))||e);return i&&e&&u(l,p,e),e};let t=class extends n{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var a;return d`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${t.weightsMap.get((a=this.weight)!=null?a:"regular")}
    </svg>`}};t.weightsMap=new Map([["thin",r`<path d="M226.83,221.17l-52.7-52.7a84.1,84.1,0,1,0-5.66,5.66l52.7,52.7a4,4,0,0,0,5.66-5.66ZM36,112a76,76,0,1,1,76,76A76.08,76.08,0,0,1,36,112Z"/>`],["light",r`<path d="M228.24,219.76l-51.38-51.38a86.15,86.15,0,1,0-8.48,8.48l51.38,51.38a6,6,0,0,0,8.48-8.48ZM38,112a74,74,0,1,1,74,74A74.09,74.09,0,0,1,38,112Z"/>`],["regular",r`<path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>`],["bold",r`<path d="M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z"/>`],["fill",r`<path d="M168,112a56,56,0,1,1-56-56A56,56,0,0,1,168,112Zm61.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88,88,0,1,1,11.32-11.31l50.06,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z"/>`],["duotone",r`<path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity="0.2"/><path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>`]]);t.styles=M`
    :host {
      display: contents;
    }
  `;s([o({type:String,reflect:!0})],t.prototype,"size",2);s([o({type:String,reflect:!0})],t.prototype,"weight",2);s([o({type:String,reflect:!0})],t.prototype,"color",2);s([o({type:Boolean,reflect:!0})],t.prototype,"mirrored",2);t=s([c("ph-magnifying-glass")],t);export{t as PhMagnifyingGlass};
