import {DOMParser} from 'npm:linkedom@0.18.13';
import {makeParsers} from './core.ts';
import {makeDiscoveryHandler} from './handler.ts';
Deno.serve(makeDiscoveryHandler(k=>Deno.env.get(k),fetch,makeParsers(DOMParser)));
