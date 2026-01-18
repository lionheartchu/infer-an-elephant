import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BAIDU_AK = process.env.BAIDU_AK;
const BAIDU_SK = process.env.BAIDU_SK;
const TOP_NUM = 10;

// Get Baidu access token
async function getToken(ak, sk) {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${ak}&client_secret=${sk}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// Identify animal from base64 image
async function identifyAnimal(imageBase64, token, topNum = 10) {
  const url = `https://aip.baidubce.com/rest/2.0/image-classify/v1/animal?access_token=${token}`;
  
  const body = new URLSearchParams();
  body.append('image', imageBase64);
  body.append('top_num', String(topNum));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  
  if (!res.ok) throw new Error(`Baidu API failed: ${res.status}`);
  return await res.json();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'POST { "filename": "ele_1.jpg" } or { "imageBase64": "..." }',
    has_credentials: !!(BAIDU_AK && BAIDU_SK)
  });
}

export async function POST(req) {
  try {
    const { filename, imageBase64 } = await req.json();
    
    if (!BAIDU_AK || !BAIDU_SK) {
      return NextResponse.json({ 
        error: 'Missing Baidu credentials',
        hint: 'Set BAIDU_AK and BAIDU_SK in .env.local'
      }, { status: 500 });
    }
    
    let base64Image = imageBase64;
    
    // If filename provided, read from disk
    if (filename && !imageBase64) {
      const filePath = path.join(process.cwd(), 'data', 'animals', filename);
      
      // Security check
      const animalsDir = path.join(process.cwd(), 'data', 'animals');
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(animalsDir)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
      }
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
      
      // Check if corresponding JSON file exists (paired data)
      const baseName = path.basename(filename, path.extname(filename));
      const jsonPath = path.join(animalsDir, `${baseName}.animal.json`);
      
      if (fs.existsSync(jsonPath)) {
        // Use existing JSON file instead of calling API
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        return NextResponse.json({
          success: true,
          result: jsonData.result || [],
          log_id: jsonData.log_id,
          from_cache: true,
          source: jsonPath
        });
      }
      
      const fileBuffer = fs.readFileSync(filePath);
      base64Image = fileBuffer.toString('base64');
    }
    
    if (!base64Image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    
    // Get token and identify (only if no cached JSON found)
    const token = await getToken(BAIDU_AK, BAIDU_SK);
    const result = await identifyAnimal(base64Image, token, TOP_NUM);
    
    // Save result to JSON file for record (optional)
    const outputDir = path.join(process.cwd(), 'data', 'recog_json', 'output_json');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const baseName = filename ? path.basename(filename, path.extname(filename)) : 'upload';
    const outputPath = path.join(outputDir, `${baseName}.${timestamp}.animal.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      result: result.result || [],
      log_id: result.log_id,
      saved_to: outputPath
    });
    
  } catch (error) {
    console.error('[api/animals/identify] error:', error);
    return NextResponse.json({ 
      error: 'Recognition failed', 
      detail: String(error) 
    }, { status: 500 });
  }
}

