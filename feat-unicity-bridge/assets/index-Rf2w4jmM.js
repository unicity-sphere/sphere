import{j as U,r as ye,k as Se,l as _,m as l,q as I,a6 as Pe,o as T,a7 as Te,a8 as w,a as O,a9 as ve,aa as N,O as ie,N as A,ab as ue,C as m,D as P,E as W,S as R,x as ke,M as z,s as _e,i as Ce,p as $e,y as S,R as M,v as Re,n as Oe}from"./index-SHvJ_SIR.js";import{n as b,c as C,o as g,r as h,U as Ue,b as xe}from"./index-lwM0RWb1.js";import"./index-BreMSG2A.js";import"./index-0JYDrrTb.js";import"./index-DB4xTj6r.js";import"./index-CCCoN1HA.js";import"./index-B5Eu0C32.js";import"./index-BFWul0F2.js";import"./index-DDCfM4Ta.js";import"./index-BuT9c-wq.js";import{M as le}from"./MathUtil-BGCe3rZ3.js";const Le=U`
  :host {
    position: relative;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    padding: ${({spacing:t})=>t[1]};
  }

  /* -- Colors --------------------------------------------------- */
  button[data-type='accent'] wui-icon {
    color: ${({tokens:t})=>t.core.iconAccentPrimary};
  }

  button[data-type='neutral'][data-variant='primary'] wui-icon {
    color: ${({tokens:t})=>t.theme.iconInverse};
  }

  button[data-type='neutral'][data-variant='secondary'] wui-icon {
    color: ${({tokens:t})=>t.theme.iconDefault};
  }

  button[data-type='success'] wui-icon {
    color: ${({tokens:t})=>t.core.iconSuccess};
  }

  button[data-type='error'] wui-icon {
    color: ${({tokens:t})=>t.core.iconError};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='xs'] {
    width: 16px;
    height: 16px;

    border-radius: ${({borderRadius:t})=>t[1]};
  }

  button[data-size='sm'] {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:t})=>t[1]};
  }

  button[data-size='md'] {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  button[data-size='lg'] {
    width: 28px;
    height: 28px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  button[data-size='xs'] wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] wui-icon {
    width: 20px;
    height: 20px;
  }

  /* -- Hover --------------------------------------------------- */
  @media (hover: hover) {
    button[data-type='accent']:hover:enabled {
      background-color: ${({tokens:t})=>t.core.foregroundAccent010};
    }

    button[data-variant='primary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }

    button[data-variant='secondary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }

    button[data-type='success']:hover:enabled {
      background-color: ${({tokens:t})=>t.core.backgroundSuccess};
    }

    button[data-type='error']:hover:enabled {
      background-color: ${({tokens:t})=>t.core.backgroundError};
    }
  }

  /* -- Focus --------------------------------------------------- */
  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:t})=>t.core.foregroundAccent020};
  }

  /* -- Properties --------------------------------------------------- */
  button[data-full-width='true'] {
    width: 100%;
  }

  :host([fullWidth]) {
    width: 100%;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var D=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};let v=class extends _{constructor(){super(...arguments),this.icon="card",this.variant="primary",this.type="accent",this.size="md",this.iconSize=void 0,this.fullWidth=!1,this.disabled=!1}render(){return l`<button
      data-variant=${this.variant}
      data-type=${this.type}
      data-size=${this.size}
      data-full-width=${this.fullWidth}
      ?disabled=${this.disabled}
    >
      <wui-icon color="inherit" name=${this.icon} size=${g(this.iconSize)}></wui-icon>
    </button>`}};v.styles=[ye,Se,Le];D([b()],v.prototype,"icon",void 0);D([b()],v.prototype,"variant",void 0);D([b()],v.prototype,"type",void 0);D([b()],v.prototype,"size",void 0);D([b()],v.prototype,"iconSize",void 0);D([b({type:Boolean})],v.prototype,"fullWidth",void 0);D([b({type:Boolean})],v.prototype,"disabled",void 0);v=D([C("wui-icon-button")],v);const d={INVALID_PAYMENT_CONFIG:"INVALID_PAYMENT_CONFIG",INVALID_RECIPIENT:"INVALID_RECIPIENT",INVALID_ASSET:"INVALID_ASSET",INVALID_AMOUNT:"INVALID_AMOUNT",UNKNOWN_ERROR:"UNKNOWN_ERROR",UNABLE_TO_INITIATE_PAYMENT:"UNABLE_TO_INITIATE_PAYMENT",INVALID_CHAIN_NAMESPACE:"INVALID_CHAIN_NAMESPACE",GENERIC_PAYMENT_ERROR:"GENERIC_PAYMENT_ERROR",UNABLE_TO_GET_EXCHANGES:"UNABLE_TO_GET_EXCHANGES",ASSET_NOT_SUPPORTED:"ASSET_NOT_SUPPORTED",UNABLE_TO_GET_PAY_URL:"UNABLE_TO_GET_PAY_URL",UNABLE_TO_GET_BUY_STATUS:"UNABLE_TO_GET_BUY_STATUS",UNABLE_TO_GET_TOKEN_BALANCES:"UNABLE_TO_GET_TOKEN_BALANCES",UNABLE_TO_GET_QUOTE:"UNABLE_TO_GET_QUOTE",UNABLE_TO_GET_QUOTE_STATUS:"UNABLE_TO_GET_QUOTE_STATUS",INVALID_RECIPIENT_ADDRESS_FOR_ASSET:"INVALID_RECIPIENT_ADDRESS_FOR_ASSET"},L={[d.INVALID_PAYMENT_CONFIG]:"Invalid payment configuration",[d.INVALID_RECIPIENT]:"Invalid recipient address",[d.INVALID_ASSET]:"Invalid asset specified",[d.INVALID_AMOUNT]:"Invalid payment amount",[d.INVALID_RECIPIENT_ADDRESS_FOR_ASSET]:"Invalid recipient address for the asset selected",[d.UNKNOWN_ERROR]:"Unknown payment error occurred",[d.UNABLE_TO_INITIATE_PAYMENT]:"Unable to initiate payment",[d.INVALID_CHAIN_NAMESPACE]:"Invalid chain namespace",[d.GENERIC_PAYMENT_ERROR]:"Unable to process payment",[d.UNABLE_TO_GET_EXCHANGES]:"Unable to get exchanges",[d.ASSET_NOT_SUPPORTED]:"Asset not supported by the selected exchange",[d.UNABLE_TO_GET_PAY_URL]:"Unable to get payment URL",[d.UNABLE_TO_GET_BUY_STATUS]:"Unable to get buy status",[d.UNABLE_TO_GET_TOKEN_BALANCES]:"Unable to get token balances",[d.UNABLE_TO_GET_QUOTE]:"Unable to get quote. Please choose a different token",[d.UNABLE_TO_GET_QUOTE_STATUS]:"Unable to get quote status"};class p extends Error{get message(){return L[this.code]}constructor(e,n){super(L[e]),this.name="AppKitPayError",this.code=e,this.details=n,Error.captureStackTrace&&Error.captureStackTrace(this,p)}}const qe="https://rpc.walletconnect.org/v1/json-rpc",de="reown_test";function De(){const{chainNamespace:t}=w.parseCaipNetworkId(c.state.paymentAsset.network);if(!O.isAddress(c.state.recipient,t))throw new p(d.INVALID_RECIPIENT_ADDRESS_FOR_ASSET,`Provide valid recipient address for namespace "${t}"`)}async function Fe(t,e,n){if(e!==I.CHAIN.EVM)throw new p(d.INVALID_CHAIN_NAMESPACE);if(!n.fromAddress)throw new p(d.INVALID_PAYMENT_CONFIG,"fromAddress is required for native EVM payments.");const s=typeof n.amount=="string"?parseFloat(n.amount):n.amount;if(isNaN(s))throw new p(d.INVALID_PAYMENT_CONFIG);const a=t.metadata?.decimals??18,i=T.parseUnits(s.toString(),a);if(typeof i!="bigint")throw new p(d.GENERIC_PAYMENT_ERROR);return await T.sendTransaction({chainNamespace:e,to:n.recipient,address:n.fromAddress,value:i,data:"0x"})??void 0}async function Be(t,e){if(!e.fromAddress)throw new p(d.INVALID_PAYMENT_CONFIG,"fromAddress is required for ERC20 EVM payments.");const n=t.asset,s=e.recipient,a=Number(t.metadata.decimals),i=T.parseUnits(e.amount.toString(),a);if(i===void 0)throw new p(d.GENERIC_PAYMENT_ERROR);return await T.writeContract({fromAddress:e.fromAddress,tokenAddress:n,args:[s,i],method:"transfer",abi:Te.getERC20Abi(n),chainNamespace:I.CHAIN.EVM})??void 0}async function je(t,e){if(t!==I.CHAIN.SOLANA)throw new p(d.INVALID_CHAIN_NAMESPACE);if(!e.fromAddress)throw new p(d.INVALID_PAYMENT_CONFIG,"fromAddress is required for Solana payments.");const n=typeof e.amount=="string"?parseFloat(e.amount):e.amount;if(isNaN(n)||n<=0)throw new p(d.INVALID_PAYMENT_CONFIG,"Invalid payment amount.");try{if(!Pe.getProvider(t))throw new p(d.GENERIC_PAYMENT_ERROR,"No Solana provider available.");const a=await T.sendTransaction({chainNamespace:I.CHAIN.SOLANA,to:e.recipient,value:n,tokenMint:e.tokenMint});if(!a)throw new p(d.GENERIC_PAYMENT_ERROR,"Transaction failed.");return a}catch(s){throw s instanceof p?s:new p(d.GENERIC_PAYMENT_ERROR,`Solana payment failed: ${s}`)}}async function We({sourceToken:t,toToken:e,amount:n,recipient:s}){const a=T.parseUnits(n,t.metadata.decimals),i=T.parseUnits(n,e.metadata.decimals);return Promise.resolve({type:te,origin:{amount:a?.toString()??"0",currency:t},destination:{amount:i?.toString()??"0",currency:e},fees:[{id:"service",label:"Service Fee",amount:"0",currency:e}],steps:[{requestId:te,type:"deposit",deposit:{amount:a?.toString()??"0",currency:t.asset,receiver:s}}],timeInSeconds:6})}function ee(t){if(!t)return null;const e=t.steps[0];return!e||e.type!==nt?null:e}function X(t,e=0){if(!t)return[];const n=t.steps.filter(a=>a.type===st),s=n.filter((a,i)=>i+1>e);return n.length>0&&n.length<3?s:[]}const ae=new ve({baseUrl:O.getApiUrl(),clientId:null});class Me extends Error{}function ze(){const t=ie.getSnapshot().projectId;return`${qe}?projectId=${t}`}function re(){const{projectId:t,sdkType:e,sdkVersion:n}=ie.state;return{projectId:t,st:e||"appkit",sv:n||"html-wagmi-4.2.2"}}async function oe(t,e){const n=ze(),{sdkType:s,sdkVersion:a,projectId:i}=ie.getSnapshot(),o={jsonrpc:"2.0",id:1,method:t,params:{...e||{},st:s,sv:a,projectId:i}},x=await(await fetch(n,{method:"POST",body:JSON.stringify(o),headers:{"Content-Type":"application/json"}})).json();if(x.error)throw new Me(x.error.message);return x}async function pe(t){return(await oe("reown_getExchanges",t)).result}async function he(t){return(await oe("reown_getExchangePayUrl",t)).result}async function Ge(t){return(await oe("reown_getExchangeBuyStatus",t)).result}async function Qe(t){const e=A.bigNumber(t.amount).times(10**t.toToken.metadata.decimals).toString(),{chainId:n,chainNamespace:s}=w.parseCaipNetworkId(t.sourceToken.network),{chainId:a,chainNamespace:i}=w.parseCaipNetworkId(t.toToken.network),o=t.sourceToken.asset==="native"?ue(s):t.sourceToken.asset,u=t.toToken.asset==="native"?ue(i):t.toToken.asset;return await ae.post({path:"/appkit/v1/transfers/quote",body:{user:t.address,originChainId:n.toString(),originCurrency:o,destinationChainId:a.toString(),destinationCurrency:u,recipient:t.recipient,amount:e},params:re()})}async function Ve(t){const e=N.isLowerCaseMatch(t.sourceToken.network,t.toToken.network),n=N.isLowerCaseMatch(t.sourceToken.asset,t.toToken.asset);return e&&n?We(t):Qe(t)}async function Ye(t){return await ae.get({path:"/appkit/v1/transfers/status",params:{requestId:t.requestId,...re()}})}async function He(t){return await ae.get({path:`/appkit/v1/transfers/assets/exchanges/${t}`,params:re()})}const Ke=["eip155","solana"],Xe={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}},me={56:"714",204:"714"};function J(t,e){const{chainNamespace:n,chainId:s}=w.parseCaipNetworkId(t),a=Xe[n];if(!a)throw new Error(`Unsupported chain namespace for CAIP-19 formatting: ${n}`);let i=a.native.assetNamespace,o=a.native.assetReference;return e!=="native"?(i=a.defaultTokenNamespace,o=e):n==="eip155"&&me[s]&&(o=me[s]),`${`${n}:${s}`}/${i}:${o}`}function Je(t){const{chainNamespace:e}=w.parseCaipNetworkId(t);return Ke.includes(e)}function Ze(t){const n=m.getAllRequestedCaipNetworks().find(a=>a.caipNetworkId===t.chainId);let s=t.address;if(!n)throw new Error(`Target network not found for balance chainId "${t.chainId}"`);if(N.isLowerCaseMatch(t.symbol,n.nativeCurrency.symbol))s="native";else if(O.isCaipAddress(s)){const{address:a}=w.parseCaipAddress(s);s=a}else if(!s)throw new Error(`Balance address not found for balance symbol "${t.symbol}"`);return{network:n.caipNetworkId,asset:s,metadata:{name:t.name,symbol:t.symbol,decimals:Number(t.quantity.decimals),logoURI:t.iconUrl},amount:t.quantity.numeric}}function et(t){return{chainId:t.network,address:`${t.network}:${t.asset}`,symbol:t.metadata.symbol,name:t.metadata.name,iconUrl:t.metadata.logoURI||"",price:0,quantity:{numeric:"0",decimals:t.metadata.decimals.toString()}}}function Q(t){const e=A.bigNumber(t,{safe:!0});return e.lt(.001)?"<0.001":e.round(4).toString()}function tt(t){const n=m.getAllRequestedCaipNetworks().find(s=>s.caipNetworkId===t.network);return n?!!n.testnet:!1}const ge=0,Z="unknown",te="direct-transfer",nt="deposit",st="transaction",r=$e({paymentAsset:{network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},recipient:"0x0",amount:0,isConfigured:!1,error:null,isPaymentInProgress:!1,exchanges:[],isLoading:!1,openInNewTab:!0,redirectUrl:void 0,payWithExchange:void 0,currentPayment:void 0,analyticsSet:!1,paymentId:void 0,choice:"pay",tokenBalances:{[I.CHAIN.EVM]:[],[I.CHAIN.SOLANA]:[]},isFetchingTokenBalances:!1,selectedPaymentAsset:null,quote:void 0,quoteStatus:"waiting",quoteError:null,isFetchingQuote:!1,selectedExchange:void 0,exchangeUrlForQuote:void 0,requestId:void 0}),c={state:r,subscribe(t){return Ce(r,()=>t(r))},subscribeKey(t,e){return _e(r,t,e)},async handleOpenPay(t){this.resetState(),this.setPaymentConfig(t),this.initializeAnalytics(),De(),await this.prepareTokenLogo(),r.isConfigured=!0,W.sendEvent({type:"track",event:"PAY_MODAL_OPEN",properties:{exchanges:r.exchanges,configuration:{network:r.paymentAsset.network,asset:r.paymentAsset.asset,recipient:r.recipient,amount:r.amount}}}),await z.open({view:"Pay"})},resetState(){r.paymentAsset={network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},r.recipient="0x0",r.amount=0,r.isConfigured=!1,r.error=null,r.isPaymentInProgress=!1,r.isLoading=!1,r.currentPayment=void 0,r.selectedExchange=void 0,r.exchangeUrlForQuote=void 0,r.requestId=void 0},resetQuoteState(){r.quote=void 0,r.quoteStatus="waiting",r.quoteError=null,r.isFetchingQuote=!1,r.requestId=void 0},setPaymentConfig(t){if(!t.paymentAsset)throw new p(d.INVALID_PAYMENT_CONFIG);try{r.choice=t.choice??"pay",r.paymentAsset=t.paymentAsset,r.recipient=t.recipient,r.amount=t.amount,r.openInNewTab=t.openInNewTab??!0,r.redirectUrl=t.redirectUrl,r.payWithExchange=t.payWithExchange,r.error=null}catch(e){throw new p(d.INVALID_PAYMENT_CONFIG,e.message)}},setSelectedPaymentAsset(t){r.selectedPaymentAsset=t},setSelectedExchange(t){r.selectedExchange=t},setRequestId(t){r.requestId=t},setPaymentInProgress(t){r.isPaymentInProgress=t},getPaymentAsset(){return r.paymentAsset},getExchanges(){return r.exchanges},async fetchExchanges(){try{r.isLoading=!0;const t=await pe({page:ge});r.exchanges=t.exchanges.slice(0,2)}catch{throw R.showError(L.UNABLE_TO_GET_EXCHANGES),new p(d.UNABLE_TO_GET_EXCHANGES)}finally{r.isLoading=!1}},async getAvailableExchanges(t){try{const e=t?.asset&&t?.network?J(t.network,t.asset):void 0;return await pe({page:t?.page??ge,asset:e,amount:t?.amount?.toString()})}catch{throw new p(d.UNABLE_TO_GET_EXCHANGES)}},async getPayUrl(t,e,n=!1){try{const s=Number(e.amount),a=await he({exchangeId:t,asset:J(e.network,e.asset),amount:s.toString(),recipient:`${e.network}:${e.recipient}`});return W.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{source:"pay",exchange:{id:t},configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:s},currentPayment:{type:"exchange",exchangeId:t},headless:n}}),n&&(this.initiatePayment(),W.sendEvent({type:"track",event:"PAY_INITIATED",properties:{source:"pay",paymentId:r.paymentId||Z,configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:s},currentPayment:{type:"exchange",exchangeId:t}}})),a}catch(s){throw s instanceof Error&&s.message.includes("is not supported")?new p(d.ASSET_NOT_SUPPORTED):new Error(s.message)}},async generateExchangeUrlForQuote({exchangeId:t,paymentAsset:e,amount:n,recipient:s}){const a=await he({exchangeId:t,asset:J(e.network,e.asset),amount:n.toString(),recipient:s});r.exchangeSessionId=a.sessionId,r.exchangeUrlForQuote=a.url},async openPayUrl(t,e,n=!1){try{const s=await this.getPayUrl(t.exchangeId,e,n);if(!s)throw new p(d.UNABLE_TO_GET_PAY_URL);const i=t.openInNewTab??!0?"_blank":"_self";return O.openHref(s.url,i),s}catch(s){throw s instanceof p?r.error=s.message:r.error=L.GENERIC_PAYMENT_ERROR,new p(d.UNABLE_TO_GET_PAY_URL)}},async onTransfer({chainNamespace:t,fromAddress:e,toAddress:n,amount:s,paymentAsset:a}){if(r.currentPayment={type:"wallet",status:"IN_PROGRESS"},!r.isPaymentInProgress)try{this.initiatePayment();const o=m.getAllRequestedCaipNetworks().find(x=>x.caipNetworkId===a.network);if(!o)throw new Error("Target network not found");const u=m.state.activeCaipNetwork;switch(N.isLowerCaseMatch(u?.caipNetworkId,o.caipNetworkId)||await m.switchActiveNetwork(o),t){case I.CHAIN.EVM:a.asset==="native"&&(r.currentPayment.result=await Fe(a,t,{recipient:n,amount:s,fromAddress:e})),a.asset.startsWith("0x")&&(r.currentPayment.result=await Be(a,{recipient:n,amount:s,fromAddress:e})),r.currentPayment.status="SUCCESS";break;case I.CHAIN.SOLANA:r.currentPayment.result=await je(t,{recipient:n,amount:s,fromAddress:e,tokenMint:a.asset==="native"?void 0:a.asset}),r.currentPayment.status="SUCCESS";break;default:throw new p(d.INVALID_CHAIN_NAMESPACE)}}catch(i){throw i instanceof p?r.error=i.message:r.error=L.GENERIC_PAYMENT_ERROR,r.currentPayment.status="FAILED",R.showError(r.error),i}finally{r.isPaymentInProgress=!1}},async onSendTransaction(t){try{const{namespace:e,transactionStep:n}=t;c.initiatePayment();const a=m.getAllRequestedCaipNetworks().find(o=>o.caipNetworkId===r.paymentAsset?.network);if(!a)throw new Error("Target network not found");const i=m.state.activeCaipNetwork;if(N.isLowerCaseMatch(i?.caipNetworkId,a.caipNetworkId)||await m.switchActiveNetwork(a),e===I.CHAIN.EVM){const{from:o,to:u,data:x,value:K}=n.transaction;await T.sendTransaction({address:o,to:u,data:x,value:BigInt(K),chainNamespace:e})}else if(e===I.CHAIN.SOLANA){const{instructions:o}=n.transaction;await T.writeSolanaTransaction({instructions:o})}}catch(e){throw e instanceof p?r.error=e.message:r.error=L.GENERIC_PAYMENT_ERROR,R.showError(r.error),e}finally{r.isPaymentInProgress=!1}},getExchangeById(t){return r.exchanges.find(e=>e.id===t)},validatePayConfig(t){const{paymentAsset:e,recipient:n,amount:s}=t;if(!e)throw new p(d.INVALID_PAYMENT_CONFIG);if(!n)throw new p(d.INVALID_RECIPIENT);if(!e.asset)throw new p(d.INVALID_ASSET);if(s==null||s<=0)throw new p(d.INVALID_AMOUNT)},async handlePayWithExchange(t){try{r.currentPayment={type:"exchange",exchangeId:t};const{network:e,asset:n}=r.paymentAsset,s={network:e,asset:n,amount:r.amount,recipient:r.recipient},a=await this.getPayUrl(t,s);if(!a)throw new p(d.UNABLE_TO_INITIATE_PAYMENT);return r.currentPayment.sessionId=a.sessionId,r.currentPayment.status="IN_PROGRESS",r.currentPayment.exchangeId=t,this.initiatePayment(),{url:a.url,openInNewTab:r.openInNewTab}}catch(e){return e instanceof p?r.error=e.message:r.error=L.GENERIC_PAYMENT_ERROR,r.isPaymentInProgress=!1,R.showError(r.error),null}},async getBuyStatus(t,e){try{const n=await Ge({sessionId:e,exchangeId:t});return(n.status==="SUCCESS"||n.status==="FAILED")&&W.sendEvent({type:"track",event:n.status==="SUCCESS"?"PAY_SUCCESS":"PAY_ERROR",properties:{message:n.status==="FAILED"?O.parseError(r.error):void 0,source:"pay",paymentId:r.paymentId||Z,configuration:{network:r.paymentAsset.network,asset:r.paymentAsset.asset,recipient:r.recipient,amount:r.amount},currentPayment:{type:"exchange",exchangeId:r.currentPayment?.exchangeId,sessionId:r.currentPayment?.sessionId,result:n.txHash}}}),n}catch{throw new p(d.UNABLE_TO_GET_BUY_STATUS)}},async fetchTokensFromEOA({caipAddress:t,caipNetwork:e,namespace:n}){if(!t)return[];const{address:s}=w.parseCaipAddress(t);let a=e;return n===I.CHAIN.EVM&&(a=void 0),await ke.getMyTokensWithBalance({address:s,caipNetwork:a})},async fetchTokensFromExchange(){if(!r.selectedExchange)return[];const t=await He(r.selectedExchange.id),e=Object.values(t.assets).flat();return await Promise.all(e.map(async s=>{const a=et(s),{chainNamespace:i}=w.parseCaipNetworkId(a.chainId);let o=a.address;if(O.isCaipAddress(o)){const{address:x}=w.parseCaipAddress(o);o=x}const u=await P.getImageByToken(o??"",i).catch(()=>{});return a.iconUrl=u??"",a}))},async fetchTokens({caipAddress:t,caipNetwork:e,namespace:n}){try{r.isFetchingTokenBalances=!0;const i=await(!!r.selectedExchange?this.fetchTokensFromExchange():this.fetchTokensFromEOA({caipAddress:t,caipNetwork:e,namespace:n}));r.tokenBalances={...r.tokenBalances,[n]:i}}catch(s){const a=s instanceof Error?s.message:"Unable to get token balances";R.showError(a)}finally{r.isFetchingTokenBalances=!1}},async fetchQuote({amount:t,address:e,sourceToken:n,toToken:s,recipient:a}){try{c.resetQuoteState(),r.isFetchingQuote=!0;const i=await Ve({amount:t,address:r.selectedExchange?void 0:e,sourceToken:n,toToken:s,recipient:a});if(r.selectedExchange){const o=ee(i);if(o){const u=`${n.network}:${o.deposit.receiver}`,x=A.formatNumber(o.deposit.amount,{decimals:n.metadata.decimals??0,round:8});await c.generateExchangeUrlForQuote({exchangeId:r.selectedExchange.id,paymentAsset:n,amount:x.toString(),recipient:u})}}r.quote=i}catch(i){let o=L.UNABLE_TO_GET_QUOTE;if(i instanceof Error&&i.cause&&i.cause instanceof Response)try{const u=await i.cause.json();u.error&&typeof u.error=="string"&&(o=u.error)}catch{}throw r.quoteError=o,R.showError(o),new p(d.UNABLE_TO_GET_QUOTE)}finally{r.isFetchingQuote=!1}},async fetchQuoteStatus({requestId:t}){try{if(t===te){const n=r.selectedExchange,s=r.exchangeSessionId;if(n&&s){switch((await this.getBuyStatus(n.id,s)).status){case"IN_PROGRESS":r.quoteStatus="waiting";break;case"SUCCESS":r.quoteStatus="success",r.isPaymentInProgress=!1;break;case"FAILED":r.quoteStatus="failure",r.isPaymentInProgress=!1;break;case"UNKNOWN":r.quoteStatus="waiting";break;default:r.quoteStatus="waiting";break}return}r.quoteStatus="success";return}const{status:e}=await Ye({requestId:t});r.quoteStatus=e}catch{throw r.quoteStatus="failure",new p(d.UNABLE_TO_GET_QUOTE_STATUS)}},initiatePayment(){r.isPaymentInProgress=!0,r.paymentId=crypto.randomUUID()},initializeAnalytics(){r.analyticsSet||(r.analyticsSet=!0,this.subscribeKey("isPaymentInProgress",t=>{if(r.currentPayment?.status&&r.currentPayment.status!=="UNKNOWN"){const e={IN_PROGRESS:"PAY_INITIATED",SUCCESS:"PAY_SUCCESS",FAILED:"PAY_ERROR"}[r.currentPayment.status];W.sendEvent({type:"track",event:e,properties:{message:r.currentPayment.status==="FAILED"?O.parseError(r.error):void 0,source:"pay",paymentId:r.paymentId||Z,configuration:{network:r.paymentAsset.network,asset:r.paymentAsset.asset,recipient:r.recipient,amount:r.amount},currentPayment:{type:r.currentPayment.type,exchangeId:r.currentPayment.exchangeId,sessionId:r.currentPayment.sessionId,result:r.currentPayment.result}}})}}))},async prepareTokenLogo(){if(!r.paymentAsset.metadata.logoURI)try{const{chainNamespace:t}=w.parseCaipNetworkId(r.paymentAsset.network),e=await P.getImageByToken(r.paymentAsset.asset,t);r.paymentAsset.metadata.logoURI=e}catch{}}},it=U`
  wui-separator {
    margin: var(--apkt-spacing-3) calc(var(--apkt-spacing-3) * -1) var(--apkt-spacing-2)
      calc(var(--apkt-spacing-3) * -1);
    width: calc(100% + var(--apkt-spacing-3) * 2);
  }

  .token-display {
    padding: var(--apkt-spacing-3) var(--apkt-spacing-3);
    border-radius: var(--apkt-borderRadius-5);
    background-color: var(--apkt-tokens-theme-backgroundPrimary);
    margin-top: var(--apkt-spacing-3);
    margin-bottom: var(--apkt-spacing-3);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--apkt-spacing-2);
  }

  .left-image-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:t})=>t.round};
    width: 40px;
    height: 40px;
  }

  .chain-image {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:t})=>t.round};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  .payment-methods-container {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:t})=>t[8]};
    border-top-left-radius: ${({borderRadius:t})=>t[8]};
  }
