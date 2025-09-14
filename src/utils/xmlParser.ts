// Utility for robust XML parsing and sanitization

export function sanitizeXmlText(text: string): string {
  // Replace invalid XML characters with their entity references
  return text
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Remove control characters except tab, newline, and carriage return
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function fixBrokenXml(xmlText: string): string {
  // Fix common XML parsing issues
  let fixed = xmlText;
  
  // Fix unclosed tags and malformed entities
  fixed = fixed.replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;');
  
  // Fix < and > that are not part of tags
  fixed = fixed.replace(/<(?![/\w])/g, '&lt;');
  fixed = fixed.replace(/(?<![/\w>])>/g, '&gt;');
  
  // Remove invalid characters
  // eslint-disable-next-line no-control-regex
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return fixed;
}

export function parseXmlSafely(xmlText: string): Document | null {
  const parser = new DOMParser();
  
  try {
    // First try with original XML
    let document = parser.parseFromString(xmlText, 'application/xml');
    let parserError = document.querySelector('parsererror');
    
    if (!parserError) {
      console.log('XML parsed successfully on first attempt');
      return document;
    }
    
    console.log('First XML parse attempt failed, trying with fixes...');
    
    // Try with sanitized XML
    const fixedXml = fixBrokenXml(xmlText);
    document = parser.parseFromString(fixedXml, 'application/xml');
    parserError = document.querySelector('parsererror');
    
    if (!parserError) {
      console.log('XML parsed successfully after sanitization');
      return document;
    }
    
    console.error('XML parsing failed even after sanitization');
    console.error('Parser error:', parserError?.textContent);
    
    return null;
  } catch (error) {
    console.error('Exception during XML parsing:', error);
    return null;
  }
}

// Fallback: Extract file information using regex when XML parsing fails
export function extractFileInfoFromXml(xmlText: string): Array<{
  href: string;
  contentType?: string;
  size?: string;
  lastModified?: string;
  thumbnail?: string;
}> {
  console.log('Using fallback regex extraction for file information');
  
  const files: Array<{
    href: string;
    contentType?: string;
    size?: string;
    lastModified?: string;
    thumbnail?: string;
  }> = [];
  
  // Regex to match response blocks
  const responseRegex = /<response>(.*?)<\/response>/gs;
  let responseMatch;
  
  while ((responseMatch = responseRegex.exec(xmlText)) !== null) {
    const responseContent = responseMatch[1];
    
    // Extract href
    const hrefMatch = /<href>(.*?)<\/href>/s.exec(responseContent);
    if (!hrefMatch) continue;
    
    const href = hrefMatch[1].trim();
    
    // Extract other properties
    const contentTypeMatch = /<getcontenttype>(.*?)<\/getcontenttype>/s.exec(responseContent);
    const sizeMatch = /<getcontentlength>(.*?)<\/getcontentlength>/s.exec(responseContent);
    const lastModifiedMatch = /<getlastmodified>(.*?)<\/getlastmodified>/s.exec(responseContent);
    const thumbnailMatch = /<fd:thumbnail>(.*?)<\/fd:thumbnail>/s.exec(responseContent);
    
    files.push({
      href,
      contentType: contentTypeMatch ? contentTypeMatch[1].trim() : undefined,
      size: sizeMatch ? sizeMatch[1].trim() : undefined,
      lastModified: lastModifiedMatch ? lastModifiedMatch[1].trim() : undefined,
      thumbnail: thumbnailMatch ? thumbnailMatch[1].trim() : undefined,
    });
  }
  
  console.log(`Extracted ${files.length} files using regex fallback`);
  return files;
}

// Debug function to find problematic lines in XML
export function debugXmlIssues(xmlText: string): void {
  console.log('=== XML DEBUGGING ===');
  console.log(`XML length: ${xmlText.length} characters`);
  
  // Find lines around error line 802
  const lines = xmlText.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  if (lines.length > 800) {
    console.log('Lines around 800-805:');
    for (let i = 798; i <= 804 && i < lines.length; i++) {
      const line = lines[i];
      console.log(`Line ${i + 1}: "${line}"`);
      
      // Check for problematic characters
      const problematicChars = line.match(/[&<>"']/g);
      if (problematicChars) {
        console.log(`  Found potentially problematic characters: ${problematicChars.join(', ')}`);
      }
      
      // Check for unescaped ampersands
      const badAmpersands = line.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g);
      if (badAmpersands) {
        console.log(`  Found unescaped ampersands: ${badAmpersands.join(', ')}`);
      }
    }
  }
  
  // Look for overall patterns that might cause issues
  const unescapedAmpersands = (xmlText.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g) || []).length;
  const unescapedLessThan = (xmlText.match(/<(?![/\w!?])/g) || []).length;
  
  console.log(`Total unescaped ampersands: ${unescapedAmpersands}`);
  console.log(`Total unescaped < characters: ${unescapedLessThan}`);
  
  // Sample some file names that might be problematic
  const hrefMatches = xmlText.match(/<href>([^<]+)<\/href>/g);
  if (hrefMatches) {
    console.log('Sample file paths (first 10):');
    hrefMatches.slice(0, 10).forEach((match, index) => {
      const path = match.replace(/<\/?href>/g, '');
      console.log(`  ${index + 1}. "${path}"`);
    });
  }
  
  console.log('=== END XML DEBUGGING ===');
}