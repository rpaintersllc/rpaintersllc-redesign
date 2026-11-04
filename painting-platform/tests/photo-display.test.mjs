import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {drawPhotos} from '../web/common.js';
async function screen(run){
 const old=globalThis.document;const {document}=parseHTML('<html><body><div id="photos"></div></body></html>');globalThis.document=document;
 try{await run(document.querySelector('#photos'))}finally{globalThis.document=old}
}
test('a failed image gives a numbered recovery notice without exposing its signed URL',()=>screen(target=>{
 const photos=[{id:'one',url:'https://images.invalid/one?token=private-fixture'},{id:'two',url:'https://images.invalid/two'}];drawPhotos(photos,target);
 const image=target.querySelector('img');assert.equal(image.alt,'Private project photo 1');assert.equal(image.loading,'lazy');assert.equal(typeof image.onerror,'function');image.onerror();
 assert.equal(target.querySelectorAll('img').length,1);assert.match(target.querySelector('[role=status]').textContent,/Photo 1 could not load.*Refresh this workspace/);
 assert.doesNotMatch(target.textContent,/private-fixture|https:|deleted|upload again/);assert.equal(target.querySelector('img').getAttribute('src'),photos[1].url);
}));
test('late or repeated failures cannot append notices to a newer gallery',()=>screen(target=>{
 drawPhotos([{url:'https://images.invalid/old'}],target);const old=target.querySelector('img'),fail=old.onerror;assert.equal(typeof fail,'function');
 drawPhotos([{url:'https://images.invalid/new'}],target);fail();fail();
 assert.equal(target.querySelectorAll('img').length,1);assert.equal(target.querySelectorAll('p').length,0);assert.equal(target.querySelector('img').getAttribute('src'),'https://images.invalid/new');
}));
test('a refreshed photo URL replaces the failure notice without changing photo metadata',()=>screen(target=>{
 const photo=Object.freeze({id:'same-photo',url:'https://images.invalid/expired'});drawPhotos([photo],target);const image=target.querySelector('img'),fail=image.onerror;assert.equal(typeof fail,'function');fail();fail();assert.equal(target.querySelectorAll('[role=status]').length,1);
 drawPhotos([{id:photo.id,url:'https://images.invalid/renewed'}],target);assert.equal(target.querySelectorAll('[role=status]').length,0);assert.equal(target.querySelector('img').getAttribute('src'),'https://images.invalid/renewed');assert.equal(photo.url,'https://images.invalid/expired');
}));
test('unavailable photo metadata keeps its position and recovery guidance',()=>screen(target=>{
 drawPhotos([{id:'one',unavailable:true},{id:'two',url:'https://images.invalid/two'}],target);
 assert.match(target.querySelector('[role=status]').textContent,/Photo 1 could not load.*Refresh/);assert.equal(target.querySelector('img').alt,'Private project photo 2');assert.equal(target.children.length,2);
 drawPhotos([],target);assert.equal(target.children.length,0);
}));
