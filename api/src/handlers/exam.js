import { verifyToken } from './auth.js';
import { GoogleDriveDB } from '../utils/google-drive.js';
import { corsHeaders } from '../utils/cors.js';

export async function handleExamDetail(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Verify authentication
    const userPayload = await verifyToken(request, env);
    
    // Get exam ID from query parameters
    const url = new URL(request.url);
    const examId = url.searchParams.get('id');
    
    if (!examId) {
      return new Response(JSON.stringify({ 
        error: 'Exam ID is required' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Check KV cache
    const cacheKey = `exam:${examId}`;
    const cached = await env.EXAM_CACHE.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Initialize Google Drive DB
    const driveDB = new GoogleDriveDB(
      userPayload.access_token,
      env.GOOGLE_DRIVE_FOLDER_ID
    );
    
    // Get exam detail from all spreadsheets
    const examDetail = await driveDB.getExamFromAllSpreadsheets(examId);
    
    if (!examDetail) {
      return new Response(JSON.stringify({ 
        error: 'Exam not found' 
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Process image paths
    if (examDetail.questionText) {
      console.log('Original question text:', examDetail.questionText.substring(0, 200));
      examDetail.fullText = await resolveImagePaths(examDetail.questionText, examDetail.id, userPayload.access_token, env);
      console.log('Processed question text:', examDetail.fullText.substring(0, 200));
    }
    
    // Cache for 24 hours
    await env.EXAM_CACHE.put(cacheKey, JSON.stringify(examDetail), {
      expirationTtl: 86400
    });
    
    return new Response(JSON.stringify(examDetail), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Exam detail error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get exam detail',
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function resolveImagePaths(content, examId, accessToken, env) {
  if (!content || typeof content !== 'string') return content;
  
  console.log(`Processing images for exam ID: ${examId}`);
  
  // 複数のパターンを検出
  const patterns = [
    // <img src="%EXAM_IMAGE_PATH%/111A003.jpg">
    /<img\s+src="([^"]*%EXAM_IMAGE_PATH%[^"]+)"[^>]*>/g,
    // <img src="111A003.jpg">
    /<img\s+src="([^"]*\.(?:jpg|jpeg|png|gif))"[^>]*>/gi,
    // 直接ファイル名が書かれている場合
    /\b(\w+\.(?:jpg|jpeg|png|gif))\b/gi
  ];
  
  // Get folder name from exam ID (DR2401-001 -> DR2401)
  const folderName = examId.substring(0, 6);
  console.log(`Looking for images in folder: ${folderName}`);
  
  let processedContent = content;
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const [fullMatch, src] = match;
      console.log(`Found image reference: ${src}`);
      
      let fileName = src;
      
      // Extract filename from %EXAM_IMAGE_PATH% pattern
      if (src.includes('%EXAM_IMAGE_PATH%')) {
        fileName = src.replace('%EXAM_IMAGE_PATH%/', '').replace('%EXAM_IMAGE_PATH%\\', '');
      }
      
      // Skip if already processed or not an image file
      if (fileName.startsWith('/api/images') || fileName.startsWith('http') || fileName.startsWith('data:')) {
        continue;
      }
      
      try {
        console.log(`Processing image file: ${fileName}`);
        
        // Find image file ID in Google Drive
        const fileId = await findImageFileId(folderName, fileName, accessToken);
        
        if (fileId) {
          // Replace with proxy URL
          const proxyUrl = `/api/images?id=${fileId}`;
          const newImgTag = fullMatch.includes('<img') 
            ? `<img src="${proxyUrl}" alt="${fileName}" style="max-width: 100%; height: auto;">` 
            : `<img src="${proxyUrl}" alt="${fileName}" style="max-width: 100%; height: auto;">`;
          
          processedContent = processedContent.replace(fullMatch, newImgTag);
          console.log(`Replaced ${fileName} with proxy URL`);
        } else {
          // Image not found - show placeholder
          const placeholder = fullMatch.includes('<img')
            ? `<div style="border: 1px dashed #ccc; padding: 20px; text-align: center; color: #666;">画像ファイル: ${fileName}<br>(見つかりません)</div>`
            : `<div style="border: 1px dashed #ccc; padding: 10px; display: inline-block; color: #666;">${fileName} (画像なし)</div>`;
          
          processedContent = processedContent.replace(fullMatch, placeholder);
          console.log(`Image not found: ${fileName}`);
        }
      } catch (error) {
        console.error(`Error processing image ${fileName}:`, error);
        // Keep original on error
      }
    }
    // Reset regex lastIndex for next iteration
    pattern.lastIndex = 0;
  }
  
  return processedContent;
}

async function findImageFileId(folderName, fileName, accessToken) {
  try {
    console.log(`Searching for image: ${fileName} in folder: ${folderName}`);
    
    // Search for folder by name (with shared drive support)
    const folderQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;
    const folderSearchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=${encodeURIComponent('files(id,name)')}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    
    const folderResponse = await fetch(folderSearchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const folderData = await folderResponse.json();
    
    if (!folderData.files || folderData.files.length === 0) {
      console.log(`Folder not found: ${folderName}`);
      return null;
    }
    
    const folderId = folderData.files[0].id;
    
    // Search for file in folder (with shared drive support)
    const fileQuery = `'${folderId}' in parents and name='${fileName}'`;
    const fileSearchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=${encodeURIComponent('files(id,name)')}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    
    const fileResponse = await fetch(fileSearchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const fileData = await fileResponse.json();
    
    if (!fileData.files || fileData.files.length === 0) {
      console.log(`File not found: ${fileName} in ${folderName}`);
      return null;
    }
    
    return fileData.files[0].id;
    
  } catch (error) {
    console.error('Error finding image file ID:', error);
    return null;
  }
}