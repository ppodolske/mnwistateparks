const assert=require('assert');
const fs=require('fs');
const css=fs.readFileSync('./parks-yellowstone-theme.css','utf8');
const wrapper=fs.readFileSync('./site-v1224.js','utf8');
const favicon=fs.readFileSync('./park-favicon.svg','utf8');

for(const hex of ['#0067A2','#DFCB91','#CB7223','#289A84','#7FA4C2','#AF7E56']){
  assert(css.includes(hex),`Yellowstone palette must include ${hex}`);
}
assert(css.includes('"Bebas Neue"'),'headings must use Bebas Neue');
assert(css.includes('"Fredoka"'),'body text must use Fredoka');
assert(css.includes('"PT Serif"'),'tags and ratings must use PT Serif');
assert(css.includes('font-size:15px'),'desktop body copy must be tightened to 15px');
assert(css.includes('font-size:14px'),'mobile body copy must be tightened to 14px');
assert(wrapper.includes('family=Bebas+Neue&family=Fredoka:wght@400&family=PT+Serif:wght@400;700'),'wrapper must load requested Google Fonts');
assert(wrapper.includes('/parks-yellowstone-theme.css'),'wrapper must inject Yellowstone theme');
assert(wrapper.includes('/park-favicon.svg'),'wrapper must inject park favicon');
assert(favicon.includes('#0067A2')&&favicon.includes('#DFCB91'),'favicon must use Yellowstone blue and sand');
console.log('Yellowstone theme audit passed: palette, typography, compact body sizing, theme injection and park favicon are configured.');
