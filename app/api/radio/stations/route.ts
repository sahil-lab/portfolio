import {radioDirectory} from '../../../../lib/radio-directory';

export async function GET(request:Request){
 const parameters=new URL(request.url).searchParams,search=parameters.get('q')??'';
 const headers={'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'};
 if([...parameters.keys()].some(key=>key!=='q')||search.length>80||/\p{Cc}/u.test(search))return Response.json({error:'Use a country, region, or station name.'},{status:400,headers:{...headers,'Cache-Control':'no-store'}});
 try{return Response.json(await radioDirectory.stations(search),{headers})}
 catch{return Response.json({error:'The station directory is unavailable. Try again later.'},{status:503,headers:{...headers,'Cache-Control':'no-store'}})}
}
