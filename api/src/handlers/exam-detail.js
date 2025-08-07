import { verifyToken } from './auth.js';
import { corsHeaders } from '../utils/cors.js';
import { IndexedSearchDB } from '../utils/indexed-search.js';

export async function handleExamDetail(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Verify authentication (skip in development)
    let userPayload;
    try {
      userPayload = await verifyToken(request, env);
    } catch (authError) {
      // In development, allow unauthenticated requests
      if (env.ENVIRONMENT !== 'production') {
        console.warn('Development mode: skipping authentication');
        userPayload = { access_token: 'dev-token' };
      } else {
        throw authError;
      }
    }
    
    // Extract exam ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const examId = pathParts[pathParts.length - 1];
    
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
    
    console.log('Fetching exam detail for ID:', examId);
    
    // Check cache first
    const cacheKey = `exam_detail:${examId}:${btoa(userPayload.email)}`;
    const cached = await env.EXAM_CACHE.get(cacheKey, 'json');
    if (cached) {
      console.log('Returning cached exam detail');
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'true',
          ...corsHeaders
        }
      });
    }
    
    // Initialize Indexed Search DB
    const searchDB = new IndexedSearchDB(
      userPayload.access_token,
      env.GOOGLE_DRIVE_FOLDER_ID
    );
    
    // Get or build index
    const allExams = await searchDB.getOrBuildIndex(env, userPayload.email);
    
    // Find the specific exam
    const exam = allExams.find(e => e.id === examId);
    
    if (!exam) {
      return new Response(JSON.stringify({ 
        error: 'Exam not found',
        examId: examId
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Cache the result for 1 hour
    await env.EXAM_CACHE.put(cacheKey, JSON.stringify(exam), {
      expirationTtl: 3600
    });
    
    return new Response(JSON.stringify(exam), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Exam detail error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch exam detail',
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