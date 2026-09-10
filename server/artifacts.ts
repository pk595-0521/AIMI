import {HttpError} from './validation';
import {createHash} from 'node:crypto';
export function validateArtifact(bytes:Buffer,filename:string) {
 if(!Buffer.isBuffer(bytes)||bytes.length<4||bytes.length>5_000_000)throw new HttpError(422,'Upload a file between 4 bytes and 5 MB.');
 const name=filename.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,150)||'artifact';
 let mimeType='';
 if(name.toLowerCase().endsWith('.pdf')&&bytes.subarray(0,5).toString()==='%PDF-')mimeType='application/pdf';
 else if(name.toLowerCase().endsWith('.png')&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')mimeType='image/png';
 else if(/\.jpe?g$/i.test(name)&&bytes.subarray(0,3).toString('hex')==='ffd8ff')mimeType='image/jpeg';
 else if(/\.(pptx|xlsx)$/i.test(name)&&bytes.subarray(0,4).toString('hex')==='504b0304')mimeType='application/octet-stream';
 else if(/\.(csv|txt)$/i.test(name)&&!bytes.includes(0)&&Buffer.from(bytes.toString('utf8')).equals(bytes))mimeType='text/plain';
 if(!mimeType)throw new HttpError(422,'Unsupported file or file signature mismatch. Use PDF, PNG, JPG, PPTX, XLSX, CSV or TXT.');
 return {name,mimeType,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