`;var F=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};let k=class extends _{constructor(){super(),this.unsubscribe=[],this.amount=c.state.amount,this.namespace=void 0,this.paymentAsset=c.state.paymentAsset,this.activeConnectorIds=S.state.activeConnectorIds,this.caipAddress=void 0,this.exchanges=c.state.exchanges,this.isLoading=c.state.isLoading,this.initializeNamespace(),this.unsubscribe.push(c.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(S.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(c.subscribeKey("exchanges",e=>this.exchanges=e)),this.unsubscribe.push(c.subscribeKey("isLoading",e=>this.isLoading=e)),c.fetchExchanges(),c.setSelectedExchange(void 0)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-flex flexDirection="column">
        ${this.paymentDetailsTemplate()} ${this.paymentMethodsTemplate()}
      </wui-flex>
    `}paymentMethodsTemplate(){return l`
      <wui-flex flexDirection="column" padding="3" gap="2" class="payment-methods-container">
        ${this.payWithWalletTemplate()} ${this.templateSeparator()}
        ${this.templateExchangeOptions()}
      </wui-flex>
    `}initializeNamespace(){const e=m.state.activeChain;this.namespace=e,this.caipAddress=m.getAccountData(e)?.caipAddress,this.unsubscribe.push(m.subscribeChainProp("accountState",n=>{this.caipAddress=n?.caipAddress},e))}paymentDetailsTemplate(){const n=m.getAllRequestedCaipNetworks().find(s=>s.caipNetworkId===this.paymentAsset.network);return l`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        .padding=${["6","8","6","8"]}
        gap="2"
      >
        <wui-flex alignItems="center" gap="1">
          <wui-text variant="h1-regular" color="primary">
            ${Q(this.amount||"0")}
          </wui-text>

          <wui-flex flexDirection="column">
            <wui-text variant="h6-regular" color="secondary">
              ${this.paymentAsset.metadata.symbol||"Unknown"}
            </wui-text>
            <wui-text variant="md-medium" color="secondary"
              >on ${n?.name||"Unknown"}</wui-text
            >
          </wui-flex>
        </wui-flex>

        <wui-flex class="left-image-container">
          <wui-image
            src=${g(this.paymentAsset.metadata.logoURI)}
            class="token-image"
          ></wui-image>
          <wui-image
            src=${g(P.getNetworkImage(n))}
            class="chain-image"
          ></wui-image>
        </wui-flex>
      </wui-flex>
    `}payWithWalletTemplate(){return Je(this.paymentAsset.network)?this.caipAddress?this.connectedWalletTemplate():this.disconnectedWalletTemplate():l``}connectedWalletTemplate(){const{name:e,image:n}=this.getWalletProperties({namespace:this.namespace});return l`
      <wui-flex flexDirection="column" gap="3">
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${this.onWalletPayment}
          .boxed=${!1}
          ?chevron=${!0}
          ?fullSize=${!1}
          ?rounded=${!0}
          data-testid="wallet-payment-option"
          imageSrc=${g(n)}
          imageSize="3xl"
        >
          <wui-text variant="lg-regular" color="primary">Pay with ${e}</wui-text>
        </wui-list-item>

        <wui-list-item
          type="secondary"
          icon="power"
          iconColor="error"
          @click=${this.onDisconnect}
          data-testid="disconnect-button"
          ?chevron=${!1}
          boxColor="foregroundSecondary"
        >
          <wui-text variant="lg-regular" color="secondary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>
    `}disconnectedWalletTemplate(){return l`<wui-list-item
      type="secondary"
      boxColor="foregroundSecondary"
      variant="icon"
      iconColor="default"
      iconVariant="overlay"
      icon="wallet"
      @click=${this.onWalletPayment}
      ?chevron=${!0}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="lg-regular" color="primary">Pay with wallet</wui-text>
    </wui-list-item>`}templateExchangeOptions(){if(this.isLoading)return l`<wui-flex justifyContent="center" alignItems="center">
        <wui-loading-spinner size="md"></wui-loading-spinner>
      </wui-flex>`;const e=this.exchanges.filter(n=>tt(this.paymentAsset)?n.id===de:n.id!==de);return e.length===0?l`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="md-medium" color="primary">No exchanges available</wui-text>
      </wui-flex>`:e.map(n=>l`
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${()=>this.onExchangePayment(n)}
          data-testid="exchange-option-${n.id}"
          ?chevron=${!0}
          imageSrc=${g(n.imageUrl)}
        >
          <wui-text flexGrow="1" variant="lg-regular" color="primary">
            Pay with ${n.name}
          </wui-text>
        </wui-list-item>
      `)}templateSeparator(){return l`<wui-separator text="or" bgColor="secondary"></wui-separator>`}async onWalletPayment(){if(!this.namespace)throw new Error("Namespace not found");this.caipAddress?M.push("PayQuote"):(await S.connect(),await z.open({view:"PayQuote"}))}onExchangePayment(e){c.setSelectedExchange(e),M.push("PayQuote")}async onDisconnect(){try{await T.disconnect(),await z.open({view:"Pay"})}catch{console.error("Failed to disconnect"),R.showError("Failed to disconnect")}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const n=this.activeConnectorIds[e];if(!n)return{name:void 0,image:void 0};const s=S.getConnector({id:n,namespace:e});if(!s)return{name:void 0,image:void 0};const a=P.getConnectorImage(s);return{name:s.name,image:a}}};k.styles=it;F([h()],k.prototype,"amount",void 0);F([h()],k.prototype,"namespace",void 0);F([h()],k.prototype,"paymentAsset",void 0);F([h()],k.prototype,"activeConnectorIds",void 0);F([h()],k.prototype,"caipAddress",void 0);F([h()],k.prototype,"exchanges",void 0);F([h()],k.prototype,"isLoading",void 0);k=F([C("w3m-pay-view")],k);const at=U`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-container {
    position: relative;
    width: var(--pulse-size);
    height: var(--pulse-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--pulse-color);
    opacity: 0;
    animation: pulse var(--pulse-duration, 2s) ease-out infinite;
  }

  .pulse-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.5);
      opacity: var(--pulse-opacity, 0.3);
    }
    50% {
      opacity: calc(var(--pulse-opacity, 0.3) * 0.5);
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;var j=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};const rt=3,ot=2,ct=.3,ut="200px",lt={"accent-primary":Re.tokens.core.backgroundAccentPrimary};let q=class extends _{constructor(){super(...arguments),this.rings=rt,this.duration=ot,this.opacity=ct,this.size=ut,this.variant="accent-primary"}render(){const e=lt[this.variant];this.style.cssText=`
      --pulse-size: ${this.size};
      --pulse-duration: ${this.duration}s;
      --pulse-color: ${e};
      --pulse-opacity: ${this.opacity};
    `;const n=Array.from({length:this.rings},(s,a)=>this.renderRing(a,this.rings));return l`
      <div class="pulse-container">
        <div class="pulse-rings">${n}</div>
        <div class="pulse-content">
          <slot></slot>
        </div>
      </div>
    `}renderRing(e,n){const a=`animation-delay: ${e/n*this.duration}s;`;return l`<div class="pulse-ring" style=${a}></div>`}};q.styles=[ye,at];j([b({type:Number})],q.prototype,"rings",void 0);j([b({type:Number})],q.prototype,"duration",void 0);j([b({type:Number})],q.prototype,"opacity",void 0);j([b()],q.prototype,"size",void 0);j([b()],q.prototype,"variant",void 0);q=j([C("wui-pulse")],q);const fe=[{id:"received",title:"Receiving funds",icon:"dollar"},{id:"processing",title:"Swapping asset",icon:"recycleHorizontal"},{id:"sending",title:"Sending asset to the recipient address",icon:"send"}],we=["success","submitted","failure","timeout","refund"],dt=U`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-image {
    border-radius: ${({borderRadius:t})=>t.round};
  }

  .token-badge-container {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: ${({borderRadius:t})=>t[4]};
    z-index: 3;
    min-width: 105px;
  }

  .token-badge-container.loading {
    background-color: ${({tokens:t})=>t.theme.backgroundPrimary};
    border: 3px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  .token-badge-container.success {
    background-color: ${({tokens:t})=>t.theme.backgroundPrimary};
    border: 3px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  .token-image-container {
    position: relative;
  }

  .token-image {
    border-radius: ${({borderRadius:t})=>t.round};
    width: 64px;
    height: 64px;
  }

  .token-image.success {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .token-image.error {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .token-image.loading {
    background: ${({colors:t})=>t.accent010};
  }

  .token-image wui-icon {
    width: 32px;
    height: 32px;
  }

  .token-badge {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border: 1px solid ${({tokens:t})=>t.theme.foregroundSecondary};
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  .token-badge wui-text {
    white-space: nowrap;
  }

  .payment-lifecycle-container {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:t})=>t[6]};
    border-top-left-radius: ${({borderRadius:t})=>t[6]};
  }

  .payment-step-badge {
    padding: ${({spacing:t})=>t[1]} ${({spacing:t})=>t[2]};
    border-radius: ${({borderRadius:t})=>t[1]};
  }

  .payment-step-badge.loading {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  .payment-step-badge.error {
    background-color: ${({tokens:t})=>t.core.backgroundError};
  }

  .payment-step-badge.success {
    background-color: ${({tokens:t})=>t.core.backgroundSuccess};
  }

  .step-icon-container {
    position: relative;
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:t})=>t.round};
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  .step-icon-box {
    position: absolute;
    right: -4px;
    bottom: -1px;
    padding: 2px;
    border-radius: ${({borderRadius:t})=>t.round};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .step-icon-box.success {
    background-color: ${({tokens:t})=>t.core.backgroundSuccess};
  }
`;var $=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};const pt={received:["pending","success","submitted"],processing:["success","submitted"],sending:["success","submitted"]},ht=3e3;let E=class extends _{constructor(){super(),this.unsubscribe=[],this.pollingInterval=null,this.paymentAsset=c.state.paymentAsset,this.quoteStatus=c.state.quoteStatus,this.quote=c.state.quote,this.amount=c.state.amount,this.namespace=void 0,this.caipAddress=void 0,this.profileName=null,this.activeConnectorIds=S.state.activeConnectorIds,this.selectedExchange=c.state.selectedExchange,this.initializeNamespace(),this.unsubscribe.push(c.subscribeKey("quoteStatus",e=>this.quoteStatus=e),c.subscribeKey("quote",e=>this.quote=e),S.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e),c.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}connectedCallback(){super.connectedCallback(),this.startPolling()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.unsubscribe.forEach(e=>e())}render(){return l`
      <wui-flex flexDirection="column" .padding=${["3","0","0","0"]} gap="2">
        ${this.tokenTemplate()} ${this.paymentTemplate()} ${this.paymentLifecycleTemplate()}
      </wui-flex>
    `}tokenTemplate(){const e=Q(this.amount||"0"),n=this.paymentAsset.metadata.symbol??"Unknown",a=m.getAllRequestedCaipNetworks().find(u=>u.caipNetworkId===this.paymentAsset.network),i=this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund";return this.quoteStatus==="success"||this.quoteStatus==="submitted"?l`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image success">
          <wui-icon name="checkmark" color="success" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:i?l`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image error">
          <wui-icon name="close" color="error" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:l`
      <wui-flex alignItems="center" justifyContent="center">
        <wui-flex class="token-image-container">
          <wui-pulse size="125px" rings="3" duration="4" opacity="0.5" variant="accent-primary">
            <wui-flex justifyContent="center" alignItems="center" class="token-image loading">
              <wui-icon name="paperPlaneTitle" color="accent-primary" size="inherit"></wui-icon>
            </wui-flex>
          </wui-pulse>

          <wui-flex
            justifyContent="center"
            alignItems="center"
            class="token-badge-container loading"
          >
            <wui-flex
              alignItems="center"
              justifyContent="center"
              gap="01"
              padding="1"
              class="token-badge"
            >
              <wui-image
                src=${g(P.getNetworkImage(a))}
                class="chain-image"
                size="mdl"
              ></wui-image>

              <wui-text variant="lg-regular" color="primary">${e} ${n}</wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}paymentTemplate(){return l`
      <wui-flex flexDirection="column" gap="2" .padding=${["0","6","0","6"]}>
        ${this.renderPayment()}
        <wui-separator></wui-separator>
        ${this.renderWallet()}
      </wui-flex>
    `}paymentLifecycleTemplate(){const e=this.getStepsWithStatus();return l`
      <wui-flex flexDirection="column" padding="4" gap="2" class="payment-lifecycle-container">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">PAYMENT CYCLE</wui-text>

          ${this.renderPaymentCycleBadge()}
        </wui-flex>

        <wui-flex flexDirection="column" gap="5" .padding=${["2","0","2","0"]}>
          ${e.map(n=>this.renderStep(n))}
        </wui-flex>
      </wui-flex>
    `}renderPaymentCycleBadge(){const e=this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund",n=this.quoteStatus==="success"||this.quoteStatus==="submitted";if(e)return l`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge error"
          gap="1"
        >
          <wui-icon name="close" color="error" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="error">Failed</wui-text>
        </wui-flex>
      `;if(n)return l`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge success"
          gap="1"
        >
          <wui-icon name="checkmark" color="success" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="success">Completed</wui-text>
        </wui-flex>
      `;const s=this.quote?.timeInSeconds??0;return l`
      <wui-flex alignItems="center" justifyContent="space-between" gap="3">
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge loading"
          gap="1"
        >
          <wui-icon name="clock" color="default" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="primary">Est. ${s} sec</wui-text>
        </wui-flex>

        <wui-icon name="chevronBottom" color="default" size="xxs"></wui-icon>
      </wui-flex>
    `}renderPayment(){const n=m.getAllRequestedCaipNetworks().find(o=>{const u=this.quote?.origin.currency.network;if(!u)return!1;const{chainId:x}=w.parseCaipNetworkId(u);return N.isLowerCaseMatch(o.id.toString(),x.toString())}),s=A.formatNumber(this.quote?.origin.amount||"0",{decimals:this.quote?.origin.currency.metadata.decimals??0}).toString(),a=Q(s),i=this.quote?.origin.currency.metadata.symbol??"Unknown";return l`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Payment Method</wui-text>

        <wui-flex flexDirection="column" alignItems="flex-end" gap="1">
          <wui-flex alignItems="center" gap="01">
            <wui-text variant="lg-regular" color="primary">${a}</wui-text>
            <wui-text variant="lg-regular" color="secondary">${i}</wui-text>
          </wui-flex>

          <wui-flex alignItems="center" gap="1">
            <wui-text variant="md-regular" color="secondary">on</wui-text>
            <wui-image
              src=${g(P.getNetworkImage(n))}
              size="xs"
            ></wui-image>
            <wui-text variant="md-regular" color="secondary">${n?.name}</wui-text>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}renderWallet(){return l`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary"
          >${this.selectedExchange?"Exchange":"Wallet"}</wui-text
        >

        ${this.renderWalletText()}
      </wui-flex>
    `}renderWalletText(){const{image:e}=this.getWalletProperties({namespace:this.namespace}),{address:n}=this.caipAddress?w.parseCaipAddress(this.caipAddress):{},s=this.selectedExchange?.name;return this.selectedExchange?l`
        <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
          <wui-text variant="lg-regular" color="primary">${s}</wui-text>
          <wui-image src=${g(this.selectedExchange.imageUrl)} size="mdl"></wui-image>
        </wui-flex>
      `:l`
      <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
        <wui-text variant="lg-regular" color="primary">
          ${Ue.getTruncateString({string:this.profileName||n||s||"",charsStart:this.profileName?16:4,charsEnd:this.profileName?0:6,truncate:this.profileName?"end":"middle"})}
        </wui-text>

        <wui-image src=${g(e)} size="mdl"></wui-image>
      </wui-flex>
    `}getStepsWithStatus(){return this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund"?fe.map(n=>({...n,status:"failed"})):fe.map(n=>{const a=(pt[n.id]??[]).includes(this.quoteStatus)?"completed":"pending";return{...n,status:a}})}renderStep({title:e,icon:n,status:s}){return l`
      <wui-flex alignItems="center" gap="3">
        <wui-flex justifyContent="center" alignItems="center" class="step-icon-container">
          <wui-icon name=${n} color="default" size="mdl"></wui-icon>

          <wui-flex alignItems="center" justifyContent="center" class=${xe({"step-icon-box":!0,success:s==="completed"})}>
            ${this.renderStatusIndicator(s)}
          </wui-flex>
        </wui-flex>

        <wui-text variant="md-regular" color="primary">${e}</wui-text>
      </wui-flex>
    `}renderStatusIndicator(e){return e==="completed"?l`<wui-icon size="sm" color="success" name="checkmark"></wui-icon>`:e==="failed"?l`<wui-icon size="sm" color="error" name="close"></wui-icon>`:e==="pending"?l`<wui-loading-spinner color="accent-primary" size="sm"></wui-loading-spinner>`:null}startPolling(){this.pollingInterval||(this.fetchQuoteStatus(),this.pollingInterval=setInterval(()=>{this.fetchQuoteStatus()},ht))}stopPolling(){this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null)}async fetchQuoteStatus(){const e=c.state.requestId;if(!e||we.includes(this.quoteStatus))this.stopPolling();else try{await c.fetchQuoteStatus({requestId:e}),we.includes(this.quoteStatus)&&this.stopPolling()}catch{this.stopPolling()}}initializeNamespace(){const e=m.state.activeChain;this.namespace=e,this.caipAddress=m.getAccountData(e)?.caipAddress,this.profileName=m.getAccountData(e)?.profileName??null,this.unsubscribe.push(m.subscribeChainProp("accountState",n=>{this.caipAddress=n?.caipAddress,this.profileName=n?.profileName??null},e))}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const n=this.activeConnectorIds[e];if(!n)return{name:void 0,image:void 0};const s=S.getConnector({id:n,namespace:e});if(!s)return{name:void 0,image:void 0};const a=P.getConnectorImage(s);return{name:s.name,image:a}}};E.styles=dt;$([h()],E.prototype,"paymentAsset",void 0);$([h()],E.prototype,"quoteStatus",void 0);$([h()],E.prototype,"quote",void 0);$([h()],E.prototype,"amount",void 0);$([h()],E.prototype,"namespace",void 0);$([h()],E.prototype,"caipAddress",void 0);$([h()],E.prototype,"profileName",void 0);$([h()],E.prototype,"activeConnectorIds",void 0);$([h()],E.prototype,"selectedExchange",void 0);E=$([C("w3m-pay-loading-view")],E);const mt=Oe`
  :host {
    display: block;
  }
`;var gt=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};let ne=class extends _{render(){return l`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-shimmer width="60px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Network Fee</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-shimmer
              width="75px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>

            <wui-flex alignItems="center" gap="01">
              <wui-shimmer width="14px" height="14px" rounded variant="light"></wui-shimmer>
              <wui-shimmer
                width="49px"
                height="14px"
                borderRadius="4xs"
                variant="light"
              ></wui-shimmer>
            </wui-flex>
          </wui-flex>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Service Fee</wui-text>
          <wui-shimmer width="75px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>
      </wui-flex>
    `}};ne.styles=[mt];ne=gt([C("w3m-pay-fees-skeleton")],ne);const ft=U`
  :host {
    display: block;
  }

  wui-image {
    border-radius: ${({borderRadius:t})=>t.round};
  }
`;var be=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};let V=class extends _{constructor(){super(),this.unsubscribe=[],this.quote=c.state.quote,this.unsubscribe.push(c.subscribeKey("quote",e=>this.quote=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=A.formatNumber(this.quote?.origin.amount||"0",{decimals:this.quote?.origin.currency.metadata.decimals??0,round:6}).toString();return l`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-text variant="md-regular" color="primary">
            ${e} ${this.quote?.origin.currency.metadata.symbol||"Unknown"}
          </wui-text>
        </wui-flex>

        ${this.quote&&this.quote.fees.length>0?this.quote.fees.map(n=>this.renderFee(n)):null}
      </wui-flex>
    `}renderFee(e){const n=e.id==="network",s=A.formatNumber(e.amount||"0",{decimals:e.currency.metadata.decimals??0,round:6}).toString();if(n){const i=m.getAllRequestedCaipNetworks().find(o=>N.isLowerCaseMatch(o.caipNetworkId,e.currency.network));return l`
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-text variant="md-regular" color="primary">
              ${s} ${e.currency.metadata.symbol||"Unknown"}
            </wui-text>

            <wui-flex alignItems="center" gap="01">
              <wui-image
                src=${g(P.getNetworkImage(i))}
                size="xs"
              ></wui-image>
              <wui-text variant="sm-regular" color="secondary">
                ${i?.name||"Unknown"}
              </wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      `}return l`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>
        <wui-text variant="md-regular" color="primary">
          ${s} ${e.currency.metadata.symbol||"Unknown"}
        </wui-text>
      </wui-flex>
    `}};V.styles=[ft];be([h()],V.prototype,"quote",void 0);V=be([C("w3m-pay-fees")],V);const wt=U`
  :host {
    display: block;
    width: 100%;
  }

  .disabled-container {
    padding: ${({spacing:t})=>t[2]};
    min-height: 168px;
  }

  wui-icon {
    width: ${({spacing:t})=>t[8]};
    height: ${({spacing:t})=>t[8]};
  }

  wui-flex > wui-text {
    max-width: 273px;
  }
`;var Ae=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};let Y=class extends _{constructor(){super(),this.unsubscribe=[],this.selectedExchange=c.state.selectedExchange,this.unsubscribe.push(c.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=!!this.selectedExchange;return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
        class="disabled-container"
      >
        <wui-icon name="coins" color="default" size="inherit"></wui-icon>

        <wui-text variant="md-regular" color="primary" align="center">
          You don't have enough funds to complete this transaction
        </wui-text>

        ${e?null:l`<wui-button
              size="md"
              variant="neutral-secondary"
              @click=${this.dispatchConnectOtherWalletEvent.bind(this)}
              >Connect other wallet</wui-button
            >`}
      </wui-flex>
    `}dispatchConnectOtherWalletEvent(){this.dispatchEvent(new CustomEvent("connectOtherWallet",{detail:!0,bubbles:!0,composed:!0}))}};Y.styles=[wt];Ae([b({type:Array})],Y.prototype,"selectedExchange",void 0);Y=Ae([C("w3m-pay-options-empty")],Y);const yt=U`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    border-radius: ${({borderRadius:t})=>t[4]};
    padding: ${({spacing:t})=>t[3]};
    min-height: 60px;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .chain-image {
    position: absolute;
    bottom: -3px;
    right: -5px;
    border: 2px solid ${({tokens:t})=>t.theme.foregroundSecondary};
  }
`;var xt=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};let se=class extends _{render(){return l`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.renderOptionEntry()} ${this.renderOptionEntry()} ${this.renderOptionEntry()}
      </wui-flex>
    `}renderOptionEntry(){return l`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-shimmer
              width="32px"
              height="32px"
              rounded
              variant="light"
              class="token-image"
            ></wui-shimmer>
            <wui-shimmer
              width="16px"
              height="16px"
              rounded
              variant="light"
              class="chain-image"
            ></wui-shimmer>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-shimmer
              width="74px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
            <wui-shimmer
              width="46px"
              height="14px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}};se.styles=[yt];se=xt([C("w3m-pay-options-skeleton")],se);const bt=U`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    mask-image: var(--options-mask-image);
    -webkit-mask-image: var(--options-mask-image);
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    cursor: pointer;
    border-radius: ${({borderRadius:t})=>t[4]};
    padding: ${({spacing:t})=>t[3]};
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-1"]};
    will-change: background-color;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:t})=>t.round};
    width: 32px;
    height: 32px;
  }

  .chain-image {
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:t})=>t.round};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  @media (hover: hover) and (pointer: fine) {
    .pay-option-container:hover {
      background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    }
  }
