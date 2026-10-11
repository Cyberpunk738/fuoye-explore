process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const {chromium}=require('playwright');const fs=require('node:fs/promises');
(async()=>{
 const proxyAddress=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;const p=proxyAddress?new URL(proxyAddress):undefined;const proxy=p?{server:p.origin,...(p.username?{username:decodeURIComponent(p.username),password:decodeURIComponent(p.password)}:{})}:undefined;
 const browser=await chromium.launch({channel:'chrome',headless:true,proxy,args:['--disable-webgl','--disable-background-networking']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-NG',storageState:'tmp/maps/session.json'});const page=await context.newPage();
 try{for(const query of process.argv.slice(2)){
  const slug=query.toLowerCase().replace(/[^a-z0-9]+/g,'-');const url='https://www.google.com/maps/search/'+encodeURIComponent(query)+'/@7.777,5.317,15z?hl=en';
  try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.locator('h1,[role=feed]').first().waitFor({state:'attached',timeout:15000}).catch(()=>{});await page.waitForTimeout(2000);
  const data=await page.evaluate(()=>({url:location.href,title:document.title,text:document.body.innerText,places:[...document.querySelectorAll('a[href*="/maps/place/"]')].map(e=>({name:e.getAttribute('aria-label')||e.innerText,url:e.href})),photos:[...document.images].filter(e=>e.src.includes('googleusercontent')).map(e=>({alt:e.alt,url:e.currentSrc||e.src}))}));
  await fs.writeFile(`tmp/maps/${slug}.json`,JSON.stringify(data,null,2));await page.screenshot({path:`tmp/maps/${slug}.png`,timeout:20000});console.log(JSON.stringify({query,...data}).slice(0,11000));
  }catch(e){console.log('FAILED',query,e.message);}
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
