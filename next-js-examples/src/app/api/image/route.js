import { NextResponse } from 'next/server';

// 保留你现有的 env 名称
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;                 // 你现在 chat 能用的那串（可能是学校给的）
const OPENAI_HOST    = process.env.OPENAI_HOST || 'https://api.openai.com';
const LLM_HOST       = process.env.LLM_HOST || process.env.CORNELL_LLM_HOST; // 学校网关；示例：https://api.ai.it.cornell.edu

const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-1';
const IMAGE_SIZE  = process.env.IMAGE_SIZE  || '1024x1024';

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'POST { "prompt": "..." }',
    hosts: {
      openai: OPENAI_HOST,
      school: LLM_HOST || null
    },
    has_key: !!OPENAI_API_KEY
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt, size } = body;
    
    console.log('[api/image] Request received:', { 
      hasPrompt: !!prompt, 
      promptLength: prompt?.length,
      hasKey: !!OPENAI_API_KEY,
      hasLLMHost: !!LLM_HOST 
    });
    
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    if (!OPENAI_API_KEY) {
      console.error('[api/image] Missing OPENAI_API_KEY');
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY', hint: 'Set OPENAI_API_KEY in .env.local' }, { status: 500 });
    }

    // 1) 先试官方 OpenAI（如果 key 其实是学校给的，会返回 invalid_api_key，我们就自动回退）
    const openai = await tryOpenAI({ prompt, size: size || IMAGE_SIZE });
    if (openai.ok) return NextResponse.json(openai.body, { status: 200 });

    // 如果明确是 key 无效（官方不认），或者网络连接失败，且你有学校网关，就回退学校网关
    const isInvalidKey =
      openai.status === 401 &&
      typeof openai.detail === 'object' &&
      openai.detail?.error?.code === 'invalid_api_key';
    
    const isNetworkError = 
      openai.status === 503 || 
      openai.status === 504 ||
      (openai.status === 500 && openai.detail?.error?.includes('fetch failed'));

    if ((isInvalidKey || isNetworkError) && LLM_HOST) {
      console.log('[api/image] Falling back to school gateway due to:', isInvalidKey ? 'invalid key' : 'network error');
      console.log('[api/image] School gateway URL:', LLM_HOST);
      const school = await trySchool({ prompt, size: size || IMAGE_SIZE });
      if (school.ok) return NextResponse.json(school.body, { status: 200 });
      
      // Provide better error message
      const errorDetail = school.detail?.error || JSON.stringify(school.detail);
      return NextResponse.json(
        { 
          error: 'School images error', 
          tried: school.tried, 
          last_status: school.status, 
          detail: school.detail,
          hint: `Failed to connect to school gateway at ${LLM_HOST}. Check network connection or gateway configuration.`
        },
        { status: school.status || 502 }
      );
    }
    
    // If network error and no school gateway, provide helpful message
    if (isNetworkError && !LLM_HOST) {
      return NextResponse.json(
        { 
          error: 'OpenAI images error', 
          upstream_status: openai.status, 
          detail: openai.detail,
          hint: 'Network connection failed. If you have a school gateway, set LLM_HOST or CORNELL_LLM_HOST in .env.local'
        },
        { status: openai.status || 500 }
      );
    }

    // 其他错误（比如 429/403）直接返回官方的错误信息
    return NextResponse.json(
      { error: 'OpenAI images error', upstream_status: openai.status, detail: openai.detail },
      { status: openai.status || 500 }
    );
  } catch (e) {
    console.error('[api/image] route error', e);
    const errorMessage = e?.message || String(e) || 'Unknown error';
    const errorStack = e?.stack || '';
    return NextResponse.json({ 
      error: 'Server error', 
      detail: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}

// ---------- helpers ----------

// 官方 OpenAI
async function tryOpenAI({ prompt, size }) {
  try {
    const url = new URL('/v1/images/generations', OPENAI_HOST).toString();
    console.log('[tryOpenAI] Attempting to fetch from:', url);
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${OPENAI_API_KEY}` 
        },
        body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, n: 1 }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const raw = await res.text();
      if (!res.ok) {
        const errorDetail = safeJson(raw);
        console.error('[tryOpenAI] API error:', res.status, errorDetail);
        return { ok: false, status: res.status, detail: errorDetail };
      }
      const data = safeJson(raw);
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        console.error('[tryOpenAI] No b64_json in response:', data);
        return { ok: false, status: 502, detail: data || 'no b64_json' };
      }
      return { ok: true, body: { image_b64: b64 } };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[tryOpenAI] Request timeout');
        return { ok: false, status: 504, detail: { error: 'Request timeout - API took too long to respond' } };
      }
      throw fetchError; // Re-throw to be caught by outer catch
    }
  } catch (e) {
    console.error('[tryOpenAI] Fetch error:', e);
    const errorMsg = e.message || String(e);
    
    // Provide more helpful error messages
    if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
      return { 
        ok: false, 
        status: 503, 
        detail: { 
          error: 'Connection failed - Cannot reach OpenAI API. Check your network connection or API endpoint.',
          hint: `Trying to connect to: ${OPENAI_HOST}`
        } 
      };
    }
    
    if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
      return { 
        ok: false, 
        status: 503, 
        detail: { 
          error: 'DNS resolution failed - Cannot resolve OpenAI API hostname.',
          hint: `Check if ${OPENAI_HOST} is accessible`
        } 
      };
    }
    
    return { ok: false, status: 500, detail: { error: errorMsg } };
  }
}

// 学校网关（多路径尝试；鉴权沿用 Bearer OPENAI_API_KEY，因为你的 chat 就是这么配的）
// 放在文件顶部其它常量附近
const SCHOOL_IMAGE_MODEL = (process.env.SCHOOL_IMAGE_MODEL || 'openai.gpt-image-1').trim();

// 学校网关：优先走 /v1/images/generations（body 里带 model），必要时再兜底 /images/generations
async function trySchool({ prompt, size }) {
  if (!LLM_HOST) {
    console.error('[trySchool] LLM_HOST is not configured');
    return { ok: false, status: 500, detail: { error: 'LLM_HOST not configured' }, tried: [] };
  }
  
  const paths = [
    '/v1/images/generations',   // Cornell 文档建议你先用这个
    '/images/generations',      // 兼容旧路径
  ];

  const tried = [];
  let lastStatus = 0, lastDetail = null;

  for (const p of paths) {
    try {
      const url  = new URL(p, LLM_HOST).toString();
      const body = { model: SCHOOL_IMAGE_MODEL, prompt, size, n: 1 };
      
      console.log('[trySchool] Attempting:', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type':'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const raw = await res.text();
        tried.push({ url, status: res.status });

        if (!res.ok) { 
          lastStatus = res.status; 
          lastDetail = safeJson(raw); 
          console.error('[trySchool] API error:', res.status, lastDetail);
          continue; 
        }

        const data = safeJson(raw);
        const b64  = data?.data?.[0]?.b64_json;
        if (!b64)  { 
          lastStatus = 502; 
          lastDetail = data || 'no b64_json'; 
          console.error('[trySchool] No b64_json:', data);
          continue; 
        }

        return { ok: true, body: { image_b64: b64 }, tried };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('[trySchool] Request timeout');
          lastStatus = 504;
          lastDetail = { error: 'Request timeout' };
          continue;
        }
        throw fetchError;
      }
    } catch (e) {
      console.error('[trySchool] Fetch error for path', p, ':', e);
      lastStatus = 503;
      lastDetail = { error: e.message || String(e) };
      tried.push({ url: `${LLM_HOST}${p}`, status: 'error', error: e.message });
    }
  }
  return { ok: false, status: lastStatus || 502, detail: lastDetail, tried };
}


function safeJson(s) { try { return JSON.parse(s); } catch { return s; } }
