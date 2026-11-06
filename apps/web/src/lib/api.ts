export type Service = { id: string; slug: string; title: string; description: string; image_path: string; display_order: number };
export type Testimonial = { id: string; quote: string; author: string; context: string };
const base = import.meta.env.VITE_API_URL || '/api';
export async function apiGet<T>(path: string): Promise<T> { const response = await fetch(`${base}${path}`); if (!response.ok) throw new Error('API request failed'); return response.json() as Promise<T>; }
export async function sendInquiry(data: {name:string;email:string;phone:string;service:string;event_date?:string;message?:string;website?:string}) { const r=await fetch(`${base}/inquiries`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json().catch(()=>({error:'Request failed'})); if(!r.ok) throw new Error(body.error || 'Could not send inquiry'); return body; }
