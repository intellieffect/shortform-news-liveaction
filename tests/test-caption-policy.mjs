import test from 'node:test';
import assert from 'node:assert/strict';
import {readProductionProfile} from '../scripts/lib/production-profile.mjs';
import {splitCaptionWords} from '../scripts/lib/caption-segmentation.mjs';
import {captionPolicyIssues} from '../scripts/lib/caption-policy.mjs';
const profile=readProductionProfile();
const words='전세계가 함께 달을 올려다 본 국제 달 관측의 날이 열렸습니다.'.split(' ').map((text,i)=>({text,start:i*.4,end:i*.4+.35}));
const hints={protected_phrases:[{from:5,to:8,text:'국제 달 관측의 날'}],break_before:[{token:9,text:'열렸습니다.'}]};
const narration=()=>({sentences:[{id:'s01',text:words.map(w=>w.text).join(' '),caption_words:words,caption_segmentation:hints}],captions:splitCaptionWords(words,profile,{hints})});
test('canonical semantic captions preserve all text and times',()=>assert.deepEqual(captionPolicyIssues(narration(),profile),[]));
test('deleted text, altered timing, protected-name split and modified source words are rejected',()=>{
  for(const mutate of [n=>n.captions.pop(),n=>n.captions[0].start+=.01,n=>n.captions[0].text='축약',n=>n.sentences[0].caption_words=n.sentences[0].caption_words.slice(1)]) {
    const n=structuredClone(narration());mutate(n);assert.ok(captionPolicyIssues(n,profile).length);
  }
});