`;var H=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};const At=300;let B=class extends _{constructor(){super(),this.unsubscribe=[],this.options=[],this.selectedPaymentAsset=null}disconnectedCallback(){this.unsubscribe.forEach(n=>n()),this.resizeObserver?.disconnect(),this.shadowRoot?.querySelector(".pay-options-container")?.removeEventListener("scroll",this.handleOptionsListScroll.bind(this))}firstUpdated(){const e=this.shadowRoot?.querySelector(".pay-options-container");e&&(requestAnimationFrame(this.handleOptionsListScroll.bind(this)),e?.addEventListener("scroll",this.handleOptionsListScroll.bind(this)),this.resizeObserver=new ResizeObserver(()=>{this.handleOptionsListScroll()}),this.resizeObserver?.observe(e),this.handleOptionsListScroll())}render(){return l`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.options.map(e=>this.payOptionTemplate(e))}
      </wui-flex>
    `}payOptionTemplate(e){const{network:n,metadata:s,asset:a,amount:i="0"}=e,u=m.getAllRequestedCaipNetworks().find(Ne=>Ne.caipNetworkId===n),x=`${n}:${a}`,K=`${this.selectedPaymentAsset?.network}:${this.selectedPaymentAsset?.asset}`,Ee=x===K,ce=A.bigNumber(i,{safe:!0}),Ie=ce.gt(0);return l`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        @click=${()=>this.onSelect?.(e)}
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-image
              src=${g(s.logoURI)}
              class="token-image"
              size="3xl"
            ></wui-image>
            <wui-image
              src=${g(P.getNetworkImage(u))}
              class="chain-image"
              size="md"
            ></wui-image>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="lg-regular" color="primary">${s.symbol}</wui-text>
            ${Ie?l`<wui-text variant="sm-regular" color="secondary">
                  ${ce.round(6).toString()} ${s.symbol}
                </wui-text>`:null}
          </wui-flex>
        </wui-flex>

        ${Ee?l`<wui-icon name="checkmark" size="md" color="success"></wui-icon>`:null}
      </wui-flex>
    `}handleOptionsListScroll(){const e=this.shadowRoot?.querySelector(".pay-options-container");if(!e)return;e.scrollHeight>At?(e.style.setProperty("--options-mask-image",`linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--options-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--options-scroll--top-opacity))) 1px,
          black 50px,
          black calc(100% - 50px),
          rgba(155, 155, 155, calc(1 - var(--options-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--options-scroll--bottom-opacity))) 100%
        )`),e.style.setProperty("--options-scroll--top-opacity",le.interpolate([0,50],[0,1],e.scrollTop).toString()),e.style.setProperty("--options-scroll--bottom-opacity",le.interpolate([0,50],[0,1],e.scrollHeight-e.scrollTop-e.offsetHeight).toString())):(e.style.setProperty("--options-mask-image","none"),e.style.setProperty("--options-scroll--top-opacity","0"),e.style.setProperty("--options-scroll--bottom-opacity","0"))}};B.styles=[bt];H([b({type:Array})],B.prototype,"options",void 0);H([b()],B.prototype,"selectedPaymentAsset",void 0);H([b()],B.prototype,"onSelect",void 0);B=H([C("w3m-pay-options")],B);const Et=U`
  .payment-methods-container {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:t})=>t[5]};
    border-top-left-radius: ${({borderRadius:t})=>t[5]};
  }

  .pay-options-container {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    border-radius: ${({borderRadius:t})=>t[5]};
    padding: ${({spacing:t})=>t[1]};
  }

  w3m-tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: fit-content;
  }

  wui-image {
    border-radius: ${({borderRadius:t})=>t.round};
  }

  w3m-pay-options.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
