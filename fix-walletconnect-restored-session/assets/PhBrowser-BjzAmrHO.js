import{n as l,Y as n,t as r,p as g,O as p,s as c}from"./property-CnFDNXw5.js";var d=Object.defineProperty,Z=Object.getOwnPropertyDescriptor,s=(o,a,H,i)=>{for(var e=i>1?void 0:i?Z(a,H):a,V=o.length-1,h;V>=0;V--)(h=o[V])&&(e=(i?h(a,H,e):h(e))||e);return i&&e&&d(a,H,e),e};let t=class extends l{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var o;return n`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${t.weightsMap.get((o=this.weight)!=null?o:"regular")}
    </svg>`}};t.weightsMap=new Map([["thin",r`<path d="M216,44H40A12,12,0,0,0,28,56V200a12,12,0,0,0,12,12H216a12,12,0,0,0,12-12V56A12,12,0,0,0,216,44ZM40,52H216a4,4,0,0,1,4,4V92H36V56A4,4,0,0,1,40,52ZM216,204H40a4,4,0,0,1-4-4V100H220V200A4,4,0,0,1,216,204Z"/>`],["light",r`<path d="M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM40,54H216a2,2,0,0,1,2,2V90H38V56A2,2,0,0,1,40,54ZM216,202H40a2,2,0,0,1-2-2V102H218v98A2,2,0,0,1,216,202Z"/>`],["regular",r`<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V88H40V56Zm0,144H40V104H216v96Z"/>`],["bold",r`<path d="M216,36H40A20,20,0,0,0,20,56V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V56A20,20,0,0,0,216,36Zm-4,24V84H44V60ZM44,196V108H212v88Z"/>`],["fill",r`<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V88H40V56Z"/>`],["duotone",r`<path d="M224,56V96H32V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity="0.2"/><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V88H40V56Zm0,144H40V104H216v96Z"/>`]]);t.styles=g`
    :host {
      display: contents;
    }
  `;s([p({type:String,reflect:!0})],t.prototype,"size",2);s([p({type:String,reflect:!0})],t.prototype,"weight",2);s([p({type:String,reflect:!0})],t.prototype,"color",2);s([p({type:Boolean,reflect:!0})],t.prototype,"mirrored",2);t=s([c("ph-browser")],t);export{t as PhBrowser};
