import{n as f,l as a,m}from"./index-BZ7ClDMm.js";import{c as p}from"./index-C0KHCAvF.js";import"./index-C8z005Dk.js";import"./index-356iVkBA.js";import"./index-BbP3371Q.js";import"./index-Di7eWYFI.js";import"./index-C4SyL-to.js";import"./index-TWByYoF0.js";import"./index-Bh4I3Hjc.js";const d=f`
  :host > wui-flex:first-child {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }
`;var u=function(o,t,i,r){var n=arguments.length,e=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(o,t,i,r);else for(var s=o.length-1;s>=0;s--)(l=o[s])&&(e=(n<3?l(e):n>3?l(t,i,e):l(t,i))||e);return n>3&&e&&Object.defineProperty(t,i,e),e};let c=class extends a{render(){return m`
      <wui-flex flexDirection="column" .padding=${["0","3","3","3"]} gap="3">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `}};c.styles=d;c=u([p("w3m-transactions-view")],c);export{c as W3mTransactionsView};
