"""UI smoke tests. Default: real Chrome/Edge + file URL; no storage mocks.
--fallback permits set_content on locked-down local runners, with explicit skips.
"""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('html',nargs='?',default=str(Path(__file__).resolve().parents[1]/'Simgapore2.html'));ap.add_argument('--channels',default='chromium');ap.add_argument('--fallback',action='store_true');ap.add_argument('--out',default=str(Path(__file__).resolve().parents[1]/'reports'));args=ap.parse_args()
html=Path(args.html).resolve();out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 for channel in args.channels.split(','):
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True) if channel=='chromium' else p.chromium.launch(channel=channel,headless=True)
  context=browser.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));checks=[];skips=[];mode='file'
  def check(name,condition=True):
   if not condition:raise AssertionError(name)
   checks.append(name)
  try:page.goto(html.as_uri(),timeout=15000)
  except Exception as e:
   if not args.fallback:raise
   mode='set_content';skips.append('file URL navigation blocked: '+str(e).split('\n')[0]);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html.read_text())
  check('Japanese title loaded','Simgapore 2.0' in page.title())
  check('intro visible',page.locator('#intro').evaluate('(e)=>e.open'))
  for _ in range(3):page.locator('#introNext').click()
  check('starts in 1965',page.locator('#year').inner_text()=='1965年末')
  check('same-year GDP ratio visible','100.0％' in page.locator('#hero').inner_text())
  check('no difficulty selector','ゆとりモード' not in page.locator('body').inner_text())
  page.locator('#region-north').press('Enter');check('keyboard district selection','北部' in page.locator('#selectedDistrict').inner_text())
  page.locator('#priority-selected-north').select_option('3');check('priority changes',page.evaluate('Simgapore2.snapshot().districts[4].priority')==3)
  page.locator('#policy-capital').select_option('2');check('policy changes',page.evaluate('Simgapore2.snapshot().policy.capital')==2)
  page.locator('#guideBtn').click();page.locator('#applyGuide').click();check('guide maps ordinary policy',page.evaluate('Simgapore2.snapshot().policy.education')==4)
  before=page.evaluate('Simgapore2.saveText()');page.locator('#forecastBtn').click();check('forecast does not advance',before==page.evaluate('Simgapore2.saveText()'))
  page.locator('#nextBtn').click();check('annual settlement',page.locator('#year').inner_text()=='1966年末')
  if mode=='file':
   page.evaluate("localStorage.setItem('simgapore-v01','legacy-sentinel');localStorage.setItem('simgapore-view-v1','view-sentinel')")
   before=page.evaluate('Simgapore2.saveText()');page.reload();check('real localStorage reload restores state',before==page.evaluate('Simgapore2.saveText()'))
   check('legacy save keys unchanged',page.evaluate("localStorage.getItem('simgapore-v01')==='legacy-sentinel'&&localStorage.getItem('simgapore-view-v1')==='view-sentinel'"))
  else:skips.append('real file-origin localStorage persistence and reload not tested; no mocks were used')
  before=page.evaluate('Simgapore2.saveText()')
  with page.expect_download() as event:page.locator('#saveBtn').click()
  save=out/(channel+'-save.json');event.value.save_as(str(save))
  check('actual JSON download',save.read_text()==before)
  page.locator('#nextBtn').click();page.locator('#importFile').set_input_files(str(save));page.wait_for_function("document.querySelector('#year').textContent==='1966年末'")
  check('JSON import state equality',before==page.evaluate('Simgapore2.saveText()'))
  page.locator('#importFile').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':b'{"version":1,"year":1980}'});page.wait_for_function("document.querySelector('#toast').textContent.includes('読み込めません')")
  check('legacy import leaves current state intact',before==page.evaluate('Simgapore2.saveText()'))
  bad=json.loads(before);bad['state']['lastElection']={'year':'<img src=x onerror=alert(1)>','votes':80,'seatShare':.9}
  page.locator('#importFile').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps(bad).encode()});page.wait_for_timeout(80)
  check('invalid election payload rejected',before==page.evaluate('Simgapore2.saveText()'))
  for tab in ['district','finance','record','help','policy']:
   page.locator('[data-tab="'+tab+'"]').click();check('tab '+tab, bool(page.locator('#content').inner_text().strip()))
  page.locator('#toast').evaluate('(e)=>e.textContent=""');page.screenshot(path=str(out/(channel+'-desktop.png')),full_page=True)
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});check('no overflow '+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   if width==390:page.screenshot(path=str(out/(channel+'-mobile.png')),full_page=True)
  page.locator('[data-tab="finance"]').click();old_debt=page.evaluate('Simgapore2.metrics().grossDebt');page.locator('#borrow5').click();check('bond UI raises cash and debt',page.evaluate('Simgapore2.metrics().grossDebt')>old_debt)
  page.locator('#repay').click();check('repayment UI',page.evaluate('Simgapore2.metrics().grossDebt')<=old_debt+1e-7)
  # Re-import clean saved state before playing the entire reference campaign through the UI.
  page.locator('#importFile').set_input_files(str(save));page.wait_for_timeout(100)
  while page.evaluate('Simgapore2.snapshot().status')=='playing':
   page.locator('#guideBtn').click();page.locator('#applyGuide').click();page.locator('#nextBtn').click()
  check('full campaign reaches 2025',page.evaluate('Simgapore2.snapshot().year')==2025)
  check('full campaign wins',page.evaluate('Simgapore2.snapshot().status')=='won')
  check('year button disabled after final verdict',page.locator('#nextBtn').is_disabled())
  page.locator('[data-tab="record"]').click();page.locator('#toast').evaluate('(e)=>e.textContent=""');page.screenshot(path=str(out/(channel+'-final.png')),full_page=True)
  check('61 annual records',page.evaluate('Simgapore2.snapshot().history.length')==61)
  page.locator('#newBtn').click();page.locator('#cancelNew').click();check('cancel restart preserves final campaign',page.evaluate('Simgapore2.snapshot().year')==2025)
  check('zero JavaScript errors',not errors)
  result={'browser':channel,'version':browser.version,'mode':mode,'checks':len(checks),'passed':checks,'skipped':skips,'errors':errors}
  (out/(channel+'-ui.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps(result,ensure_ascii=False));browser.close()
