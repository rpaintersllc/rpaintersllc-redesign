import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const checker=new URL('../scripts/check-web-modules.mjs',import.meta.url).pathname;
async function fixture(files,run){
 const directory=await mkdtemp(path.join(tmpdir(),'buzzie-module-check-')),web=path.join(directory,'web');await mkdir(web);
 try{for(const [name,source]of Object.entries(files))await writeFile(path.join(directory,name),source);const result=spawnSync(process.execPath,['--experimental-vm-modules',checker,web],{encoding:'utf8'});assert.equal(result.error,undefined);await run(result)}finally{await rm(directory,{recursive:true,force:true})}
}
test('browser module validation links cycles without executing top-level application code',()=>fixture({
 'web/a.js':"import {b} from './b.js'; export const a=1; throw Error('Application code must not run');",
 'web/b.js':"import {a} from './a.js'; export function b(){return a}",
},r=>{assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/2 modules.*not evaluated/)}));
test('browser module validation rejects a missing imported file',()=>fixture({'web/a.js':"import './missing.js';"},r=>{assert.equal(r.status,1);assert.match(r.stderr,/missing\.js/)}));
test('browser module validation catches an imported name the target does not export',()=>fixture({'web/a.js':"import {absent} from './b.js';",'web/b.js':'export const present=1;'},r=>{assert.equal(r.status,1);assert.match(r.stderr,/does not provide an export named 'absent'/)}));
test('browser module validation catches syntax errors before any module executes',()=>fixture({'web/a.js':'export const = 1;'},r=>{assert.equal(r.status,1);assert.match(r.stderr,/validation failed/)}));
test('browser module validation rejects paths outside the static web directory',()=>fixture({'web/a.js':"import '../outside.js';",'outside.js':'export const value=1;'},r=>{assert.equal(r.status,1);assert.match(r.stderr,/leaves the web directory/)}));
