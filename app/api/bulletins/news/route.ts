import {bulletinService} from '../../../../lib/bulletin-feeds';

export async function GET(){
  return Response.json(await bulletinService.news(),{headers:{'Cache-Control':'public, max-age=30, s-maxage=60','X-Content-Type-Options':'nosniff'}});
}
