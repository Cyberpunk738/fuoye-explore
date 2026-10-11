process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const mode=process.argv[2]||'inspect';
(async()=>{
 const proxyAddress=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;const proxyUrl=proxyAddress?new URL(proxyAddress):undefined;const proxy=proxyUrl?{server:proxyUrl.origin,...(proxyUrl.username?{username:decodeURIComponent(proxyUrl.username),password:decodeURIComponent(proxyUrl.password)}:{})}:undefined;
 const browser=await chromium.launch({channel:'chrome',headless:true,proxy,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-NG',storageState:'tmp/maps/session.json'});
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>console.log('PAGE ERROR',e.message));page.on('requestfailed',r=>{const u=new URL(r.url());console.log('REQUEST FAILED',u.hostname+u.pathname,r.failure()?.errorText);});
 const save=async(name)=>{
  const data=await page.evaluate(()=>({url:location.href,title:document.title,text:document.body.innerText,buttons:[...document.querySelectorAll('button,[role=button]')].map(e=>({text:e.innerText,label:e.getAttribute('aria-label'),role:e.getAttribute('role')})),links:[...document.querySelectorAll('a[href]')].map(e=>({text:e.innerText,label:e.getAttribute('aria-label'),href:e.href})),images:[...document.images].map(e=>({alt:e.alt,url:e.currentSrc||e.src}))}));
  await fs.writeFile(`tmp/maps/${name}.json`,JSON.stringify(data,null,2));await page.screenshot({path:`tmp/maps/${name}.png`,timeout:30000});console.log(JSON.stringify(data,null,2).slice(0,18000));
 };
 try{
  const initial=JSON.parse(await fs.readFile('tmp/maps/initial.json','utf8'));
  const url=process.argv[3]||initial.url;console.log('Opening',url);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  console.log('Loaded',page.url());
  const reject=page.getByRole('button',{name:'Reject all',exact:true});if(await reject.count()){await reject.click();}
  await page.waitForTimeout(10000);
  if(mode==='layers'){await page.getByRole('button',{name:/Layers/}).click();await page.waitForTimeout(1500);}
  if(mode==='photos'){await page.getByRole('button',{name:'See photos',exact:true}).click();await page.waitForTimeout(3000);}
  await save(mode);await context.storageState({path:'tmp/maps/session.json'});
 }catch(e){console.error(e.message);await save('failure').catch(()=>{});process.exitCode=1;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
