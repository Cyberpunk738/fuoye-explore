const {chromium}=require('playwright');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-webgl','--disable-background-networking']});
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:'en-NG'});
 page.setDefaultTimeout(20000);
 try{
  await page.goto('https://maps.app.goo.gl/yDcJm6EFjyrKhLUY6',{waitUntil:'domcontentloaded',timeout:60000});
  console.log('URL',page.url());console.log((await page.locator('body').innerText()).slice(0,3500));
  const reject=page.getByRole('button',{name:'Reject all',exact:true});
  if(await reject.count()){await reject.click();await page.waitForTimeout(3000);}
  await page.waitForTimeout(4000);
  const info=await page.evaluate(()=>({url:location.href,title:document.title,text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(e=>({text:e.innerText,label:e.getAttribute('aria-label')})),links:[...document.querySelectorAll('a[href]')].map(e=>({text:e.innerText,label:e.getAttribute('aria-label'),href:e.href})),images:[...document.images].map(e=>({alt:e.alt,url:e.currentSrc||e.src}))}));
  await fs.mkdir('tmp/maps',{recursive:true});await fs.writeFile('tmp/maps/initial.json',JSON.stringify(info,null,2));
  await page.context().storageState({path:'tmp/maps/session.json'});
  await page.screenshot({path:'tmp/maps/initial.png',timeout:30000});
  console.log(JSON.stringify(info,null,2).slice(0,14500));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
