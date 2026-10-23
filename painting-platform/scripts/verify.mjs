// Local validation only: no deployment, live integration test or customer write.
import {spawnSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(Number(process.versions.node.split('.')[0])!==24){console.error('BUZZIE verification requires Node 24.');process.exit(1)}
function run(label,args){
 console.log('\n'+label);
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',shell:false});
 if(result.error){console.error(result.error.message);process.exit(1)}
 if(result.status!==0)process.exit(result.status||1);
}
run('Checking static browser module syntax and imports',['--experimental-vm-modules','scripts/check-web-modules.mjs']);
const tests=(await readdir(new URL('../tests/',import.meta.url))).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>'tests/'+name);
if(!tests.length)throw Error('No mocked tests found.');
run('Running mocked Node/DOM tests',['--test',...tests]);
console.log('\nBUZZIE local verification passed. Live email, abuse enforcement and device checks are separate launch gates.');
