import { FileItem } from '../FileGrid';

// Levenshtein distance algorithm
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// N-gram matching
function getNgrams(text: string, n: number = 2): Set<string> {
  const ngrams = new Set<string>();
  const normalizedText = text.toLowerCase();
  
  for (let i = 0; i <= normalizedText.length - n; i++) {
    ngrams.add(normalizedText.slice(i, i + n));
  }
  
  return ngrams;
}

function ngramSimilarity(str1: string, str2: string, n: number = 2): number {
  const ngrams1 = getNgrams(str1, n);
  const ngrams2 = getNgrams(str2, n);
  
  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  
  return intersection.size / union.size;
}

// Extract filename from path
function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

// Extract file extension
function getFileExtension(path: string): string {
  const fileName = getFileName(path);
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

// Fuzzy match scoring interface
interface FuzzyScore {
  item: FileItem;
  score: number;
  matchType: string[];
}

// Main fuzzy search function
export function fuzzySearchFiles(files: FileItem[], query: string, threshold: number = 0.3): FileItem[] {
  if (!query || query.trim().length === 0) {
    return files;
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  const scores: FuzzyScore[] = [];
  
  for (const file of files) {
    const fileName = getFileName(file.key).toLowerCase();
    const fileExtension = getFileExtension(file.key);
    const fullPath = file.key.toLowerCase();
    
    let score = 0;
    const matchTypes: string[] = [];
    
    // 1. Exact match gets highest score
    if (fileName === normalizedQuery) {
      score += 1.0;
      matchTypes.push('exact');
    }
    
    // 2. Starts with match
    if (fileName.startsWith(normalizedQuery)) {
      score += 0.9;
      matchTypes.push('prefix');
    }
    
    // 3. Contains match (substring)
    if (fileName.includes(normalizedQuery)) {
      score += 0.8;
      matchTypes.push('substring');
    }
    
    // 4. Extension match
    if (fileExtension === normalizedQuery) {
      score += 0.7;
      matchTypes.push('extension');
    }
    
    // 5. Path contains query
    if (fullPath.includes(normalizedQuery)) {
      score += 0.6;
      matchTypes.push('path');
    }
    
    // 6. N-gram similarity
    const ngramScore = ngramSimilarity(fileName, normalizedQuery);
    if (ngramScore > threshold) {
      score += ngramScore * 0.5;
      matchTypes.push('ngram');
    }
    
    // 7. Levenshtein distance (for typo tolerance)
    const maxDistance = Math.max(fileName.length, normalizedQuery.length);
    if (maxDistance > 0) {
      const distance = levenshteinDistance(fileName, normalizedQuery);
      const similarity = 1 - (distance / maxDistance);
      if (similarity > threshold) {
        score += similarity * 0.4;
        matchTypes.push('levenshtein');
      }
    }
    
    // 8. Word boundary matches (split by spaces, dots, underscores, hyphens)
    const fileWords = fileName.split(/[\s._-]+/).filter(word => word.length > 0);
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
    
    let wordMatches = 0;
    for (const queryWord of queryWords) {
      for (const fileWord of fileWords) {
        if (fileWord.includes(queryWord) || queryWord.includes(fileWord)) {
          wordMatches++;
          break;
        }
      }
    }
    
    if (wordMatches > 0 && queryWords.length > 0) {
      const wordScore = wordMatches / queryWords.length;
      score += wordScore * 0.3;
      matchTypes.push('words');
    }
    
    // 9. Acronym matching (first letters of words)
    const fileAcronym = fileWords.map(word => word[0]).join('');
    if (fileAcronym.includes(normalizedQuery) || normalizedQuery.includes(fileAcronym)) {
      score += 0.2;
      matchTypes.push('acronym');
    }
    
    // Only include files with some match
    if (score > 0 || matchTypes.length > 0) {
      scores.push({
        item: file,
        score,
        matchType: matchTypes
      });
    }
  }
  
  // Sort by score (highest first) and return files
  scores.sort((a, b) => b.score - a.score);
  
  // Debug logging
  if (scores.length > 0) {
    console.log(`Fuzzy search for "${query}" found ${scores.length} matches:`);
    scores.slice(0, 5).forEach(({ item, score, matchType }) => {
      console.log(`  ${getFileName(item.key)} (score: ${score.toFixed(3)}, types: ${matchType.join(', ')})`);
    });
  }
  
  return scores.map(s => s.item);
}

// Simple search fallback (for performance)
export function simpleSearch(files: FileItem[], query: string): FileItem[] {
  if (!query || query.trim().length === 0) {
    return files;
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return files.filter(file => {
    const fileName = getFileName(file.key).toLowerCase();
    const fullPath = file.key.toLowerCase();
    
    return fileName.includes(normalizedQuery) || 
           fullPath.includes(normalizedQuery) ||
           getFileExtension(file.key) === normalizedQuery;
  });
}

// Enhanced search that combines both approaches
export function enhancedSearch(files: FileItem[], query: string, useFuzzy: boolean = true): FileItem[] {
  if (!query || query.trim().length === 0) {
    return files;
  }
  
  // For very long queries or many files, use simple search for performance
  if (query.length > 50 || files.length > 1000) {
    return simpleSearch(files, query);
  }
  
  if (useFuzzy) {
    return fuzzySearchFiles(files, query);
  } else {
    return simpleSearch(files, query);
  }
}