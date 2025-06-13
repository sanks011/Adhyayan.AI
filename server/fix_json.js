// Test file to fix common JSON errors in Groq responses

// Function to attempt to normalize and fix broken JSON from Groq API
const fixBrokenJSON = (jsonString) => {
  console.log("Attempting to fix broken JSON structure");
  
  // Common fixes for broken JSON
  try {
    // Pre-processing: Strip any markdown formatting or comments
    let fixedJson = jsonString
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\/\/.*$/gm, '') // Remove any JS-style comments
      .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes with straight quotes
      .replace(/[\u2018\u2019]/g, "'"); // Replace curly apostrophes
      
    console.log("Pre-processed JSON length:", fixedJson.length);
    
    // PHASE 1: Basic syntax fixes
    
    // Check if the response starts with text rather than JSON
    if (fixedJson.trim().startsWith('Here is') || fixedJson.trim().startsWith('The mind map') || 
        !fixedJson.trim().startsWith('{')) {
      // Try to find JSON structure in the text
      const jsonMatch = fixedJson.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        fixedJson = jsonMatch[1];
        console.log("Extracted JSON structure from text response");
      } else {
        console.warn("Response appears to be text, not JSON. Proceeding with advanced reconstruction.");
      }
    }
    
    // Fix common JSON syntax errors
    fixedJson = fixedJson
      // Fix missing quotes around property names for common mind map properties (expanded)
      .replace(/([{,]\s*)(title|content|description|subtopics|sub_subtopics|sub_topics|sub_sub_subtopics|sub_sub_sub_subtopics|nested_topics|children|mind_map|central_node|module_nodes|units|main_subject|parsed_structure)\s*:/g, '$1"$2":')
      // Fix missing commas between properties
      .replace(/"\s*}\s*"/g, '", "')
      // Fix missing commas between array items
      .replace(/"\s*\[\s*"/g, '", ["')
      // Fix unquoted values (that aren't numbers, true, false, null, or objects/arrays)
      .replace(/:(\s*)([^"{}\[\],\s][^,}\]]*?)(\s*[},\]])/g, ': "$2"$3')
      // Remove trailing commas in arrays and objects
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between objects in array
      .replace(/}(\s*){/g, '},\n$1{')
      // Fix unclosed quotes in object values
      .replace(/:(\s*)"([^"]*?)(\s*[},])/g, ': "$2"$3')
      // Fix quoted booleans/nulls
      .replace(/:\s*"(true|false|null)"/g, ': $1');
    
    // Fix issues with multi-level nested structures - supporting deeper nesting levels
    fixedJson = fixedJson
      // Handle any level of subtopic nesting
      .replace(/"(sub_?)+subtopics"\s*:\s*([^[])/g, '"$1subtopics": [$2')
      .replace(/"(sub_?)+topics"\s*:\s*([^[])/g, '"$1topics": [$2')
      .replace(/"(sub_?)+nodes"\s*:\s*([^[])/g, '"$1nodes": [$2')
      .replace(/"children"\s*:\s*([^[])/g, '"children": [$1')
      .replace(/"nested_topics"\s*:\s*([^[])/g, '"nested_topics": [$1')
      // Fix issues with hanging arrays
      .replace(/]([^,}\]]*?)}/g, ']}')
      // Fix issues with missing closing brackets in deeply nested structures
      .replace(/("(sub_?)+subtopics"\s*:\s*\[)([^]]*?)(\s*"title")/g, '$1$3],$4')
      // Fix common issue with extra commas after arrays
      .replace(/],\s*}/g, ']}')
      .replace(/],\s*]/g, ']]');
      // PHASE 2: Advanced syntax fixes for deeply nested structures
    
    // Fix issues with inconsistent naming patterns for nested subtopics
    const nestedSubtopicPatterns = [
      'subtopics', 'sub_subtopics', 'subSubtopics', 'sub_sub_subtopics',
      'subSubSubtopics', 'sub_sub_sub_subtopics', 'nested_topics', 'nested_subtopics',
      'children', 'child_topics', 'childTopics'
    ];
    
    // Generate a regex pattern to match all possible nested subtopic naming patterns
    const nestedPatternRegex = new RegExp(`"(${nestedSubtopicPatterns.join('|')})\\s*":\\s*\\[\\s*\\]`, 'g');
    
    // Fix empty arrays that should be objects
    fixedJson = fixedJson.replace(nestedPatternRegex, match => {
      return match.replace('[]', '[]'); // Simply preserve empty arrays
    });
      // PHASE 3: Structure balance
    
    // Count brackets to ensure they're balanced
    const countChar = (str, char) => (str.match(new RegExp(char, 'g')) || []).length;
    
    const openBraces = countChar(fixedJson, '{');
    const closeBraces = countChar(fixedJson, '}');
    const openBrackets = countChar(fixedJson, '\\[');
    const closeBrackets = countChar(fixedJson, '\\]');
    
    console.log(`JSON structure balance: { ${openBraces}:${closeBraces}, [ ${openBrackets}:${closeBrackets} }`);
    
    // Advanced balancing - track positions to close at the right places
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      // First do an analysis of the structure to understand the nesting
      const bracketMap = new Map();
      
      // First analyze proper JSON structure by finding all opening and closing brackets
      // and their positions to better understand the structure
      let tempStack = [];
      const chars = fixedJson.split('');
      
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === '{' || chars[i] === '[') {
          tempStack.push({ type: chars[i], index: i });
          bracketMap.set(i, { type: 'open', char: chars[i], matched: false });
        } else if (chars[i] === '}' || chars[i] === ']') {
          const expectedChar = chars[i] === '}' ? '{' : '[';
          const lastOpenIndex = [...tempStack].reverse().findIndex(item => item.type === expectedChar);
          
          if (lastOpenIndex !== -1) {
            const actualIndex = tempStack.length - 1 - lastOpenIndex;
            bracketMap.set(tempStack[actualIndex].index, { 
              type: 'open', 
              char: tempStack[actualIndex].type, 
              matched: true,
              closedAt: i 
            });
            bracketMap.set(i, { 
              type: 'close', 
              char: chars[i], 
              matched: true,
              openedAt: tempStack[actualIndex].index 
            });
            
            tempStack.splice(actualIndex, 1);
          } else {
            bracketMap.set(i, { type: 'close', char: chars[i], matched: false });
          }
        }
      }

      // Now proceed with the classic stack approach for fixing the imbalances
      const stack = [];
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === '{' || chars[i] === '[') {
          stack.push({ char: chars[i], index: i });
        } else if (chars[i] === '}' || chars[i] === ']') {
          // Check if we have a matching opening bracket
          if (stack.length > 0) {
            const last = stack[stack.length - 1];
            if ((last.char === '{' && chars[i] === '}') || 
                (last.char === '[' && chars[i] === ']')) {
              stack.pop();
            } else {
              console.warn(`Mismatched bracket at position ${i}: expected closing for ${last.char}, got ${chars[i]}`);
            }
          } else {
            console.warn(`Extra closing bracket ${chars[i]} at position ${i}`);
          }
        }
      }
      
      // If we still have unclosed brackets/braces, add them at appropriate positions
      if (stack.length > 0) {
        console.log(`Found ${stack.length} unclosed brackets/braces`);
        
        // Get the resulting JSON string
        fixedJson = chars.join('');
        
        // Add the corresponding closing brackets/braces
        // Since we're adding at the end, reverse the stack to close inner brackets first
        const closings = stack.reverse().map(item => {
          return item.char === '{' ? '}' : ']';
        });
        
        fixedJson += closings.join('');
      }
    }
    
    // PHASE 4: Try parsing the fixed JSON
    try {
      const parsedJson = JSON.parse(fixedJson);
      console.log("JSON fix successful!");
      return fixedJson;
    } catch (parseError) {
      console.error("Basic JSON fix failed:", parseError.message);
      
      // PHASE 4: Advanced reconstruction - try to extract the hierarchical structure
      try {
        // Extract as much information as possible
        const centralNode = {};
        
        // Extract central node title
        const titleMatch = fixedJson.match(/"title"\s*:\s*"([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          centralNode.title = titleMatch[1];
        } else {
          centralNode.title = "Unknown Subject";
        }
        
        // Extract central node content/description
        const contentMatch = fixedJson.match(/"content"\s*:\s*"([^"]+)"/);
        if (contentMatch && contentMatch[1]) {
          centralNode.content = contentMatch[1];
        } else {
          centralNode.description = `Mind map for ${centralNode.title}`;
        }
        
        // Extract topic titles for module nodes
        const moduleNodes = [];
        const topicMatches = fixedJson.matchAll(/"title"\s*:\s*"([^"]+)"/g);
        
        // Convert iterator to array and skip the first title (central node)
        const titles = Array.from(topicMatches).map(match => match[1]);
        
        // Skip the first match (usually the central node) and limit to about 8 modules
        const uniqueTitles = [...new Set(titles)];
        const moduleCount = Math.min(uniqueTitles.length - 1, 8);
        
        // Create module nodes from extracted titles
        for (let i = 1; i <= moduleCount; i++) {
          if (uniqueTitles[i]) {
            moduleNodes.push({
              title: uniqueTitles[i],
              content: `Content related to ${uniqueTitles[i]}`,
              subtopics: []
            });
          }
        }
        
        // Try to extract subtopics by looking for patterns in the JSON string
        for (let i = 0; i < moduleNodes.length; i++) {
          // Look for subtopic sections that might be related to this module
          const moduleTitle = moduleNodes[i].title;
          const subtopicRegex = new RegExp(`"title"\\s*:\\s*"${moduleTitle}"[^{]*?{[^}]*?"subtopics"\\s*:\\s*\\[(.*?)\\]`, 's');
          const subtopicMatch = fixedJson.match(subtopicRegex);
          
          if (subtopicMatch && subtopicMatch[1]) {
            // Extract subtopic titles using regex
            const subtopicTitles = subtopicMatch[1].match(/"title"\s*:\s*"([^"]+)"/g);
            
            if (subtopicTitles) {
              subtopicTitles.forEach(subtitleMatch => {
                const subtitle = subtitleMatch.match(/"title"\s*:\s*"([^"]+)"/)[1];
                moduleNodes[i].subtopics.push({
                  title: subtitle,
                  content: `Details about ${subtitle}`
                });
              });
            }
          }
        }
            // Create a valid structure based on the context of the original JSON
      let reconstructedStructure;
      
      // Check if the original JSON seems to be a parsed_structure or mind_map
      const isParsedStructure = jsonString.includes("parsed_structure") || 
                              jsonString.includes("main_subject") || 
                              jsonString.includes("units");
                              
      if (isParsedStructure) {
        reconstructedStructure = {
          parsed_structure: {
            main_subject: {
              title: centralNode.title || "Unknown Subject",
              description: centralNode.content || "Course overview"
            },
            units: moduleNodes.map(module => ({
              title: module.title,
              description: module.content || `Content for ${module.title}`,
              subtopics: module.subtopics || []
            }))
          }
        };
        console.log("Created reconstructed parsed structure with main subject and", 
                   reconstructedStructure.parsed_structure.units.length, "units");
      } else {
        // Default to mind map structure
        reconstructedStructure = {
          mind_map: {
            central_node: centralNode,
            module_nodes: moduleNodes.length > 0 ? moduleNodes : [
              { title: "Topic 1", content: "Content for Topic 1", subtopics: [] },
              { title: "Topic 2", content: "Content for Topic 2", subtopics: [] }
            ]
          }
        };
        console.log("Created reconstructed mind map with central node and", 
                   reconstructedStructure.mind_map.module_nodes.length, "module nodes");
      }
      
      return JSON.stringify(reconstructedStructure);
      } catch (reconstructionError) {
        console.error("Advanced reconstruction failed:", reconstructionError.message);
        
        // PHASE 5: Last resort - create a minimal valid structure
        const fallbackMindMap = {
          mind_map: {
            central_node: { 
              title: centralNode?.title || "Unknown Subject",
              content: "An error occurred while parsing the mind map data. This is a fallback structure.",
              description: "Fallback content"
            },
            module_nodes: [
              { title: "Topic 1", content: "Fallback content for Topic 1", subtopics: [] },
              { title: "Topic 2", content: "Fallback content for Topic 2", subtopics: [] }
            ]
          }
        };
        
        return JSON.stringify(fallbackMindMap);
      }
    }
  } catch (error) {
    console.error("Failed to fix JSON:", error.message);
    
    // Last resort fallback - always return a valid structure
    const fallbackMindMap = {
      mind_map: {
        central_node: { 
          title: "Error Recovery",
          content: "An error occurred while parsing the mind map data. This is a fallback structure.",
          description: "Fallback content"
        },
        module_nodes: [
          { title: "Topic 1", content: "Fallback content for Topic 1", subtopics: [] },
          { title: "Topic 2", content: "Fallback content for Topic 2", subtopics: [] }
        ]
      }
    };
    
    return JSON.stringify(fallbackMindMap);
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
