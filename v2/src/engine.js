/* Simgapore 2.0. Coefficients define the gameplay model. */
const Sim = (() => {
'use strict';
const VERSION=2, KEY='simgapore-v2-save', START=1965, END=2025;
const B=HISTORY[1965]/1e9*3.06, K0=B*2.5;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const copy=x=>JSON.parse(JSON.stringify(x));
const sum=x=>x.reduce((a,b)=>a+b,0);
const DISTRICTS=[
 {id:'jurong',name:'ジュロン',sector:'industry',title:'工業・輸出の入口',desc:'港と結びつく製造業。初期から設備投資の受け皿になるが、水と燃料を多く使う。',w:1.30,e:1.35,k:1.24,year:1965},
 {id:'port',name:'南部港湾',sector:'logistics',title:'世界市場への接続',desc:'港湾と物流を整え、工業地区の製品を世界市場へ届ける。製造業とともに育てると、輸出の基盤が強くなる。',w:.70,e:1.05,k:1.05,year:1965},
 {id:'central',name:'都心',sector:'finance',title:'金融・事業サービス',desc:'高い教育水準と行政への信頼が必要。土地を集約利用するが、住居費の圧力が高まる。',w:.55,e:.80,k:1.35,year:1975},
 {id:'changi',name:'チャンギ',sector:'logistics',title:'空の玄関口',desc:'航空物流・ビジネス交流。1981年以降に強みが増し、サービス業と専門人材をつなぐ。',w:.65,e:1.15,k:1.10,year:1981},
 {id:'north',name:'北部',sector:'housing',title:'住まいと通勤圏',desc:'住宅供給と近隣サービス。ここへの配分を増やすと、人口流入に住宅が追いつきやすい。',w:.65,e:.65,k:.80,year:1965},
 {id:'catchment',name:'中央集水域',sector:'water',title:'貯水・水循環',desc:'自然集水には上限がある。研究が進むと再生水設備への投資拠点になる。',w:.30,e:.80,k:.70,year:1965},
 {id:'science',name:'西部研究地区',sector:'research',title:'研究と高度製造',desc:'教育の蓄積があれば、1980年以降に研究・技術移転が成長を支える。低技能のままでは投資効率が悪い。',w:1.00,e:1.00,k:1.40,year:1980},
 {id:'coast',name:'東海岸',sector:'services',title:'観光・生活サービス',desc:'水と燃料への依存は小さめ。雇用の裾野を広げるが、感染症や国際移動の停滞に弱い。',w:.75,e:.70,k:1.00,year:1965}
];
const POLICY={
 tax:{label:'税収の水準',help:'税収総額がGDPに占める割合。高くすると財源が増え、民間投資には負担がかかる。',min:12,max:26,step:1,unit:'％'},
 investment:{label:'地区への開発投資',help:'GDPの何％を、下で選んだ地区の優先度に配分するか。民間設備投資を呼び込む基盤にもなる。',min:0,max:10,step:.5,unit:'％'},
 housing:{label:'住宅供給予算',help:'住める人数を増やす。住宅が人口に追いつかないと、その年の生産と支持が下がる。',min:0,max:5,step:.5,unit:'％'},
 water:{label:'水の設備予算',help:'貯水・輸入処理設備を増強する。技術解禁後は、再生水と海水淡水化に重点が移る。',min:0,max:4,step:.5,unit:'％'},
 energy:{label:'省エネ・燃料分散予算',help:'輸入燃料の価格上昇に備える。省エネで使用量を抑え、調達先の分散で供給の集中によるリスクを軽減する。',min:0,max:4,step:.5,unit:'％'},
 education:{label:'教育・技術予算',help:'人材を育て、高度産業の実力と海外技術の吸収力を高める。効くまでに時間がかかる。',min:0,max:6,step:.5,unit:'％'},
 family:{label:'子育て・生活支援',help:'出生と生活への信頼を支える。出生数はすぐ変わるが、生まれた子が働くのは18年以上後。',min:0,max:4,step:.5,unit:'％'},
 capital:{label:'外国資本',help:'外国企業の投資を招き、国内の設備と技術を育てる。国内で生まれる付加価値がGDPに加わる。',values:['慎重','選別して誘致','積極誘致']},
 workers:{label:'外国人の働き手',help:'建設・製造・生活サービスの労働力。人手不足を緩める一方、住宅と水の需要が増える。',values:['抑制','段階的に受入','積極受入']},
 talent:{label:'外国人専門人材',help:'技術者・研究者などを招く。教育と産業の受け皿があるほど技術移転が進む。',values:['抑制','選別して受入','積極受入']},
 fx:{label:'対米ドルの為替方針',help:'生産性と信用から決まる基準相場をもとに、通貨を強める方向・安定させる方向・輸出を支える方向を選ぶ。通貨高には輸出への負担と介入費用が伴う。',values:['輸出重視','安定重視','通貨高重視']},
 governance:{label:'意思決定と異論の扱い',help:'権限集中は投資の実行を速める一方、誤判断時の損失と修正の遅れを大きくする。公開検証を重視すると、実行は慎重になり、判断ミスによる損失を抑えやすくなる。',values:['公開検証を重視','行政主導・検証あり','強い権限集中']}
};
const ELECTIONS=[1968,1972,1976,1980,1984,1988,1991,1997,2001,2006,2011,2015,2020,2025];
const EVENTS={
1971:['英国軍撤退',-.025,1,1],1973:['第一次石油危機',-.035,2.1,1],1974:['石油高が続く',-.015,2.0,1],1979:['第二次石油危機',-.02,1.85,1],1980:['燃料価格の高止まり',-.015,1.7,1],1985:['景気後退',-.07,1,.98],1997:['アジア金融危機',-.035,1,1],1998:['アジア金融危機の波及',-.07,1.1,1],2001:['世界的なIT不況',-.055,1.1,1],2003:['感染症による移動制限',-.045,1.15,1],2008:['世界金融危機',-.055,1.7,1],2009:['世界需要の後退',-.055,.9,1],2014:['干ばつ',-.005,1.2,.73],2020:['新型感染症の流行',-.10,.85,1],2022:['エネルギー価格の上昇',-.025,2.0,1]};
function rand(s){let t=s.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);s.rng=s.rng>>>0;return((t^t>>>14)>>>0)/4294967296;}
function residents(s){return sum(s.ages);}
function population(s){return residents(s)+s.foreignWorkers+s.foreignTalent;}
function labour(s){return sum(s.ages.slice(18,65))*.73+s.foreignWorkers+s.foreignTalent*1.7;}
let L0;
function initial(seed=1965){
 const ages=Array.from({length:86},(_,i)=>i<15?.40/15:i<65?.57/50:.03/21).map(v=>v*1.8369);
 const s={version:VERSION,year:START,rng:seed>>>0,seed:seed>>>0,ages,foreignWorkers:.04,foreignTalent:.01,capitalStock:K0,tfp:1,skill:20,price:1,fx:3.06,averageFx:3.06,fundFx:3.06,homes:1.98,waterNatural:.18,waterImport:.16,recycle:0,desal:0,efficiency:0,diversification:.12,trust:70,support:67,poorYears:0,cash:B*.28,reserves:B*.12/3.06,bonds:[],status:'playing',reason:'',badPolicy:0,exportShock:0,energyShock:1,drought:1,births:0,tfr:4.7,lastElection:null,flags:{},
 policy:{tax:18,investment:4,housing:1.5,water:.5,energy:.5,education:2,family:.5,capital:1,workers:1,talent:1,fx:1,governance:1},
 districts:DISTRICTS.map((d,i)=>({id:d.id,priority:[2,2,1,0,1,1,0,1][i],level:1})),history:[],log:[{year:1965,text:'独立から出発。工業と港湾を育て、水・住まい・人材の基盤を整える。'}],last:null};
 if(!L0)L0=labour(s);
 s.history.push(record(s));return s;
}
function districtEffect(s){
 let total=0,quality=0,industry=0,research=0,network=0,house=0,water=0;
 for(let i=0;i<DISTRICTS.length;i++){
  const d=DISTRICTS[i],v=s.districts[i],ready=s.year>=d.year;
  let q=d.k;
  if(d.sector==='finance'||d.sector==='research')q*=clamp((s.skill-15)/45,.18,1.5)*(.55+s.trust/150);
  if(!ready)q*=.32;
  const weight=v.level;
  total+=weight;quality+=weight*q;
  if(d.sector==='industry')industry+=weight;
  if(d.sector==='research'&&ready)research+=weight;
  if(d.sector==='logistics')network+=weight;
  if(d.sector==='housing')house+=v.priority;
  if(d.sector==='water')water+=v.priority;
 }
 return{quality:quality/total,industry:industry/total,research:research/total,network:network/total,house,water};
}
function newaterReady(s){return s.year>=1998&&s.skill>=58;}
function debt(s){return sum(s.bonds.map(x=>x.amount));}
function globalRate(year){return year<1973?.043:year<1982?.075:year<1992?.06:year<2002?.045:year<2008?.035:year<2022?.018:.045;}
function economy(s){
 const p=s.policy,d=districtEffect(s),pop=population(s),l=labour(s);
 // Cobb-Douglas supply, including domestic value added of foreign-owned firms.
 const raw=B*s.tfp*Math.pow(s.capitalStock/K0,.38)*Math.pow(Math.max(.01,l/L0),.62)*Math.exp((s.skill-20)*.0035);
 const industryMult=.75+d.industry*2;
 const waterDemand=pop*.12+raw*.013*industryMult/(1+s.skill/70);
 const renewable=s.waterNatural*s.drought;
 const recycled=Math.min(s.recycle,waterDemand*.55);
 const supply=renewable+s.waterImport+recycled+s.desal;
 const waterRatio=supply/Math.max(waterDemand,.001),housingRatio=s.homes/pop;
 const waterFactor=Math.pow(clamp(waterRatio,.05,1),1.15),housingFactor=Math.pow(clamp(housingRatio,.20,1),.75);
 const costEnergy=clamp(.055*s.energyShock*(s.fx/3.06)/(1+s.efficiency)*(.75+d.industry*1.8)+recycled*.007/Math.max(raw,.1),.005,.35);
 const energyPenalty=clamp(Math.max(0,costEnergy-.055)*1.5,0,.38);
 const overvaluation=Math.max(0,1-s.fx/s.fundFx);
 const tradeFactor=clamp(1+s.exportShock-s.badPolicy-overvaluation*.55,.45,1.15);
 const real=raw*waterFactor*housingFactor*(1-energyPenalty)*tradeFactor;
 const nominal=real*s.price,usd=nominal/s.averageFx;
 const grossDebt=debt(s),netDebt=Math.max(0,grossDebt-s.cash-s.reserves*s.fx);
 const interest=sum(s.bonds.map(x=>x.amount*x.coupon));
 const revenue=nominal*p.tax/100;
 const investmentBudget=s.districts.some(d=>d.priority>0)?p.investment:0;
 const spendingRate=(6+investmentBudget+p.housing+p.water+p.energy+p.education+p.family)/100;
 const spending=nominal*spendingRate+interest;
 const reserveTransfer=nominal*.005;
 const leverage=netDebt/Math.max(nominal,.05);
 const newYield=clamp(globalRate(s.year)+Math.max(0,leverage-.4)*.055+Math.max(0,interest/Math.max(revenue,.01)-.15)*.06+Math.max(0,(spending-revenue)/Math.max(nominal,.01))*.04+Math.max(0,65-s.trust)*.0006,.01,.30);
 const foreignShare=clamp(.10+p.capital*.10+(s.foreignWorkers+s.foreignTalent)/pop*.20,.08,.50);
 return{raw,real,nominal,usd,pop,labour:l,waterDemand,waterSupply:supply,waterRatio,housingRatio,waterFactor,housingFactor,energyPenalty,costEnergy,tradeFactor,netDebt,grossDebt,interest,revenue,spending,balance:revenue-spending-reserveTransfer,reserveTransfer,newYield,foreignShare,recycled,district:d,
 ratioYear:usd/(HISTORY[s.year]/1e9),ratioFinal:usd/(HISTORY[END]/1e9),lossWater:1-waterFactor,lossHousing:1-housingFactor};
}
function record(s){const m=economy(s);return{year:s.year,gdp:m.usd,real:m.real,price:s.price,fx:s.averageFx,support:s.support,pop:m.pop,water:m.waterRatio,housing:m.housingRatio,debt:m.grossDebt,rate:m.newYield};}
function log(s,text){s.log.push({year:s.year,text});s.log=s.log.slice(-125);}
function setPolicy(s,key,value){if(s.status!=='playing')return false;const a=POLICY[key];if(!a||!Number.isFinite(value))return false;if(a.values){if(!Number.isInteger(value)||value<0||value>=a.values.length)return false;}else if(value<a.min||value>a.max||Math.abs(value/a.step-Math.round(value/a.step))>1e-8)return false;s.policy[key]=value;return true;}
function priority(s,id,v){if(s.status!=='playing'||![0,1,2,3].includes(v))return false;const d=s.districts.find(x=>x.id===id);if(!d)return false;d.priority=v;return true;}
function guide(s){
 if(s.status!=='playing')return false;
 const p=s.policy,y=s.year,m=economy(s);
 Object.assign(p,{tax:21,investment:y<1990?6:5,housing:m.housingRatio<1.13?3:.5,water:m.waterRatio<1.22?2:1,energy:y<1972?1:1.5,education:4,family:y<1985?1:2,capital:2,workers:y<1990?1:2,talent:2,fx:y<1981?1:2,governance:1});
 const weights=y<1980?[3,3,0,0,2,2,0,1]:y<2000?[2,2,2,2,2,2,3,1]:[2,2,3,2,2,2,3,1];
 s.districts.forEach((d,i)=>d.priority=weights[i]);
 log(s,'史実ヒントの参考案を、国家政策と地区の投資優先度に反映しました。');return true;
}
function borrow(s,fraction=.05){
 if(s.status!=='playing'||![.05,.10].includes(fraction))return false;
 const m=economy(s),amount=m.nominal*fraction;
 if(m.grossDebt/m.nominal>2.5){log(s,'市場から追加資金を調達できません。');return false;}
 s.bonds.push({amount,coupon:m.newYield+fraction*.025,maturity:s.year+10});s.cash+=amount;
 log(s,`開発債を発行。10年固定利率 ${((m.newYield+fraction*.025)*100).toFixed(2)}％。調達資金を政府の手元資金に加えました。`);return true;
}
function repay(s){
 if(s.status!=='playing')return false;
 const m=economy(s);let available=Math.min(s.cash,m.nominal*.05),used=0;
 for(const b of s.bonds){const v=Math.min(b.amount,available);b.amount-=v;available-=v;used+=v;}
 s.bonds=s.bonds.filter(b=>b.amount>1e-9);s.cash-=used;if(used>0)log(s,'国債の一部を繰上返済。利払い負担を軽減。');return used>0;
}
function step(s){
 if(s.status!=='playing'||s.year>=END)return false;
 const before=economy(s),p=s.policy,oldPrice=s.price,oldFx=s.fx;
 const spentReal=before.real,oldSkill=s.skill,oldCapital=s.capitalStock;
 const pri=sum(s.districts.map(d=>d.priority));
 const exec=[.91,1,1.08][p.governance];
 s.districts.forEach((v,i)=>{const share=pri?v.priority/pri:0;v.level+=p.investment/100*share*exec*2;});
 const d=districtEffect(s);
 const investmentClimate=clamp(.55+s.trust/160+(d.network-.2)*.3-(p.tax-18)*.014,.30,1.3);
 const foreignInvestment=[.005,.045,.090][p.capital]*investmentClimate;
 const privateInvestment=clamp(.14+(s.skill/100)*.025-(p.tax-18)*.003,.08,.20);
 const publicInvestment=(pri?p.investment:0)/100*clamp(d.quality,.5,1.55)*exec;
 s.capitalStock=Math.max(.01,s.capitalStock*.958+spentReal*(privateInvestment+foreignInvestment+publicInvestment));
 s.skill=clamp(s.skill+(p.education*.45+p.talent*.18+d.research*.7-.44)*(1-s.skill/140),5,100);
 const catchup=.023*(1-clamp((s.year-1965)/100,0,.65))*(.30+p.capital*.35);
 const knowledge=(.010+s.skill*.00013+p.education*.0018+p.talent*.002+d.research*.014+d.network*.004)*(1-.72*clamp((s.year-1985)/40,0,1));
 s.tfp*=1+Math.max(-.01,catchup+knowledge)*(0.65+s.trust/200)*(.82-.60*clamp((s.year-1980)/30,0,1));
 // Population in millions, with cohorts. Births cannot enter workforce immediately.
 const tfr=clamp(4.5-(s.year-1965)*.052-Math.log(Math.max(1,before.real/B/(residents(s)/1.8369)))*.22+p.family*.18-Math.max(0,1-before.housingRatio)*1.8,.65,4.7);
 const births=sum(s.ages.slice(15,50))*.5*tfr/35;s.births=births*1e6;s.tfr=tfr;
 const next=Array(86).fill(0);next[0]=births;
 for(let a=0;a<86;a++){const death=a<1?.012:a<55?.0018:a<70?.010:a<80?.04:.12;next[Math.min(a+1,85)]+=s.ages[a]*(1-death);}
 s.ages=next;
 const localWorkers=sum(s.ages.slice(18,65))*.73;
 const attraction=clamp((.7+s.skill/130)*(0.5+s.trust/150)*Math.min(1.08,before.housingRatio),.2,1.3);
 s.foreignWorkers=Math.max(.005,s.foreignWorkers+(.015*[.15,1,2.4][p.workers]*attraction*localWorkers-s.foreignWorkers*.025));
 s.foreignTalent=Math.max(.002,s.foreignTalent+(.0023*[.2,1,2.6][p.talent]*attraction*localWorkers-s.foreignTalent*.025));
 // Capacity investment: real costs become more expensive as wages rise.
 const constructionCost=.80*Math.pow(Math.max(1,spentReal/B),.65);
 s.homes=Math.max(.1,s.homes*.994+spentReal*p.housing/100/constructionCost*(1+d.house*.07));
 const wInvestment=spentReal*p.water/100*(1+d.water*.08);
 if(newaterReady(s)){
  s.recycle+=wInvestment*.065;
  if(!s.flags.newater){s.flags.newater=true;log(s,'NEWaterを導入。高度再生水で工業用水と飲料水源を支える。設備と電力が必要です。');}
 }else s.waterNatural=Math.min(.85,s.waterNatural+wInvestment*.075);
 s.waterImport=Math.min(.85,s.waterImport+wInvestment*.04);
 if(s.year>=2005&&s.skill>=65)s.desal+=wInvestment*.035;
 s.efficiency=clamp(s.efficiency+p.energy*.010,0,1.6);
 s.diversification=clamp(s.diversification+p.energy*.009,0,.90);
 s.year++;
 const ev=EVENTS[s.year];s.exportShock=ev?ev[1]:0;s.energyShock=ev?1+(ev[2]-1)*(1-s.diversification*.60):1;s.drought=ev?ev[3]:1;
 if(ev)log(s,`${ev[0]}。経済環境の変化を今年の決算に反映します。`);
 const noise=(rand(s)-.5)*.018*[.7,1,1.7][p.governance];s.exportShock+=noise;
 s.badPolicy*=p.governance===2?.65:.25;
 const policyOutcome=rand(s);
 if(policyOutcome>.955){s.capitalStock*=1+.012*[.6,1,2.1][p.governance];log(s,'重点投資が想定を上回り、民間設備の増設につながりました。');}
 if(policyOutcome<.055){const error=.050*[.6,1,2.7][p.governance];s.badPolicy+=error;log(s,'投資計画に想定外の不振。検証の仕組みが弱いほど損失の修正に時間がかかる。');}
 s.fundFx=s.year<=1973?3.06:clamp(s.fundFx*Math.exp(-(.008+(s.skill-20)*.00014+p.capital*.0012)+Math.max(0,before.newYield-.08)*.06),.82,4.5);
 const target=s.fundFx*[1.10,1,.91][p.fx];
 const desired=s.year<=1973?3.06:s.fx*.65+target*.35;
 const intervention=s.year>1973&&p.fx===2?before.nominal*.003:0;
 const affordable=intervention===0?1:clamp(s.reserves*oldFx/intervention,0,1);
 s.fx=s.year<=1973?3.06:Math.max(.65,s.fx+(desired-s.fx)*affordable);
 s.averageFx=(oldFx+s.fx)/2;
 const inflation=clamp(.025+(s.energyShock-1)*.022+(s.fx/oldFx-1)*.28+(p.investment-5)*.0005,.002,.12);
 s.price*=1+inflation;
 // Finance: old coupons stay fixed; only new/refinanced bonds receive market yields.
 const m=economy(s),matured=s.bonds.filter(b=>b.maturity<=s.year),due=sum(matured.map(b=>b.amount));
 s.bonds=s.bonds.filter(b=>b.maturity>s.year);
 const revenue=m.nominal*p.tax/100,programs=m.nominal*(6+(pri?p.investment:0)+p.housing+p.water+p.energy+p.education+p.family)/100;
 const interest=before.interest;
 s.cash+=revenue-programs-interest;
 const reserveAddition=m.nominal*.005;s.cash-=reserveAddition;s.reserves+=reserveAddition/s.fx;
 s.reserves=Math.max(0,s.reserves-intervention/oldFx);
 if(s.cash>m.nominal*.28){const transfer=(s.cash-m.nominal*.28)*.20;s.cash-=transfer;s.reserves+=transfer/s.fx;}
 const needs=Math.max(0,-s.cash)+due;
 if(needs>0){s.bonds.push({amount:needs,coupon:clamp(m.newYield+needs/Math.max(m.nominal,.01)*.025,.01,.32),maturity:s.year+10});s.cash=Math.max(0,s.cash);}
 s.trust=clamp(s.trust+(p.governance===0?.35:p.governance===2?-.15:.08)-Math.max(0,m.newYield-.09)*14,10,95);
 const realGrowth=m.real/before.real-1;
 const foreignFraction=(s.foreignWorkers+s.foreignTalent)/population(s);
 const housingLoss=Math.max(0,1-m.housingRatio),waterLoss=Math.max(0,1-m.waterRatio);
 const targetSupport=clamp(59+realGrowth*105+p.family*2-(p.tax-18)*.6-housingLoss*55-waterLoss*65-Math.max(0,foreignFraction-.28)*34-Math.max(0,m.costEnergy-.065)*90-s.badPolicy*40,5,87);
 s.support=clamp(s.support*.68+targetSupport*.32,1,95);
 s.poorYears=(s.support<35||realGrowth<-.055)?s.poorYears+1:Math.max(0,s.poorYears-1);
 s.last={growth:realGrowth,inflation,fxChange:s.averageFx/before.nominal*before.usd-1,revenue,programs,interest,borrowing:needs,skillsGain:s.skill-oldSkill,capitalGrowth:s.capitalStock/oldCapital-1,foreignInvestment:foreignInvestment*spentReal,description:ev?ev[0]:'通常年'};
 if(ELECTIONS.includes(s.year)){
  const votes=clamp(s.support+(rand(s)-.5)*4,1,99);
  const seatShare=clamp(.5+(votes-50)*.018+[0,.08,.12][p.governance],0,1);
  s.lastElection={year:s.year,votes,seatShare};
  log(s,`総選挙：与党得票率 ${votes.toFixed(1)}％、議席率 ${(seatShare*100).toFixed(1)}％。`);
  if(seatShare<.5){s.status='lost';s.reason='総選挙で議会の過半数を失いました。';}
 }
 if(s.support<18||s.poorYears>=3){s.status='lost';s.reason='生活と成長の不振が続き、党内の信任を失いました。';}
 const after=economy(s);
 if(after.grossDebt/Math.max(after.nominal,.01)>2.8&&after.interest/Math.max(after.revenue,.01)>.4){s.status='lost';s.reason='借換えと利払いが膨らみ、政府の資金調達が行き詰まりました。';}
 if(s.year===1990)log(s,'世代交代。次の政権へ引き継ぎ、引き続き国の経営方針を決めていきます。');
 if(s.year===END&&s.status==='playing'){s.status=after.usd>HISTORY[END]/1e9?'won':'lost';s.reason=s.status==='won'?'2025年の名目ドル建てGDPで、史実を上回りました。':'2025年の名目ドル建てGDPが、史実に届きませんでした。';}
 s.history.push(record(s));log(s,`${s.year}年の決算。GDPは前年から ${((after.usd/before.usd-1)*100).toFixed(1)}％。`);return true;
}
function serialize(s){return JSON.stringify({format:'Simgapore2',version:VERSION,state:s},null,2);}
function parse(text){
 if(typeof text!=='string'||text.length>2e6)throw Error('セーブファイルが大きすぎます。');
 const w=JSON.parse(text);if(w.format!=='Simgapore2'||w.version!==VERSION)throw Error('Simgapore 2.0で書き出したセーブファイルを選んでください。');
 const s=w.state;if(!s||s.version!==2||!Number.isInteger(s.year)||s.year<START||s.year>END||!['playing','won','lost'].includes(s.status))throw Error('セーブの形式が正しくありません。');
 const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 if(!Array.isArray(s.ages)||s.ages.length!==86||s.ages.some(x=>!finite(x,0,100)))throw Error('人口データが不正です。');
 for(const k of ['capitalStock','tfp','price','fx','averageFx','fundFx','homes'])if(!finite(s[k],.00001,1e8))throw Error(k+'の値が不正です。');
 for(const k of ['foreignWorkers','foreignTalent','waterNatural','waterImport','recycle','desal','efficiency','diversification','cash','reserves','births','tfr','badPolicy','energyShock','drought'])if(!finite(s[k],0,1e8))throw Error(k+'の値が不正です。');
 for(const k of ['skill','support','trust'])if(!finite(s[k],0,100))throw Error(k+'の値が不正です。');
 if(!finite(s.exportShock,-1,1)||!Number.isInteger(s.poorYears)||s.poorYears<0||s.poorYears>61||!Number.isInteger(s.rng)||s.rng<0||s.rng>4294967295)throw Error('内部状態が不正です。');
 if(!s.policy)throw Error('政策データがありません。');
 for(const [key,a] of Object.entries(POLICY)){const v=s.policy[key];if(a.values?!Number.isInteger(v)||v<0||v>=a.values.length:!finite(v,a.min,a.max)||Math.abs(v/a.step-Math.round(v/a.step))>1e-8)throw Error('政策値が不正です。');}
 if(!Array.isArray(s.districts)||s.districts.length!==8||s.districts.some((v,i)=>v.id!==DISTRICTS[i].id||!Number.isInteger(v.priority)||v.priority<0||v.priority>3||!finite(v.level,1,1e6)))throw Error('地区データが不正です。');
 if(!Array.isArray(s.bonds)||s.bonds.length>250||s.bonds.some(b=>!finite(b.amount,0,1e9)||!finite(b.coupon,0,1)||!Number.isInteger(b.maturity)||b.maturity<1965||b.maturity>2040))throw Error('債券データが不正です。');
 if(!Array.isArray(s.history)||s.history.length!==s.year-START+1||s.history.some((h,i)=>h.year!==START+i||!finite(h.gdp,0,1e10)))throw Error('年次記録が不正です。');
 if(!Array.isArray(s.log)||s.log.length>150||s.log.some(x=>typeof x.text!=='string'||x.text.length>2000)||!s.flags||typeof s.flags!=='object')throw Error('記録の形式が不正です。');
 if(typeof s.reason!=='string'||s.reason.length>2000)throw Error('終了理由が不正です。');
 if(s.lastElection!==null&&(!s.lastElection||!Number.isInteger(s.lastElection.year)||!ELECTIONS.includes(s.lastElection.year)||s.lastElection.year>s.year||!finite(s.lastElection.votes,0,100)||!finite(s.lastElection.seatShare,0,1)))throw Error('選挙データが不正です。');
 if(s.year===END&&s.status==='playing')throw Error('終了状態が不正です。');
 return copy(s);
}
function forecast(s){const n=copy(s);step(n);return n;}
initial();
return{VERSION,KEY,START,END,B,K0,POLICY,DISTRICTS,ELECTIONS,HISTORY,initial,economy,step,guide,setPolicy,priority,borrow,repay,serialize,parse,copy,record,forecast,newaterReady,residents,population};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Sim;
