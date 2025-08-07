import { verifyToken } from './auth.js';
import { IndexedSearchDB } from '../utils/indexed-search.js';
import { corsHeaders } from '../utils/cors.js';

export async function handleSearch(request, env) {
  if (request.method !== 'POST') {
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
    
    // Parse search parameters
    const params = await request.json();
    
    // Create cache key (sanitized for URI safety)
    const paramStr = JSON.stringify(params);
    const sanitizedParams = btoa(String.fromCharCode(...new TextEncoder().encode(paramStr)));
    const cacheKey = `search:${sanitizedParams}:${btoa(String.fromCharCode(...new TextEncoder().encode(userPayload.email)))}`;
    
    // Check KV cache (temporarily disabled to test fixes)
    // const cached = await env.EXAM_CACHE.get(cacheKey, 'json');
    // if (cached) {
    //   console.log('Returning cached results');
    //   return new Response(JSON.stringify(cached), {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'X-Cache-Hit': 'true',
    //       ...corsHeaders
    //     }
    //   });
    // }
    
    console.log('Fetching from Google Drive with params:', JSON.stringify(params));
    console.log('Using folder ID:', env.GOOGLE_DRIVE_FOLDER_ID);
    
    try {
      // Initialize Indexed Search DB
      const searchDB = new IndexedSearchDB(
        userPayload.access_token,
        env.GOOGLE_DRIVE_FOLDER_ID
      );
      
      // Perform fast indexed search
      const results = await searchDB.fastSearch(params, env, userPayload.email);
      console.log('Search completed, found:', results.total, 'results in', results.searchTime, 'ms');
      
      // Debug: Log first result to check for problematic characters
      if (results.results && results.results.length > 0) {
        const firstResult = results.results[0];
        console.log('🔍 Debugging first result:');
        console.log('  - Preview:', firstResult.preview?.substring(0, 100));
        console.log('  - QuestionText:', firstResult.questionText?.substring(0, 100));
        
        // Check for problematic patterns in all string fields
        const problematicFields = [];
        Object.keys(firstResult).forEach(key => {
          if (typeof firstResult[key] === 'string' && firstResult[key].includes('%')) {
            if (firstResult[key].includes('%EXAM_IMAGE_PATH%') || firstResult[key].match(/%(?![0-9A-Fa-f]{2})/)) {
              problematicFields.push(`${key}: ${firstResult[key].substring(0, 100)}`);
            }
          }
        });
        
        if (problematicFields.length > 0) {
          console.error('🚨 Found problematic % characters in fields:');
          problematicFields.forEach(field => console.error('   ', field));
        } else {
          console.log('✅ No problematic % characters found in first result');
        }
      }
      
      // Cache results for shorter time since search is now fast
      await env.EXAM_CACHE.put(cacheKey, JSON.stringify(results), {
        expirationTtl: 1800 // 30分
      });
      
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'false',
          'X-Search-Time': results.searchTime + 'ms',
          ...corsHeaders
        }
      });
    } catch (driveError) {
      console.error('Drive search error:', driveError);
      // Return empty results instead of error to avoid breaking the UI
      return new Response(JSON.stringify({
        results: [],
        total: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        totalPages: 0,
        error: driveError.message
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Cache results for 1 hour (removed - already returned above)
    
    // Save search history if keyword provided
    if (params.keyword && params.keyword.trim()) {
      const historyKey = `history:${userPayload.email}`;
      let history = await env.SESSION_STORE.get(historyKey, 'json') || [];
      
      // Remove duplicate and add to front
      history = history.filter(h => h.keyword !== params.keyword);
      history.unshift({
        keyword: params.keyword,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 20 searches
      history = history.slice(0, 20);
      
      await env.SESSION_STORE.put(historyKey, JSON.stringify(history), {
        expirationTtl: 86400 * 30 // 30 days
      });
    }
    
    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ 
      error: 'Search failed',
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