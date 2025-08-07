import { verifyToken } from './auth.js';
import { IndexedSearchDB } from '../utils/indexed-search.js';
import { corsHeaders } from '../utils/cors.js';

export async function handleRebuildIndex(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Verify authentication
    const userPayload = await verifyToken(request, env);
    
    console.log('Rebuilding search index for:', userPayload.email);
    
    // Initialize Indexed Search DB
    const searchDB = new IndexedSearchDB(
      userPayload.access_token,
      env.GOOGLE_DRIVE_FOLDER_ID
    );
    
    // Force rebuild index
    const allExams = await searchDB.buildIndex(env, userPayload.email);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Index rebuilt successfully',
      examCount: allExams.length,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Rebuild index error:', error);
    return new Response(JSON.stringify({
      status: 'error',
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