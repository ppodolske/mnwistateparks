// Cloudflare Pages Function: /api/* (the static site is unaffected).
import {safeHandle} from '../_lib/api.mjs';
export async function onRequest(context){return safeHandle(context)}
