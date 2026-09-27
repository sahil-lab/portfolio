export const friendColors=['#ef6363','#45cda4','#70a9f5','#f2c94c','#d98fe4'] as const;
export const roomCapacity=5;
export const cars=[
 {id:'comet',name:'Comet GT',color:'#ef6363',speed:38,acceleration:22,handling:12},
 {id:'vector',name:'Vector S',color:'#45cda4',speed:34,acceleration:27,handling:16},
 {id:'ion',name:'Ion Coupe',color:'#f2c94c',speed:42,acceleration:18,handling:9},
] as const;
export type CarId=typeof cars[number]['id'];
export type ScoreGame='race'|'chess'|'sudoku'|'targets'|'pong';
export type PlayView='lobby'|ScoreGame|'ship'|'computer'|'records';
export type Pose={position:[number,number,number];quaternion:[number,number,number,number];planet:number;mode:'courier'|'angel'|'activity';skating:boolean;scale:number};
export type Friend={id:string;name:string;color:string;connected:boolean;ready:boolean;voice:boolean;car:CarId;pose:Pose};
export type Placing={id:string;name:string;color:string;place:number;score:number;timeMs:number|null;draw?:boolean};
export type RecordRow={id:string;name:string;color:string;wins:number;points:number;bestMs:number|null};
export type GameRecord={top:RecordRow[];last:{id:string;endedAt:number;podium:Placing[];reason:string}|null};
export type Racer={id:string;car:CarId;distance:number;lane:number;speed:number;finishMs:number|null;dnf:boolean};
export type Match={
 id:string;kind:ScoreGame;phase:'countdown'|'running'|'finished';startsAt:number;endsAt:number;
 participants:string[];podium:Placing[];reason:string;
 laps?:number;length?:number;racers?:Racer[];
 fen?:string;turn?:'w'|'b';whiteMs?:number;blackMs?:number;lastMove?:string;promotion?:string;
 puzzle?:string;grids?:Record<string,string>;solved?:Record<string,number>;
 scores?:Record<string,number>;target?:{x:number;y:number;radius:number;id:number;at:number};
 ball?:[number,number];paddles?:[number,number];points?:[number,number];
};
export type ShipState={crew:string[];captain:string|null;current:number;destination:number|null;startsAt:number;duration:number};
export type GameSetup={kind:ScoreGame;laps:number;minutes:number};
export type RoomSnapshot={code:string;hostId:string;players:Friend[];setup:GameSetup;match:Match|null;ship:ShipState;records:Record<ScoreGame,GameRecord>;serverTime:number};
export type ClientAction=
 |{type:'configure';setup:GameSetup}
 |{type:'ready';ready:boolean}|{type:'profile';name?:string;color?:string;car?:CarId}
 |{type:'pose';pose:Pose}|{type:'start';kind:ScoreGame;laps?:number;minutes?:number}
 |{type:'reset'}|{type:'race-input';throttle:number;steer:number;brake:boolean}
 |{type:'chess-move';from:string;to:string;promotion?:string}|{type:'resign'}
 |{type:'sudoku-cell';index:number;value:string}|{type:'target-hit';x:number;y:number;targetId?:number;frameAt?:number}
 |{type:'paddle';value:number}|{type:'ship-board'}|{type:'ship-leave'}|{type:'ship-travel';destination:number}
 |{type:'voice';enabled:boolean}|{type:'signal';to:string;signal:unknown};
