/** Incremental SSE decoder: handles split UTF-8, CRLF and multiple events per chunk. */
export async function* sseData(body: ReadableStream<Uint8Array>) {
  const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
  try {while(true){const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
    let match:RegExpExecArray|null;
    while((match=/\r?\n\r?\n/.exec(buffer))){const frame=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const data=frame.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)yield data;}
    if(done)break;
  }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
