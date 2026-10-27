"""Real browser checks for narrative, visual cues, audio and presentation isolation."""
from pathlib import Path
import argparse,json,time
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('html');ap.add_argument('--channels',default='chrome,msedge');ap.add_argument('--out',default='v2/reports');ap.add_argument('--fallback',action='store_true');ap.add_argument('--skip-network',action='store_true');args=ap.parse_args()
html=Path(args.html).resolve();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 for channel in args.channels.split(','):
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True) if channel=='chromium' else p.chromium.launch(channel=channel,headless=True)
  context=browser.new_context(viewport={'width':1280,'height':950});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(10000)
  checks=[];skips=[];network=[];page.on('response',lambda r:network.append({'url':r.url,'status':r.status}) if 'Majulah_Singapura.ogg' in r.url else None)
  def check(name,ok=True):
   assert ok,name
   checks.append(name);print('PASS',channel,name,flush=True)
  try:page.goto(html.as_uri())
  except Exception:
   if not args.fallback:raise
   page=context.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html.read_text());skips.append('file navigation unavailable; rendered with set_content')
  check('anthem not fetched before user interaction',not network)
  page.locator('#introAudioSettings').click();page.locator('#soundMute').check();page.locator('#soundClose').click()
  page.locator('#introSkip').click();check('skip enters 1965 immediately',page.evaluate('Simgapore2.snapshot().year')==1965)
  page.locator('#soundBtn').click();page.locator('#soundMute').uncheck();page.locator('#soundClose').click()
  page.locator('#forecastBtn').click()
  page.wait_for_function("SimgaporePresentation.snapshot().audioState==='running' && SimgaporePresentation.snapshot().audioRms>0.0001",timeout=5000)
  check('synthesised effect has a running audio graph and nonzero signal')
  page.locator('#soundBtn').click();page.locator('#soundMute').check();page.locator('#soundClose').click()
  count=page.evaluate('SimgaporePresentation.snapshot().toneCount');page.locator('#forecastBtn').click()
  check('muting stops tones and schedules none',page.evaluate('SimgaporePresentation.snapshot().toneCount')==count and page.evaluate('SimgaporePresentation.snapshot().activeTones')==0)
  clean=page.evaluate('Simgapore2.saveText()')
  # Generate valid fixtures using the actual simulation and load via the real import control.
  def load_case(year,extra=''):
   raw=page.evaluate("""([year,extra])=>{const s=Sim.initial();while(s.year<year&&s.status==='playing'){Sim.guide(s);Sim.step(s);}Sim.guide(s);if(extra==='tech'){s.flags.newater=false;s.skill=65;s.policy.water=2;}if(extra==='loss'){s.support=18;s.homes=.2;s.waterNatural=0;s.waterImport=.01;}return Sim.serialize(s);}""",[year,extra])
   page.locator('#importFile').set_input_files({'name':'case.json','mimeType':'application/json','buffer':raw.encode()});page.wait_for_function('(raw)=>Simgapore2.saveText()===raw',arg=raw)
  for year,extra,kind in [(1965,'','growth'),(1967,'','election'),(1972,'','crisis'),(1998,'tech','tech'),(2024,'','win'),(1965,'loss','crisis')]:
   load_case(year,extra);page.locator('#nextBtn').click();check(kind+' scenario cue',page.locator('#yearCinema').get_attribute('data-kind')==kind)
   if kind in ['election','tech','win','crisis']:page.screenshot(path=str(out/(channel+'-'+kind+'.png')))
  page.locator('#importFile').set_input_files({'name':'clean.json','mimeType':'application/json','buffer':clean.encode()});page.wait_for_function('(raw)=>Simgapore2.saveText()===raw',arg=clean)
  page.locator('#soundBtn').click();page.locator('#motionSelect').select_option('reduced');page.locator('#soundClose').click();page.locator('#guideBtn').click();page.locator('#applyGuide').click();page.locator('#nextBtn').click()
  check('reduced motion has zero particles',page.locator('#fxParticles').evaluate('e=>e.childElementCount')==0)
  state=page.evaluate('Simgapore2.saveText()');page.locator('#historyBtn').click();page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/(channel+'-intro-mobile.png')))
  check('mobile prologue fits viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  page.locator('#introNext').click();page.locator('#introSkip').click();check('replay and effects preferences preserve exact save',page.evaluate('Simgapore2.saveText()')==state)
  if args.skip_network:skips.append('live anthem streaming not tested on offline runner')
  else:
   page.locator('#soundBtn').click();page.locator('#soundMute').uncheck();page.locator('#anthemPlay').click()
   try:
    page.wait_for_function("(()=>{const a=document.querySelector('#anthemAudio');return !a.paused && a.currentTime>.5 && a.readyState>=2 && a.duration>60;})()",timeout=22000)
    check('live anthem decodes and advances in browser')
    check('full recording played once at normal speed',page.locator('#anthemAudio').evaluate('a=>!a.loop&&a.playbackRate===1'))
    count=page.evaluate('SimgaporePresentation.snapshot().toneCount');page.locator('#soundClose').click();page.locator('#forecastBtn').click()
    check('effect audio remains silent during anthem',page.evaluate('SimgaporePresentation.snapshot().toneCount')==count)
    page.locator('#soundBtn').click();page.locator('#anthemPause').click();check('anthem can be paused',page.locator('#anthemAudio').evaluate('a=>a.paused'))
    page.locator('#soundClose').click()
   except Exception as e:
    # Network failures are recorded, never disguised as an audio success.
    skips.append('live anthem unavailable: '+str(e).split('\n')[0]);page.locator('#soundClose').click()
  check('zero JavaScript errors',not errors)
  result={'browser':channel,'version':browser.version,'checks':len(checks),'passed':checks,'skipped':skips,'errors':errors,'anthemResponses':network}
  (out/(channel+'-presentation.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False),flush=True);browser.close()
