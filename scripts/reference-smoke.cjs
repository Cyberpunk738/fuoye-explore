
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking']});
 const page=await browser.newPage({viewport:{width:800,height:450},reducedMotion:'reduce'});
 await page.addInitScript(()=>{window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),250);});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('https://mount-alison-3d.vercel.app/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:'Drive',exact:true}).waitFor({timeout:60000});
  await page.locator('.loading').waitFor({state:'detached',timeout:90000});
  console.log('Reference ready');
  await page.getByRole('button',{name:'Drive',exact:true}).click({force:true});
  const menu=await page.locator('.hud:not([hidden])').innerText();console.log(menu);
  await page.getByRole('button',{name:'Free drive',exact:true}).click({force:true});
  await page.keyboard.down('w');await page.waitForTimeout(750);await page.keyboard.up('w');
  const driving=await page.locator('.speed').innerText();console.log('Driving: '+driving);
  await page.keyboard.press('r');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Walk',exact:true}).click({force:true});
  const walking=await page.locator('.hud.walk').innerText();console.log(walking);
  await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');await page.keyboard.press('Space');
  await page.getByRole('button',{name:'Exit walk',exact:true}).click({force:true});
  await page.getByRole('button',{name:'Night',exact:true}).click({force:true});
  await fs.writeFile('research/reference-behavior.json',JSON.stringify({inspectedOn:'2026-10-09',url:page.url(),menu,driving,walking,night:await page.locator('#app').getAttribute('data-night'),errors},null,2));
  console.log('Reference interaction checks complete',errors);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
