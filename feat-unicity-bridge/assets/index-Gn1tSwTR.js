import{w as b,s as v,i as y,p as x,n as $,l as g,R,M as T,m,j as C}from"./index-CoFh73Qz.js";import{n as P,r as h,c as w}from"./index-DCJTGv4T.js";const a=x({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),_={state:a,subscribe(t){return y(a,()=>t(a))},subscribeKey(t,e){return v(a,t,e)},showTooltip({message:t,triggerRect:e,variant:o}){a.open=!0,a.message=t,a.triggerRect=e,a.variant=o},hide(){a.open=!1,a.message="",a.triggerRect={width:0,height:0,top:0,left:0}}},s=b(_),j=$`
  :host {
    width: 100%;
    display: block;
  }
`;var f=function(t,e,o,r){var n=arguments.length,i=n<3?e:r===null?r=Object.getOwnPropertyDescriptor(e,o):r,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,o,r);else for(var c=t.length-1;c>=0;c--)(l=t[c])&&(i=(n<3?l(i):n>3?l(e,o,i):l(e,o))||i);return n>3&&i&&Object.defineProperty(e,o,i),i};let d=class extends g{constructor(){super(),this.unsubscribe=[],this.text="",this.open=s.state.open,this.unsubscribe.push(R.subscribeKey("view",()=>{s.hide()}),T.subscribeKey("open",e=>{e||s.hide()}),s.subscribeKey("open",e=>{this.open=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),s.hide()}render(){return m`
      <div
        @pointermove=${this.onMouseEnter.bind(this)}
        @pointerleave=${this.onMouseLeave.bind(this)}
      >
        ${this.renderChildren()}
      </div>
    `}renderChildren(){return m`<slot></slot> `}onMouseEnter(){const e=this.getBoundingClientRect();if(!this.open){const o=document.querySelector("w3m-modal"),r={width:e.width,height:e.height,left:e.left,top:e.top};if(o){const n=o.getBoundingClientRect();r.left=e.left-(window.innerWidth-n.width)/2,r.top=e.top-(window.innerHeight-n.height)/2}s.showTooltip({message:this.text,triggerRect:r,variant:"shade"})}}onMouseLeave(e){this.contains(e.relatedTarget)||s.hide()}};d.styles=[j];f([P()],d.prototype,"text",void 0);f([h()],d.prototype,"open",void 0);d=f([w("w3m-tooltip-trigger")],d);const E=C`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({spacing:t})=>t[3]} 10px ${({spacing:t})=>t[3]};
    border-radius: ${({borderRadius:t})=>t[3]};
    color: ${({tokens:t})=>t.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({spacing:t})=>t[5]});
    transition: opacity ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-2"]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({durations:t})=>t.xl};
    animation-timing-function: ${({easings:t})=>t["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({tokens:t})=>t.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({tokens:t})=>t.theme.backgroundPrimary};
    border: 1px solid ${({tokens:t})=>t.theme.borderPrimary};
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var u=function(t,e,o,r){var n=arguments.length,i=n<3?e:r===null?r=Object.getOwnPropertyDescriptor(e,o):r,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,o,r);else for(var c=t.length-1;c>=0;c--)(l=t[c])&&(i=(n<3?l(i):n>3?l(e,o,i):l(e,o))||i);return n>3&&i&&Object.defineProperty(e,o,i),i};let p=class extends g{constructor(){super(),this.unsubscribe=[],this.open=s.state.open,this.message=s.state.message,this.triggerRect=s.state.triggerRect,this.variant=s.state.variant,this.unsubscribe.push(s.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;const e=this.triggerRect.top,o=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${o}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?"flex":"none"};
    --w3m-tooltip-opacity: ${this.open?1:0};
    `,m`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`}};p.styles=[E];u([h()],p.prototype,"open",void 0);u([h()],p.prototype,"message",void 0);u([h()],p.prototype,"triggerRect",void 0);u([h()],p.prototype,"variant",void 0);p=u([w("w3m-tooltip")],p);
