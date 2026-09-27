import {redirect} from 'next/navigation';

export default async function PlayPage({searchParams}:{searchParams:Promise<{room?:string}>}){
 const {room}=await searchParams;
 redirect(room?`/?room=${encodeURIComponent(room)}#friends`:'/?friends=1#friends');
}
