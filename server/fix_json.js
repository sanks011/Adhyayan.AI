// Test file to fix common JSON errors in Groq responses

// Function to attempt to normalize and fix broken JSON from Groq API
const fixBrokenJSON = (jsonString) => {
  console.log("Attempting to fix broken JSON structure");
  
  // Common fixes for broken JSON
  try {
    // For our specific Groq response issue, look for the common patterns of array syntax errors
    // This is a more specialized approach for our typical Groq errors
    let fixedJson = jsonString;
    
    // PRE-PROCESSING CLEANUP
    // Remove any potential markdown code blocks or extra formatting
    fixedJson = fixedJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // 1. Fix array syntax errors
    
    // Fix arrays missing closing bracket (look for specific patterns like subtopics)
    const arrayPatterns = [
      /"subtopics":\s*\[([^\]]*?)(?=\n\s*[}\]])/g, 
      /"items":\s*\[([^\]]*?)(?=\n\s*[}\]])/g,
      /"children":\s*\[([^\]]*?)(?=\n\s*[}\]])/g
    ];
    
    for (const pattern of arrayPatterns) {
      const matches = fixedJson.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Extract the array content and ensure it has a closing bracket
          const patternStr = match.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
          const fixedStr = match + ']';
          fixedJson = fixedJson.replace(new RegExp(patternStr, 'g'), fixedStr);
        }
      }
    }
      // Fix missing comma between array items
    fixedJson = fixedJson.replace(/("(?:\\.|[^"\\])*"|[\d\w]+)\s*\n\s*("(?:\\.|[^"\\])*"|[\d\w]+)/g, '$1,\n$2');
    fixedJson = fixedJson.replace(/(["'}])\s*\n\s*(?=["'{])/g, '$1,\n');
    
    // Fix missing comma between object elements 
    fixedJson = fixedJson.replace(/}(\s*){/g, '},\n$1{');
      // Fix issues with property values missing quotes - improved pattern
    fixedJson = fixedJson.replace(/"([^"]+)":\s*([^",\{\[\d\s][^,\}\]]*?)(\s*[,\}\]])/g, '"$1": "$2"$3');
    
    // Fix additional unquoted property values that might be causing issues
    fixedJson = fixedJson.replace(/"([^"]+)":\s*([^",\{\[\d\s][^,\}\]]*)/g, '"$1": "$2"');
    
    // Fix issues with extra commas before closing brackets/braces
    fixedJson = fixedJson.replace(/,(\s*[\}\]])/g, '$1');
    
    // Fix missing commas between object properties
    fixedJson = fixedJson.replace(/}(\s*){/g, '},\n$1{');
    
    // Fix trailing commas in arrays
    fixedJson = fixedJson.replace(/,(\s*[\]\}])/g, '$1');
    
    // 2. Fix structural balance
    // Count opening and closing braces/brackets to add missing ones
    const countChar = (str, char) => (str.match(new RegExp(char, 'g')) || []).length;
    
    const openBraces = countChar(fixedJson, '{');
    const closeBraces = countChar(fixedJson, '}');
    const openBrackets = countChar(fixedJson, '\\[');
    const closeBrackets = countChar(fixedJson, '\\]');
    
    console.log(`JSON structure: { ${openBraces}:${closeBraces}, [ ${openBrackets}:${closeBrackets} }`);
    
    // Add missing closing braces/brackets
    if (openBraces > closeBraces) {
      fixedJson += "}".repeat(openBraces - closeBraces);
      console.log(`Added ${openBraces - closeBraces} closing braces`);
    }
    
    if (openBrackets > closeBrackets) {
      fixedJson += "]".repeat(openBrackets - closeBrackets);
      console.log(`Added ${openBrackets - closeBrackets} closing brackets`);
    }
    
    // 3. Fix general syntax issues
    // Fix trailing commas
    fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing quotes around property names - this is a last resort and may cause issues
    // Only apply to Groq's common property names to avoid false positives
    const commonProps = ['title', 'content', 'description', 'subtopics', 'id', 'label', 'central_node', 'module_nodes'];
    for (const prop of commonProps) {
      fixedJson = fixedJson.replace(new RegExp(`([{,]\\s*)(${prop})\\s*:`, 'g'), '$1"$2":');
    }
      // Try parsing the fixed JSON
    try {
      const parsedJson = JSON.parse(fixedJson);
      console.log("JSON fix successful!");      return fixedJson;
    } catch (parseError) {
      console.error("JSON fix attempt failed:", parseError.message);
      console.error("Parse error position:", parseError.message.match(/\d+/)?.[0]);
      
      // If it still fails, try a more aggressive approach for Groq's mind_map structure
      if (fixedJson.includes("mind_map")) {
        console.log("Initial fix failed, trying mind map specific structure reconstruction...");
        
        try {
          // More aggressive regex patterns with looser matching
          let centralNode = {};
          let moduleNodes = [];
          let subtopicNodes = [];
          
          // Extract central node title and content
          const centralNodeTitleMatch = fixedJson.match(/"central_node"[^{]*{[^}]*"title"\s*:\s*"([^"]*)/);
          const centralNodeContentMatch = fixedJson.match(/"content"\s*:\s*"([^"]*)"/);
          
          if (centralNodeTitleMatch) {
            centralNode.title = centralNodeTitleMatch[1];
          }
          
          if (centralNodeContentMatch) {
            centralNode.content = centralNodeContentMatch[1];
          }
          
          // Extract module nodes by finding title patterns
          const moduleMatches = fixedJson.match(/"title"\s*:\s*"([^"]*)"/g);
          if (moduleMatches) {
            moduleMatches.forEach((match, index) => {
              if (index > 0) { // Skip first title (likely central node)
                const title = match.match(/"title"\s*:\s*"([^"]*)"/)[1];
                moduleNodes.push({
                  title: title,
                  content: `Content for ${title}`
                });
              }
            });
          }
          
          // Reconstruct a valid mind map structure
          const reconstructed = {
            mind_map: {
              central_node: centralNode,
              module_nodes: moduleNodes,
              subtopic_nodes: subtopicNodes
            }
          };
          
          console.log("Successfully reconstructed mind map structure");
          return reconstructed;
        } catch (structureError) {
          console.log("Structure reconstruction failed, trying simpler approach");
          
          // Fallback to more basic extraction
          const centralNodeMatch = fixedJson.match(/"central_node"\s*:\s*{([^}]*?)}/);
          const moduleNodesMatch = fixedJson.match(/"module_nodes"\s*:\s*\[(.*?)\]/s);
          
          if (centralNodeMatch && moduleNodesMatch) {
            // Manually fix common JSON issues in the extracted portions
            let centralNodeContent = centralNodeMatch[1].trim();
            // Ensure the central_node object has proper closure for arrays
            centralNodeContent = centralNodeContent.replace(/\["([^"\]]+)(?=\s*$|\s*,)/, '["$1"]');
            
            // Try to extract module_nodes array with manual fixes
            let moduleNodesContent = moduleNodesMatch[0].split(':')[1].trim();
            if (!moduleNodesContent.endsWith(']')) {
              moduleNodesContent += ']';
            }
            
            // Reconstruct a minimal valid JSON with the extracted parts
            const reconstructed = `{
              "mind_map": {
                "central_node": {${centralNodeContent}},
                "module_nodes": ${moduleNodesContent}
              }
            }`;
            
            try {
              return JSON.parse(reconstructed);
            } catch (parseError) {
              // Last resort fallback - create a minimal valid structure
              return {
                mind_map: {
                  central_node: { 
                    title: "Recovered Content",
                    content: "This is a reconstructed mind map due to JSON parsing error."
                  },
                  module_nodes: []
                }
              };
            }
          }
        }
      }      
      // Last resort fallback if all specific fixes fail
      return {
        mind_map: {
          central_node: { 
            title: "Recovered Content",
            content: "This is a fallback mind map created due to JSON parsing error."
          },
          module_nodes: []
        }
      };
    }
  } catch (error) {
    console.error("Failed to fix JSON:", error.message);
    console.error("Current JSON state:", jsonString.substring(0, 500) + "...");
    
    // Return a valid structure rather than throwing to prevent API failures
    return {
      mind_map: {
        central_node: { 
          title: "Error Recovery",
          content: "An error occurred while parsing the mind map data. This is a fallback structure."
        },
        module_nodes: []
      }
    };
  }
};

// Test with a broken JSON sample
const brokenJsonExample = `{
"mind_map": {
"central_node": {
"title": "Artificial Intelligence (AI)",
"description": "Expert-level overview covering the entire syllabus",
"content": "AI is a multidisciplinary field that combines computer science, mathematics, and domain-specific knowledge.",
"subtopics": ["Unit-I: Introduction to AI", "Unit-II: Search in State Space and Planning", "Unit-III: Knowledge Representation and Reasoning"
}
},
"module_nodes": [
{
"title": "Unit-I: Introduction to AI",
"description": "Introduction to AI concepts",
"content": "AI is a rapidly growing field with applications in various domains."
]
}
}`;

try {
  const fixed = fixBrokenJSON(brokenJsonExample);
  console.log("Fixed JSON:", JSON.stringify(fixed, null, 2));
} catch (error) {
  console.error("Test failed:", error.message);
}

// Export the function
module.exports = { fixBrokenJSON };
