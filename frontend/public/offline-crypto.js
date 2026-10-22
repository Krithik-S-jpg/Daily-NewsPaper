/** Encrypt only explicitly saved editions. The passphrase is never persisted or sent. */
const encode=(bytes)=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode=(text)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function key(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
/** @param {string} text @param {string} password */
export async function seal(text,password){if(password.length<12)throw new Error('Use at least 12 characters for your offline passphrase.');const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(password,salt),new TextEncoder().encode(text));return {version:1,salt:encode(salt),iv:encode(iv),data:encode(encrypted)}}
/** @param {{version:number,salt:string,iv:string,data:string}} payload @param {string} password */
export async function unseal(payload,password){if(payload.version!==1)throw new Error('Unsupported saved edition.');const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(payload.iv)},await key(password,decode(payload.salt)),decode(payload.data));return new TextDecoder().decode(clear)}
