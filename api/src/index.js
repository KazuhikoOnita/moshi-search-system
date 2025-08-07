import { handleAuth } from './handlers/auth.js';
import { handleSearch } from './handlers/search.js';
import { handleExamDetail } from './handlers/exam.js';
import { handleExamDetail as handleExamDetailById } from './handlers/exam-detail.js';
import { handleImageProxy } from './handlers/proxy.js';
import { handleTest } from './handlers/test.js';
import { handleRebuildIndex } from './handlers/rebuild-index.js';
import { corsHeaders, handleCors } from './utils/cors.js';

export default {
  async fetch(request, env, ctx) {
    // Enable console logging
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
    
    // CORS preflight request
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      console.log('Processing path:', path);

      // API routes
      if (path.startsWith('/api/')) {
        const apiPath = path.replace('/api', '');
        
        // Handle dynamic exam detail route
        if (apiPath.match(/^\/exam\/[^\/]+$/)) {
          return await handleExamDetailById(request, env);
        }
        
        switch (apiPath) {
          case '/auth/google':
            return await handleAuth(request, env);
            
          case '/auth/callback':
            return await handleAuth(request, env, 'callback');
            
          case '/search':
            return await handleSearch(request, env);
            
          case '/exam':
            return await handleExamDetail(request, env);
            
          case '/images':
            return await handleImageProxy(request, env);
            
          case '/test':
            return await handleTest(request, env);
            
          case '/rebuild-index':
            return await handleRebuildIndex(request, env);
            
          default:
            return new Response('Not Found', { 
              status: 404,
              headers: corsHeaders 
            });
        }
      }

      // Root path - redirect to frontend
      if (path === '/') {
        const frontendUrl = url.origin.includes('localhost') 
          ? 'http://localhost:5173' 
          : 'https://moshi-search.pages.dev';
        return Response.redirect(frontendUrl, 302);
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
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
};