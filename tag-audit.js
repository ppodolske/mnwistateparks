const site=require('./site.js');

const parks=site.parks;
const experienceRules=site.EXPERIENCE_RULES;
const practicalRules=site.PRACTICAL_RULES;

function sourceText(p){return [p.review,p.pros,p.cons,p.criticalFactors].filter(Boolean).join(' ')}
function matching(rule){return parks.filter(p=>rule[1].test(sourceText(p)))}
function assert(cond,msg){if(!cond)throw new Error(msg)}

assert(parks.length===116,`Expected 116 parks, found ${parks.length}`);

for(const [kind,rules] of [['experience',experienceRules],['practical',practicalRules]]){
  const labels=rules.map(([name])=>name);
  assert(new Set(labels).size===labels.length,`Duplicate ${kind} tag labels detected`);
  for(const rule of rules){
    const matches=matching(rule);
    assert(matches.length>0,`${kind} tag ${rule[0]} matches no parks`);
    assert(matches.length<116,`${kind} tag ${rule[0]} matches every park and is too broad`);
  }
}

// Known false-positive guards from earlier QA.
const towerRule=experienceRules.find(([name])=>name==='Lookout towers');
const rockRule=experienceRules.find(([name])=>name==='Rock formations');
assert(towerRule,'Lookout towers rule missing');
assert(rockRule,'Rock formations rule missing');
for(const p of parks){
  const text=sourceText(p);
  const lower=text.toLowerCase();
  const onlyGenericTower=/\btower\b/i.test(text)&&!/lookout tower|observation tower|fire tower/i.test(text);
  if(onlyGenericTower)assert(!towerRule[1].test(text),`Lookout towers false positive guard failed for ${p.slug}`);
  const onlyGenericMound=/\bmound\b/i.test(text)&&!/rock face|rock faces|bluff|cave|geology|natural bridge|quartzite|sandstone|dolomite/i.test(text);
  if(onlyGenericMound)assert(!rockRule[1].test(text),`Rock formations false positive guard failed for ${p.slug}`);
  assert(lower.length>0,`No source review text available for ${p.slug}`);
}

const report={
  parks:parks.length,
  experience:Object.fromEntries(experienceRules.map(rule=>[rule[0],matching(rule).length])),
  practical:Object.fromEntries(practicalRules.map(rule=>[rule[0],matching(rule).length]))
};

console.log('Derived tag QA passed.');
console.log(JSON.stringify(report,null,2));