`;var y=function(t,e,n,s){var a=arguments.length,i=a<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,n):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(t,e,n,s);else for(var u=t.length-1;u>=0;u--)(o=t[u])&&(i=(a<3?o(i):a>3?o(e,n,i):o(e,n))||i);return a>3&&i&&Object.defineProperty(e,n,i),i};const G={eip155:"ethereum",solana:"solana",bip122:"bitcoin",ton:"ton"},It={eip155:{icon:G.eip155,label:"EVM"},solana:{icon:G.solana,label:"Solana"},bip122:{icon:G.bip122,label:"Bitcoin"},ton:{icon:G.ton,label:"Ton"}};let f=class extends _{constructor(){super(),this.unsubscribe=[],this.profileName=null,this.paymentAsset=c.state.paymentAsset,this.namespace=void 0,this.caipAddress=void 0,this.amount=c.state.amount,this.recipient=c.state.recipient,this.activeConnectorIds=S.state.activeConnectorIds,this.selectedPaymentAsset=c.state.selectedPaymentAsset,this.selectedExchange=c.state.selectedExchange,this.isFetchingQuote=c.state.isFetchingQuote,this.quoteError=c.state.quoteError,this.quote=c.state.quote,this.isFetchingTokenBalances=c.state.isFetchingTokenBalances,this.tokenBalances=c.state.tokenBalances,this.isPaymentInProgress=c.state.isPaymentInProgress,this.exchangeUrlForQuote=c.state.exchangeUrlForQuote,this.completedTransactionsCount=0,this.unsubscribe.push(c.subscribeKey("paymentAsset",e=>this.paymentAsset=e)),this.unsubscribe.push(c.subscribeKey("tokenBalances",e=>this.onTokenBalancesChanged(e))),this.unsubscribe.push(c.subscribeKey("isFetchingTokenBalances",e=>this.isFetchingTokenBalances=e)),this.unsubscribe.push(S.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(c.subscribeKey("selectedPaymentAsset",e=>this.selectedPaymentAsset=e)),this.unsubscribe.push(c.subscribeKey("isFetchingQuote",e=>this.isFetchingQuote=e)),this.unsubscribe.push(c.subscribeKey("quoteError",e=>this.quoteError=e)),this.unsubscribe.push(c.subscribeKey("quote",e=>this.quote=e)),this.unsubscribe.push(c.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(c.subscribeKey("recipient",e=>this.recipient=e)),this.unsubscribe.push(c.subscribeKey("isPaymentInProgress",e=>this.isPaymentInProgress=e)),this.unsubscribe.push(c.subscribeKey("selectedExchange",e=>this.selectedExchange=e)),this.unsubscribe.push(c.subscribeKey("exchangeUrlForQuote",e=>this.exchangeUrlForQuote=e)),this.resetQuoteState(),this.initializeNamespace(),this.fetchTokens()}disconnectedCallback(){super.disconnectedCallback(),this.resetAssetsState(),this.unsubscribe.forEach(e=>e())}updated(e){super.updated(e),e.has("selectedPaymentAsset")&&this.fetchQuote()}render(){return l`
      <wui-flex flexDirection="column">
        ${this.profileTemplate()}

        <wui-flex
          flexDirection="column"
          gap="4"
          class="payment-methods-container"
          .padding=${["4","4","5","4"]}
        >
          ${this.paymentOptionsViewTemplate()} ${this.amountWithFeeTemplate()}

          <wui-flex
            alignItems="center"
            justifyContent="space-between"
            .padding=${["1","0","1","0"]}
          >
            <wui-separator></wui-separator>
          </wui-flex>

          ${this.paymentActionsTemplate()}
        </wui-flex>
      </wui-flex>
    `}profileTemplate(){if(this.selectedExchange){const o=A.formatNumber(this.quote?.origin.amount,{decimals:this.quote?.origin.currency.metadata.decimals??0}).toString();return l`
        <wui-flex
          .padding=${["4","3","4","3"]}
          alignItems="center"
          justifyContent="space-between"
          gap="2"
        >
          <wui-text variant="lg-regular" color="secondary">Paying with</wui-text>

          ${this.quote?l`<wui-text variant="lg-regular" color="primary">
                ${A.bigNumber(o,{safe:!0}).round(6).toString()}
                ${this.quote.origin.currency.metadata.symbol}
              </wui-text>`:l`<wui-shimmer width="80px" height="18px" variant="light"></wui-shimmer>`}
        </wui-flex>
      `}const e=O.getPlainAddress(this.caipAddress)??"",{name:n,image:s}=this.getWalletProperties({namespace:this.namespace}),{icon:a,label:i}=It[this.namespace]??{};return l`
      <wui-flex
        .padding=${["4","3","4","3"]}
        alignItems="center"
        justifyContent="space-between"
        gap="2"
      >
        <wui-wallet-switch
          profileName=${g(this.profileName)}
          address=${g(e)}
          imageSrc=${g(s)}
          alt=${g(n)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        <wui-wallet-switch
          profileName=${g(i)}
          address=${g(e)}
          icon=${g(a)}
          iconSize="xs"
          .enableGreenCircle=${!1}
          alt=${g(i)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
      </wui-flex>
    `}initializeNamespace(){const e=m.state.activeChain;this.namespace=e,this.caipAddress=m.getAccountData(e)?.caipAddress,this.profileName=m.getAccountData(e)?.profileName??null,this.unsubscribe.push(m.subscribeChainProp("accountState",n=>this.onAccountStateChanged(n),e))}async fetchTokens(){if(this.namespace){let e;if(this.caipAddress){const{chainId:n,chainNamespace:s}=w.parseCaipAddress(this.caipAddress),a=`${s}:${n}`;e=m.getAllRequestedCaipNetworks().find(o=>o.caipNetworkId===a)}await c.fetchTokens({caipAddress:this.caipAddress,caipNetwork:e,namespace:this.namespace})}}fetchQuote(){if(this.amount&&this.recipient&&this.selectedPaymentAsset&&this.paymentAsset){const{address:e}=this.caipAddress?w.parseCaipAddress(this.caipAddress):{};c.fetchQuote({amount:this.amount.toString(),address:e,sourceToken:this.selectedPaymentAsset,toToken:this.paymentAsset,recipient:this.recipient})}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const n=this.activeConnectorIds[e];if(!n)return{name:void 0,image:void 0};const s=S.getConnector({id:n,namespace:e});if(!s)return{name:void 0,image:void 0};const a=P.getConnectorImage(s);return{name:s.name,image:a}}paymentOptionsViewTemplate(){return l`
      <wui-flex flexDirection="column" gap="2">
        <wui-text variant="sm-regular" color="secondary">CHOOSE PAYMENT OPTION</wui-text>
        <wui-flex class="pay-options-container">${this.paymentOptionsTemplate()}</wui-flex>
      </wui-flex>
    `}paymentOptionsTemplate(){const e=this.getPaymentAssetFromTokenBalances();if(this.isFetchingTokenBalances)return l`<w3m-pay-options-skeleton></w3m-pay-options-skeleton>`;if(e.length===0)return l`<w3m-pay-options-empty
        @connectOtherWallet=${this.onConnectOtherWallet.bind(this)}
      ></w3m-pay-options-empty>`;const n={disabled:this.isFetchingQuote};return l`<w3m-pay-options
      class=${xe(n)}
      .options=${e}
      .selectedPaymentAsset=${g(this.selectedPaymentAsset)}
      .onSelect=${this.onSelectedPaymentAssetChanged.bind(this)}
    ></w3m-pay-options>`}amountWithFeeTemplate(){return this.isFetchingQuote||!this.selectedPaymentAsset||this.quoteError?l`<w3m-pay-fees-skeleton></w3m-pay-fees-skeleton>`:l`<w3m-pay-fees></w3m-pay-fees>`}paymentActionsTemplate(){const e=this.isFetchingQuote||this.isFetchingTokenBalances,n=this.isFetchingQuote||this.isFetchingTokenBalances||!this.selectedPaymentAsset||!!this.quoteError,s=A.formatNumber(this.quote?.origin.amount??0,{decimals:this.quote?.origin.currency.metadata.decimals??0}).toString();return this.selectedExchange?e||n?l`
          <wui-shimmer width="100%" height="48px" variant="light" ?rounded=${!0}></wui-shimmer>
        `:l`<wui-button
        size="lg"
        fullWidth
        variant="accent-secondary"
        @click=${this.onPayWithExchange.bind(this)}
      >
        ${`Continue in ${this.selectedExchange.name}`}

        <wui-icon name="arrowRight" color="inherit" size="sm" slot="iconRight"></wui-icon>
      </wui-button>`:l`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="md-regular" color="secondary">Order Total</wui-text>

          ${e||n?l`<wui-shimmer width="58px" height="32px" variant="light"></wui-shimmer>`:l`<wui-flex alignItems="center" gap="01">
                <wui-text variant="h4-regular" color="primary">${Q(s)}</wui-text>

                <wui-text variant="lg-regular" color="secondary">
                  ${this.quote?.origin.currency.metadata.symbol||"Unknown"}
                </wui-text>
              </wui-flex>`}
        </wui-flex>

        ${this.actionButtonTemplate({isLoading:e,isDisabled:n})}
      </wui-flex>
    `}actionButtonTemplate(e){const n=X(this.quote),{isLoading:s,isDisabled:a}=e;let i="Pay";return n.length>1&&this.completedTransactionsCount===0&&(i="Approve"),l`
      <wui-button
        size="lg"
        variant="accent-primary"
        ?loading=${s||this.isPaymentInProgress}
        ?disabled=${a||this.isPaymentInProgress}
        @click=${()=>{n.length>0?this.onSendTransactions():this.onTransfer()}}
      >
        ${i}
        ${s?null:l`<wui-icon
              name="arrowRight"
              color="inherit"
              size="sm"
              slot="iconRight"
            ></wui-icon>`}
      </wui-button>
    `}getPaymentAssetFromTokenBalances(){return this.namespace?(this.tokenBalances[this.namespace]??[]).map(a=>{try{return Ze(a)}catch{return null}}).filter(a=>!!a).filter(a=>{const{chainId:i}=w.parseCaipNetworkId(a.network),{chainId:o}=w.parseCaipNetworkId(this.paymentAsset.network);return N.isLowerCaseMatch(a.asset,this.paymentAsset.asset)?!0:this.selectedExchange?!N.isLowerCaseMatch(i.toString(),o.toString()):!0}):[]}onTokenBalancesChanged(e){this.tokenBalances=e;const[n]=this.getPaymentAssetFromTokenBalances();n&&c.setSelectedPaymentAsset(n)}async onConnectOtherWallet(){await S.connect(),await z.open({view:"PayQuote"})}onAccountStateChanged(e){const{address:n}=this.caipAddress?w.parseCaipAddress(this.caipAddress):{};if(this.caipAddress=e?.caipAddress,this.profileName=e?.profileName??null,n){const{address:s}=this.caipAddress?w.parseCaipAddress(this.caipAddress):{};s?N.isLowerCaseMatch(s,n)||(this.resetAssetsState(),this.resetQuoteState(),this.fetchTokens()):z.close()}}onSelectedPaymentAssetChanged(e){this.isFetchingQuote||c.setSelectedPaymentAsset(e)}async onTransfer(){const e=ee(this.quote);if(e){if(!N.isLowerCaseMatch(this.selectedPaymentAsset?.asset,e.deposit.currency))throw new Error("Quote asset is not the same as the selected payment asset");const s=this.selectedPaymentAsset?.amount??"0",a=A.formatNumber(e.deposit.amount,{decimals:this.selectedPaymentAsset?.metadata.decimals??0}).toString();if(!A.bigNumber(s).gte(a)){R.showError("Insufficient funds");return}if(this.quote&&this.selectedPaymentAsset&&this.caipAddress&&this.namespace){const{address:o}=w.parseCaipAddress(this.caipAddress);await c.onTransfer({chainNamespace:this.namespace,fromAddress:o,toAddress:e.deposit.receiver,amount:a,paymentAsset:this.selectedPaymentAsset}),c.setRequestId(e.requestId),M.push("PayLoading")}}}async onSendTransactions(){const e=this.selectedPaymentAsset?.amount??"0",n=A.formatNumber(this.quote?.origin.amount??0,{decimals:this.selectedPaymentAsset?.metadata.decimals??0}).toString();if(!A.bigNumber(e).gte(n)){R.showError("Insufficient funds");return}const a=X(this.quote),[i]=X(this.quote,this.completedTransactionsCount);i&&this.namespace&&(await c.onSendTransaction({namespace:this.namespace,transactionStep:i}),this.completedTransactionsCount+=1,this.completedTransactionsCount===a.length&&(c.setRequestId(i.requestId),M.push("PayLoading")))}onPayWithExchange(){if(this.exchangeUrlForQuote){const e=O.returnOpenHref("","popupWindow","scrollbar=yes,width=480,height=720");if(!e)throw new Error("Could not create popup window");e.location.href=this.exchangeUrlForQuote;const n=ee(this.quote);n&&c.setRequestId(n.requestId),c.initiatePayment(),M.push("PayLoading")}}resetAssetsState(){c.setSelectedPaymentAsset(null)}resetQuoteState(){c.resetQuoteState()}};f.styles=Et;y([h()],f.prototype,"profileName",void 0);y([h()],f.prototype,"paymentAsset",void 0);y([h()],f.prototype,"namespace",void 0);y([h()],f.prototype,"caipAddress",void 0);y([h()],f.prototype,"amount",void 0);y([h()],f.prototype,"recipient",void 0);y([h()],f.prototype,"activeConnectorIds",void 0);y([h()],f.prototype,"selectedPaymentAsset",void 0);y([h()],f.prototype,"selectedExchange",void 0);y([h()],f.prototype,"isFetchingQuote",void 0);y([h()],f.prototype,"quoteError",void 0);y([h()],f.prototype,"quote",void 0);y([h()],f.prototype,"isFetchingTokenBalances",void 0);y([h()],f.prototype,"tokenBalances",void 0);y([h()],f.prototype,"isPaymentInProgress",void 0);y([h()],f.prototype,"exchangeUrlForQuote",void 0);y([h()],f.prototype,"completedTransactionsCount",void 0);f=y([C("w3m-pay-quote-view")],f);export{p as A,c as P,E as W,d as a,f as b,k as c};
