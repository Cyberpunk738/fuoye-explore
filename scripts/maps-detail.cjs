process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const {chromium}=require('playwright'),fs=require('node:fs/promises');
(async()=>{
 const address=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;const p=address?new URL(address):undefined; const browser=await chromium.launch({channel:'chrome',headless:true,proxy:p?{server:p.origin,...(p.username?{username:decodeURIComponent(p.username),password:decodeURIComponent(p.password)}:{})}:undefined,args:['--disable-webgl']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:'tmp/maps/session.json'});const page=await context.newPage();page.setDefaultTimeout(12000);
 try{
  for(const [slug,url] of process.argv.slice(2).map(query=>[query.toLowerCase().replace(/[^a-z0-9]+/g,'-'),'https://www.google.com/maps/search/'+encodeURIComponent(query)+'/?hl=en'])){
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(12000);
   await fs.writeFile('tmp/maps/'+slug+'.html',await page.content());
   if(slug!=='satellite-campus') {const button=page.getByRole('button',{name:'See photos',exact:true});if(await button.count())await button.click().catch(()=>{});await page.waitForTimeout(5000);}
   const data=await page.evaluate(()=>({url:location.href,text:document.body.innerText,images:[...document.images].map(e=>({alt:e.alt,url:e.currentSrc||e.src})),buttons:[...document.querySelectorAll('button')].map(e=>({text:e.innerText,label:e.getAttribute('aria-label')}))}));
   await fs.writeFile('tmp/maps/'+slug+'-detail.json',JSON.stringify(data,null,2));await page.screenshot({path:'tmp/maps/'+slug+'-detail.png'});console.log(slug,JSON.stringify({url:data.url,text:data.text}).slice(0,2000));
  }
 }finally{await browser.close();}
})();
