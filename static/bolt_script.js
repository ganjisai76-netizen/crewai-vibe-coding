let frontendCodeContent = '';
let backendCodeContent = '';
let currentTab = 'preview';
let isGenerating = false;

// Initialize
hljs.configure({ ignoreUnescapedHTML: true });

// Auto-resize textarea
const promptInput = document.getElementById('promptInput');
promptInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

// Switch Tab
function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    }
  });
  
  // Update panels
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(tab + 'Panel').classList.add('active');
}

// Add Chat Message
function addChatMessage(agent, text) {
  const chatArea = document.getElementById('chatArea');
  const emptyState = chatArea.querySelector('.empty-preview');
  if (emptyState) emptyState.remove();
  
  const agentIcons = {
    'System': '⚙️',
    'Frontend': '🎨',
    'Backend': '⚙️'
  };
  
  const agentClasses = {
    'System': '',
    'Frontend': 'frontend',
    'Backend': 'backend'
  };
  
  const message = document.createElement('div');
  message.className = 'chat-message';
  message.innerHTML = `
    <div class="message-header">
      <div class="message-avatar ${agentClasses[agent] || ''}">
        ${agentIcons[agent] || '🤖'}
      </div>
      <div class="message-name">${agent}</div>
    </div>
    <div class="message-content">${text}</div>
  `;
  
  chatArea.appendChild(message);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Update Progress
function updateProgress(progress) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }
}

// Show/Hide Generation Status
function showGenerationStatus(message) {
  const statusEl = document.getElementById('generationStatus');
  const messageEl = document.getElementById('statusMessage');
  if (statusEl && messageEl) {
    messageEl.textContent = message;
    statusEl.style.display = 'block';
  }
}

function hideGenerationStatus() {
  const statusEl = document.getElementById('generationStatus');
  if (statusEl) {
    statusEl.style.display = 'none';
  }
}

// Update Status
function updateStatus(status, text) {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  
  statusBadge.style.display = 'inline-flex';
  statusText.textContent = text;
  
  if (status === 'generating') {
    statusBadge.className = 'status-badge generating';
  } else if (status === 'ready') {
    statusBadge.className = 'status-badge';
  }
}

// Display Code
function displayCode(type, code) {
  if (type === 'frontend') {
    frontendCodeContent = code;
    const codeElement = document.getElementById('frontendCode');
    codeElement.textContent = code;
    hljs.highlightElement(codeElement);
    
    // Update preview
    const previewFrame = document.getElementById('previewFrame');
    previewFrame.srcdoc = code;
  } else if (type === 'backend') {
    backendCodeContent = code;
    const codeElement = document.getElementById('backendCode');
    codeElement.textContent = code;
    hljs.highlightElement(codeElement);
  }
}

// Copy Code
function copyCode(type) {
  const code = type === 'frontend' ? frontendCodeContent : backendCodeContent;
  const btn = document.getElementById(`copy${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
  
  navigator.clipboard.writeText(code).then(() => {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// Download Code
function downloadCode(type) {
  const code = type === 'frontend' ? frontendCodeContent : backendCodeContent;
  const filename = type === 'frontend' ? 'index.html' : 'app.py';
  const mimeType = type === 'frontend' ? 'text/html' : 'text/x-python';
  
  const blob = new Blob([code], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Download All
function downloadAll() {
  if (frontendCodeContent) downloadCode('frontend');
  if (backendCodeContent) downloadCode('backend');
}

// Refresh Preview
function refreshPreview() {
  if (frontendCodeContent) {
    const previewFrame = document.getElementById('previewFrame');
    previewFrame.srcdoc = frontendCodeContent;
  }
}

// Form Submit
document.getElementById('promptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const idea = promptInput.value.trim();
  if (!idea || isGenerating) return;
  
  isGenerating = true;
  const sendButton = document.getElementById('sendButton');
  sendButton.disabled = true;
  sendButton.innerHTML = '<span class="spinner"></span>';
  
  // Update project title
  document.getElementById('projectTitle').textContent = idea.substring(0, 50) + (idea.length > 50 ? '...' : '');
  
  // Update status
  updateStatus('generating', 'Generating...');
  
  // Add user message
  addChatMessage('You', idea);
  
  const streamId = 'stream-' + Date.now();
  
  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, stream_id: streamId })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error('Failed to start generation');
    
    const eventSource = new EventSource(`/stream/${streamId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'msg') {
        addChatMessage(data.agent, data.text);
      } else if (data.type === 'status') {
        if (data.progress !== undefined) {
          updateProgress(data.progress);
          showGenerationStatus(data.text || 'Generating...');
        }
      } else if (data.type === 'frontend_code') {
        addChatMessage(data.agent, '✅ Frontend code generated successfully!');
        displayCode('frontend', data.text);
        switchTab('preview');
      } else if (data.type === 'backend_code') {
        addChatMessage(data.agent, '✅ Backend code generated successfully!');
        displayCode('backend', data.text);
      } else if (data.type === 'error') {
        addChatMessage('System', '❌ Error: ' + data.text);
        updateStatus('ready', 'Error');
        updateProgress(0);
        hideGenerationStatus();
      } else if (data.type === 'done') {
        addChatMessage('System', '🎉 Generation complete! Your code is ready.');
        updateStatus('ready', 'Ready');
        updateProgress(100);
        setTimeout(() => {
          updateProgress(0);
          hideGenerationStatus();
        }, 2000);
        isGenerating = false;
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        promptInput.value = '';
        promptInput.style.height = 'auto';
        eventSource.close();
      }
    };
    
    eventSource.onerror = () => {
      addChatMessage('System', '❌ Connection error');
      updateStatus('ready', 'Error');
      isGenerating = false;
      sendButton.disabled = false;
      sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
      eventSource.close();
    };
    
  } catch (error) {
    addChatMessage('System', '❌ ' + error.message);
    updateStatus('ready', 'Error');
    isGenerating = false;
    sendButton.disabled = false;
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
});
