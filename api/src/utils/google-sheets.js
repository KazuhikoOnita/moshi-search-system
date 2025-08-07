export class GoogleSheetsDB {
  constructor(accessToken, spreadsheetId) {
    this.accessToken = accessToken;
    this.spreadsheetId = spreadsheetId;
    this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  }
  
  async searchExams(params) {
    try {
      // Get all data from spreadsheet
      const range = 'A1:Z10000'; // Adjust range as needed
      const url = `${this.baseUrl}/values/${range}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Sheets API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const rows = data.values;
      
      if (!rows || rows.length < 2) {
        return {
          results: [],
          total: 0,
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          totalPages: 0
        };
      }
      
      return this.parseAndFilter(rows, params);
      
    } catch (error) {
      console.error('Google Sheets error:', error);
      throw error;
    }
  }
  
  async getExamDetail(examId) {
    try {
      // Get all data from spreadsheet
      const range = 'A1:Z10000';
      const url = `${this.baseUrl}/values/${range}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Sheets API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const rows = data.values;
      
      if (!rows || rows.length < 2) {
        return null;
      }
      
      const headers = rows[0];
      
      // Find the row with matching exam ID
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] === examId) {
          return this.rowToExam(row, headers, i + 1);
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Get exam detail error:', error);
      throw error;
    }
  }
  
  parseAndFilter(rows, params) {
    const headers = rows[0];
    const exams = [];
    
    // Parse each row into exam object
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; // Skip empty rows
      
      const exam = this.rowToExam(row, headers, i + 1);
      if (exam && this.matchesFilter(exam, params)) {
        exams.push(exam);
      }
    }
    
    // Sort by relevance or year (descending)
    exams.sort((a, b) => {
      if (params.keyword) {
        // Sort by relevance when keyword search
        const aRelevance = this.calculateRelevance(a, params.keyword);
        const bRelevance = this.calculateRelevance(b, params.keyword);
        if (aRelevance !== bRelevance) return bRelevance - aRelevance;
      }
      return b.year - a.year; // Then by year
    });
    
    // Apply pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      results: exams.slice(startIndex, endIndex),
      total: exams.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(exams.length / pageSize)
    };
  }
  
  rowToExam(row, headers, rowNumber) {
    const exam = {
      id: '',
      fileName: '',
      rowNumber: rowNumber,
      year: 2024,
      subject: '',
      unit: '',
      difficulty: 3,
      answerRate: 50,
      hasImage: false,
      choices: [],
      title: '',
      questionText: '',
      preview: '',
      tags: [],
      keywords: '',
      diagnosis: '',
      answer: '',
      explanation: ''
    };
    
    headers.forEach((header, index) => {
      const value = row[index];
      if (!value) return;
      
      switch(header) {
        case '問題ID':
          exam.id = value;
          // Extract year from ID (DR2401 -> 2024)
          const yearMatch = value.match(/DR(\d{2})/);
          if (yearMatch) {
            exam.year = 2000 + parseInt(yearMatch[1]);
          }
          break;
          
        case '問題タイトル':
          exam.title = value;
          break;
          
        case '問題文':
          exam.questionText = value;
          exam.preview = String(value).replace(/<[^>]*>/g, '').substring(0, 200) + '...';
          if (String(value).includes('<img') || String(value).includes('EXAM_IMAGE_PATH') || String(value).includes('%EXAM_IMAGE_PATH%')) {
            exam.hasImage = true;
          }
          break;
          
        case '分野':
          exam.subjectCode = value;
          exam.subject = this.getSubjectFromCode(value);
          break;
          
        case 'KEYWORD':
          exam.keywords = value;
          if (value) {
            exam.tags = String(value).split(',').map(tag => tag.trim()).filter(tag => tag);
          }
          break;
          
        case '診断':
          exam.diagnosis = value;
          break;
          
        case '正答選択肢':
          exam.answer = value;
          break;
          
        case '解法の要点':
          exam.explanation = value;
          break;
      }
      
      // Handle choices A-E
      if (header.match(/^選択肢[A-E]$/)) {
        const choiceLabel = header.replace('選択肢', '');
        if (value) {
          exam.choices.push({
            label: choiceLabel,
            text: value
          });
        }
      }
    });
    
    // Set defaults
    if (!exam.title) exam.title = exam.id;
    if (!exam.tags.length) exam.tags = [exam.subject];
    
    return exam;
  }
  
  getSubjectFromCode(code) {
    const codeNum = parseInt(code);
    if (codeNum >= 1 && codeNum <= 6) return '内科';
    if (codeNum >= 7 && codeNum <= 9) return '外科';
    if (codeNum >= 10 && codeNum <= 12) return '小児科';
    if (codeNum >= 13 && codeNum <= 15) return '産婦人科';
    if (codeNum >= 16 && codeNum <= 18) return '精神科';
    if (codeNum >= 19 && codeNum <= 21) return '公衆衛生';
    return '総合';
  }
  
  matchesFilter(exam, params) {
    // Keyword filter
    if (params.keyword) {
      if (!this.matchKeyword(exam, params.keyword)) {
        return false;
      }
    }
    
    // Year filter
    if (params.yearFrom && exam.year < parseInt(params.yearFrom)) {
      return false;
    }
    if (params.yearTo && exam.year > parseInt(params.yearTo)) {
      return false;
    }
    
    // Subject filter
    if (params.subjects && params.subjects.length > 0) {
      if (!params.subjects.includes(exam.subject)) {
        return false;
      }
    }
    
    // Difficulty filter
    if (params.difficultyMin && exam.difficulty < parseInt(params.difficultyMin)) {
      return false;
    }
    if (params.difficultyMax && exam.difficulty > parseInt(params.difficultyMax)) {
      return false;
    }
    
    // Answer rate filter
    if (params.answerRateMin && exam.answerRate < parseInt(params.answerRateMin)) {
      return false;
    }
    if (params.answerRateMax && exam.answerRate > parseInt(params.answerRateMax)) {
      return false;
    }
    
    return true;
  }
  
  matchKeyword(exam, keyword) {
    const searchTerm = keyword.toLowerCase();
    const searchFields = [
      exam.title,
      exam.questionText,
      exam.keywords,
      exam.subject,
      exam.unit,
      exam.id,
      ...exam.tags
    ].filter(field => field).join(' ').toLowerCase();
    
    return searchFields.includes(searchTerm);
  }
  
  calculateRelevance(exam, keyword) {
    const searchTerm = keyword.toLowerCase();
    let score = 0;
    
    // Title match (highest priority)
    if (exam.title.toLowerCase().includes(searchTerm)) {
      score += 10;
    }
    
    // Keywords match
    if (exam.keywords.toLowerCase().includes(searchTerm)) {
      score += 5;
    }
    
    // Subject match
    if (exam.subject.toLowerCase().includes(searchTerm)) {
      score += 3;
    }
    
    // Question text match
    if (exam.questionText.toLowerCase().includes(searchTerm)) {
      score += 2;
    }
    
    // Tags match
    for (const tag of exam.tags) {
      if (tag.toLowerCase().includes(searchTerm)) {
        score += 1;
      }
    }
    
    return score;
  }
}