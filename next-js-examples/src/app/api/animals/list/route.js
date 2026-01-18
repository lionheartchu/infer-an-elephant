import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Format display name: "ele_back" -> "Back", "ele_tail fur" -> "Tail Fur"
function formatDisplayName(filename) {
  let name = path.basename(filename, path.extname(filename));
  
  // Remove "ele_" prefix if present
  if (name.startsWith('ele_')) {
    name = name.substring(4);
  }
  
  // Replace underscores with spaces and capitalize words
  name = name
    .split(/[_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return name;
}

export async function GET() {
  try {
    const animalsDir = path.join(process.cwd(), 'data', 'animals');
    
    // Check if directory exists
    if (!fs.existsSync(animalsDir)) {
      return NextResponse.json({ error: 'Animals directory not found' }, { status: 404 });
    }
    
    // Read all files from the animals directory
    const files = fs.readdirSync(animalsDir);
    
    // Filter for image files only
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const images = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    })
    .map(file => {
      const rawId = path.basename(file, path.extname(file)); // "ele_tail fur"
      const id = rawId.replace(/\s+/g, '_');                 // "ele_tail_fur"
  
      return {
        id,                             // 用这个给前端 & Arduino
        filename: file,
        path: `/api/animals/serve/${encodeURIComponent(file)}`,
        name: formatDisplayName(file)
      };
    });
  
  
    
    return NextResponse.json({ images, count: images.length });
  } catch (error) {
    console.error('[api/animals/list] error:', error);
    return NextResponse.json({ error: 'Failed to list images', detail: String(error) }, { status: 500 });
  }
}

