import { verifyToken } from './auth.js';
import { corsHeaders } from '../utils/cors.js';

export async function handleImageProxy(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Verify authentication
    const userPayload = await verifyToken(request, env);
    
    // Get file ID from query parameters
    const url = new URL(request.url);
    let fileId = url.searchParams.get('id');
    const filename = url.searchParams.get('filename');
    
    if (!fileId && !filename) {
      return new Response('File ID or filename is required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // If filename provided, search for file by name
    if (filename && !fileId) {
      fileId = await findFileByName(filename, userPayload.access_token);
      if (!fileId) {
        return new Response('Image file not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }
    }
    
    // Check KV cache first
    const cacheKey = `img:${fileId}`;
    const cached = await env.IMAGE_CACHE.get(cacheKey, 'arrayBuffer');
    
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': 'image/jpeg', // Default, will be overridden if we have metadata
          'Cache-Control': 'public, max-age=86400',
          ...corsHeaders
        }
      });
    }
    
    // Fetch from Google Drive
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const response = await fetch(driveUrl, {
      headers: {
        'Authorization': `Bearer ${userPayload.access_token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return new Response('Image not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }
      throw new Error(`Drive API error: ${response.status} ${response.statusText}`);
    }
    
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    
    // Cache image for 24 hours (only if it's not too large)
    if (imageData.byteLength < 1024 * 1024) { // < 1MB
      try {
        await env.IMAGE_CACHE.put(cacheKey, imageData, {
          expirationTtl: 86400,
          metadata: { contentType }
        });
      } catch (error) {
        console.warn('Failed to cache image:', error);
      }
    }
    
    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Return a placeholder image or error response
    return new Response('Image unavailable', {
      status: 500,
      headers: corsHeaders
    });
  }
}

async function findFileByName(filename, accessToken) {
  try {
    // Google Drive APIでファイル名で検索
    const searchQuery = encodeURIComponent(`name='${filename}'`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name)`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error('Drive search error:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for file:', error);
    return null;
  }
}