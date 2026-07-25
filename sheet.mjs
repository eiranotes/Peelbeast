import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const files = process.argv.slice(2);
const CELL=230, COLS=6;
const comps=[];
for(let i=0;i<files.length;i++){
  const buf=await sharp(files[i]).resize(CELL-16,CELL-16,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  comps.push({input:buf,left:(i%COLS)*CELL+8,top:((i/COLS)|0)*CELL+8});
}
await sharp({create:{width:COLS*CELL,height:Math.ceil(files.length/COLS)*CELL,channels:4,background:{r:120,g:84,b:56,alpha:1}}}).composite(comps).png().toFile('/tmp/sheet.png');
console.log(files.map((f,i)=>`${i}:${path.basename(f,'.png')}`).join('  '));
