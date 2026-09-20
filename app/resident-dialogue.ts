export type DialogueTheme='home'|'copper'|'garden'|'prism';
const shared=[
  'I took the scenic route today.',
  'There is always another bridge to cross.',
  'My pockets are full of interesting stones.',
  'The bakery opens before the first train.',
  'A good walk clears the cache.',
  'I am saving this view for later.',
  'The market has a new tune today.',
  'Have you visited the other hemisphere?',
  'I brought enough snacks for two.',
  'The long way home is my favourite.',
  'The next train can wait. Look around.',
  'I think that cloud looks like a kettle.',
  'Every road has a story.',
  'Tea tastes better after a little exploring.',
  'I found a quiet bench by the water.',
  'Small steps still go around the world.',
  'The bridge lights are lovely at night.',
  'I promised to bring home a postcard.',
  'Someone planted flowers along this road.',
  'My map has more doodles than directions.',
];
const local:Record<DialogueTheme,readonly string[]>={
  home:['The sky follows our weather screen.','Pixel has a new story every visit.','The kettle cafe smells wonderful.','This motherboard needs a picnic club.','I am heading to the radio shop.','Clear skies make the copper shine.','That shoe shop is hard to miss.','The commons has room to breathe.'],
  copper:['Copper ridges glow at sunset.','The river keeps this valley cool.','I deliver bread to the ridge village.','The canyon road winds all the way home.','Our roofs catch the morning light.','I collect copper-coloured pebbles.','The bridge is the best place to stop.','The desert market has fresh tea.'],
  garden:['The rivers feed our orchard towns.','We planted another hillside garden.','The mountains smell of cedar.','I am walking to the riverside market.','The forest road is quiet today.','Our village shares its harvest.','I found a new waterfall viewpoint.','The gardens keep growing around us.'],
  prism:['The river mirrors the crystal peaks.','Our windows sparkle before sunrise.','The ridge tram is almost here.','I polish the lamps in the plaza.','Blue stones mark the mountain road.','Every valley catches a different colour.','The crystal market is worth the walk.','Our town has the brightest night lights.'],
};

export function createDialogueDeck(theme:DialogueTheme='home',random:()=>number=Math.random,extra:readonly string[]=[]){
  const lines=[...new Set([...shared,...local[theme],...extra])];let remaining:string[]=[],previous='';
  return {get size(){return lines.length},next(){
    if(!remaining.length){
      remaining=[...lines];
      for(let index=remaining.length-1;index>0;index--){const choice=Math.min(index,Math.max(0,Math.floor(random()*(index+1))));[remaining[index],remaining[choice]]=[remaining[choice],remaining[index]]}
      if(remaining[remaining.length-1]===previous)[remaining[0],remaining[remaining.length-1]]=[remaining[remaining.length-1],remaining[0]];
    }
    previous=remaining.pop()!;return previous;
  }};
}
