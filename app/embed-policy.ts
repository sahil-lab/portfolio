export const portfolioEmbedMessage='living-computer-kingdom:embedded-preview';

export function notifyEmbeddedPortfolio(browser:Pick<Window,'self'|'top'|'parent'>){
  if(browser.self===browser.top)return false;
  try{browser.parent.postMessage({type:portfolioEmbedMessage},'*')}catch{}
  return true;
}
