const fs=require('node:fs');
const path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();await page.goto('http://localhost:3000/assets/brands/github.svg');
    const outlines=await page.evaluate(async()=>{
      const {SVGLoader}=await import('/node_modules/three/examples/jsm/loaders/SVGLoader.js');
      const result={};
      for(const brand of ['github','linkedin']){
        const response=await fetch(`/assets/brands/${brand}.svg`);if(!response.ok)throw Error(`Missing ${brand} source`);
        const source=await response.text(),svg=new SVGLoader().parse(source);
        result[brand]=svg.paths.flatMap(outline=>SVGLoader.createShapes(outline)).map(shape=>({
          outline:shape.getPoints(20).map(point=>[Number(point.x.toFixed(5)),Number(point.y.toFixed(5))]),
          holes:shape.holes.map(hole=>hole.getPoints(20).map(point=>[Number(point.x.toFixed(5)),Number(point.y.toFixed(5))])),
        }));
      }
      return result;
    });
    fs.writeFileSync(path.resolve('app/civilization-logo-outlines.json'),JSON.stringify(outlines)+'\n');
    console.log(Object.fromEntries(Object.entries(outlines).map(([brand,shapes])=>[brand,{shapes:shapes.length,points:shapes.reduce((count,shape)=>count+shape.outline.length,0)}])));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
