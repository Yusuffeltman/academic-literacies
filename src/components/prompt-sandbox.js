import { _aiChat } from '../ai.js';

/**
 * Generates the HTML for a Prompt Engineering Sandbox.
 * @param {string} id Unique identifier for the sandbox.
 * @param {string} title Title of the sandbox activity.
 * @param {string} instruction Instructions or context for the prompt.
 * @param {string} initialPrompt (Optional) Pre-filled prompt to get the student started.
 */
export function promptSandbox(id, title, instruction, initialPrompt = '') {
  return `
    <div class="prompt-sandbox" id="${id}">
      <div class="prompt-sandbox-header">
        <div class="prompt-sandbox-icon">🛠️</div>
        <div class="prompt-sandbox-title">${title}</div>
      </div>
      <p style="font-size: 14px; margin-bottom: 20px;">${instruction}</p>
      
      <div class="prompt-sandbox-body">
        <div class="prompt-sandbox-input-area">
          <div class="prompt-sandbox-label">Your Prompt</div>
          <textarea id="${id}-input" class="prompt-sandbox-textarea" placeholder="Type your prompt here...">${initialPrompt}</textarea>
        </div>
        
        <div class="prompt-sandbox-output-area">
          <div class="prompt-sandbox-label">AI Output</div>
          <div id="${id}-output" class="prompt-sandbox-output-box">
            <span style="color:var(--muted);font-style:italic;">Run your prompt to see the output here.</span>
          </div>
        </div>
      </div>
      
      <div class="prompt-sandbox-controls">
        <button id="${id}-btn" class="prompt-sandbox-btn" onclick="runPromptSandbox('${id}')">Run Prompt 🚀</button>
      </div>
    </div>
  `;
}

/**
 * Logic to execute the prompt when the button is clicked.
 */
window.runPromptSandbox = async function(id) {
  const inputEl = document.getElementById(`${id}-input`);
  const outputEl = document.getElementById(`${id}-output`);
  const btnEl = document.getElementById(`${id}-btn`);
  
  const promptText = inputEl.value.trim();
  if (!promptText) {
    alert('Please enter a prompt first.');
    return;
  }
  
  // UI Loading State
  btnEl.disabled = true;
  btnEl.innerHTML = 'Running...';
  outputEl.innerHTML = `<span class="prompt-sandbox-loading">Generating response...</span>`;
  
  try {
    // We use a generic system prompt for the sandbox so it acts as a neutral AI assistant
    const systemInstruction = "You are a neutral AI assistant responding to a student's prompt engineering exercise. Follow their instructions exactly as written to demonstrate the effect of their prompt.";
    
    const response = await _aiChat(promptText, { system: systemInstruction, maxTokens: 800 });
    
    // Format basic markdown (bolding and line breaks)
    const formattedHtml = response
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
      
    outputEl.innerHTML = formattedHtml;
    
  } catch (err) {
    outputEl.innerHTML = `<span style="color:var(--red);">Error: ${err.message}</span>`;
  } finally {
    // Restore UI
    btnEl.disabled = false;
    btnEl.innerHTML = 'Run Prompt 🚀';
  }
};
