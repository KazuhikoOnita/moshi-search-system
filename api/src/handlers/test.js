import { verifyToken } from './auth.js';
import { corsHeaders } from '../utils/cors.js';

export async function handleTest(request, env) {
  try {
    // Verify authentication
    const userPayload = await verifyToken(request, env);
    
    console.log('Test endpoint called by:', userPayload.email);
    console.log('Environment variables check:');
    console.log('- GOOGLE_DRIVE_FOLDER_ID:', env.GOOGLE_DRIVE_FOLDER_ID ? 'Set' : 'Not set');
    console.log('- ALLOWED_DOMAIN:', env.ALLOWED_DOMAIN);
    
    // Test Google Drive API access (with shared drive support)
    const testUrl = `https://www.googleapis.com/drive/v3/files?q='${env.GOOGLE_DRIVE_FOLDER_ID}' in parents&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    
    console.log('Testing Drive API with URL:', testUrl);
    
    const driveResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${userPayload.access_token}`
      }
    });
    
    console.log('Drive API response status:', driveResponse.status);
    
    const responseData = await driveResponse.json();
    
    if (!driveResponse.ok) {
      console.error('Drive API error:', responseData);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Drive API error',
        error: responseData,
        statusCode: driveResponse.status
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify({
      status: 'success',
      user: userPayload.email,
      environment: {
        folderIdSet: !!env.GOOGLE_DRIVE_FOLDER_ID,
        allowedDomain: env.ALLOWED_DOMAIN
      },
      driveAccess: {
        status: driveResponse.status,
        filesFound: responseData.files?.length || 0,
        files: responseData.files?.map(f => ({ id: f.id, name: f.name })) || []
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}