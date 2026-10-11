const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],base=process.env.BASE_URL||'http://127.0.0.1:5173/';
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('.loading').waitFor({state:'detached',timeout:60000});
  await page.getByRole('button',{name:'Faculty of Science',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.fps')?.dataset.idle==='true');
  await page.mouse.move(1080,590);await page.waitForTimeout(150);
  const target=await page.locator('.walk-hud').evaluate(e=>({x:Number(e.dataset.targetX),z:Number(e.dataset.targetZ)}));assert.ok(Number.isFinite(target.x+target.z));
  await page.getByRole('button',{name:'Walk',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.fps')?.dataset.idle==='true');
  const spawn=await page.locator('.walk-hud').evaluate(e=>({...e.dataset}));
  assert.ok(Math.hypot(Number(spawn.requestedX)-target.x,Number(spawn.requestedZ)-target.z)<.01,'Walk lost hovered point');
  assert.equal(spawn.spawnAdjusted,'false','Test point should be open ground');assert.ok(Math.hypot(Number(spawn.x)-target.x,Number(spawn.z)-target.z)<.01,'Walk teleported away');
  await page.screenshot({path:'output/walk-from-here.png'});await page.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(base);await mobile.locator('.loading').waitFor({state:'detached',timeout:60000});await mobile.waitForFunction(()=>document.querySelector('.fps')?.dataset.idle==='true');
  await mobile.touchscreen.tap(315,580);
  const tap=await mobile.locator('.walk-hud').evaluate(e=>({x:Number(e.dataset.targetX),z:Number(e.dataset.targetZ)}));assert.ok(Number.isFinite(tap.x+tap.z),'Tap did not select ground');
  await mobile.getByRole('button',{name:'Walk',exact:true}).tap();await mobile.waitForFunction(()=>document.querySelector('.fps')?.dataset.idle==='true');
  const touchSpawn=await mobile.locator('.walk-hud').evaluate(e=>({...e.dataset}));assert.ok(Math.hypot(Number(touchSpawn.requestedX)-tap.x,Number(touchSpawn.requestedZ)-tap.z)<.01,'Walk lost tapped point');
  assert.equal(touchSpawn.spawnAdjusted,'false','Mobile test point should be open ground');assert.ok(Math.hypot(Number(touchSpawn.x)-tap.x,Number(touchSpawn.z)-tap.z)<.01,'Touch walk teleported away');
  await mobile.screenshot({path:'output/touch-walk-from-here.png'});assert.deepEqual(errors,[]);
  await fs.writeFile('output/walk-start-checks.json',JSON.stringify({target,spawn,tap,touchSpawn,errors},null,2));console.log('Desktop hover and mobile tap start walking at the exact selected ground');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
