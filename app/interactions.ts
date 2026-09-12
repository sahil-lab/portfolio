/** Ordered interaction handlers consume E once, so overlapping prompts cannot fire twice. */
export type InteractionHandler={id:string;run:()=>boolean};
export function createInteractionDispatcher(handlers:readonly InteractionHandler[],enabled:()=>boolean,before:()=>void,fallback:()=>void){
  return ()=>{
    if(!enabled())return;
    before();
    for(const handler of handlers)if(handler.run())return;
    fallback();
  };
}
