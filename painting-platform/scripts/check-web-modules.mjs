// Parse and link the static browser module graph. Never evaluate application code.
import vm from 'node:vm';
import {readdir,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export async function checkWebModules(directory){
 if(typeof vm.SourceTextModule!=='function')throw Error('Run with Node 24 and --experimental-vm-modules.');
 const root=await realpath(directory),cache=new Map();
 async function load(filename){
  const resolved=await realpath(filename);
  if(!resolved.startsWith(root+path.sep))throw Error('Module import leaves the web directory: '+filename);
  if(path.extname(resolved)!=='.js')throw Error('Expected a browser .js module: '+filename);
  if(!cache.has(resolved))cache.set(resolved,new vm.SourceTextModule(await readFile(resolved,'utf8'),{identifier:pathToFileURL(resolved).href}));
  return cache.get(resolved);
 }
 async function discover(directory){
  for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const filename=path.join(directory,entry.name);
   if(entry.isDirectory())await discover(filename);
   else if(entry.isFile()&&entry.name.endsWith('.js'))await load(filename);
  }
 }
 await discover(root);if(!cache.size)throw Error('No browser JavaScript modules found.');
 for(const module of cache.values()){
  if(module.status!=='unlinked')continue;
  await module.link((specifier,parent)=>{
   if(!specifier.startsWith('./')&&!specifier.startsWith('../'))throw Error('Unsupported nonlocal browser import: '+specifier);
   return load(fileURLToPath(new URL(specifier,parent.identifier)));
  });
 }
 return {modules:cache.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=await checkWebModules(process.argv[2]||fileURLToPath(new URL('../web/',import.meta.url)));
  console.log('Static browser imports verified: '+result.modules+' modules. Application code was not evaluated.');
 }catch(error){console.error('Browser module validation failed: '+error.message);process.exitCode=1}
}
