let contentData = {
  captions: null,
  hashtags: null,
  hooks: null,
  scripts: null,
  bio: null,
  strategy: null
};

// Form submission
document.getElementById('contentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const topic = document.getElementById('topic').value.trim();
  const niche = document.getElementById('niche').value;
  const postType = document.getElementById('postType').value;
  const tone = document.getElementById('tone').value;
  
  if (!topic) return;
  
  // Show progress, hide input
  document.getElementById('inputSection').classList.add('section-hidden');
  document.getElementById('progressSection').classList.remove('section-hidden');
  document.getElementById('resultsSection').classList.add('section-hidden');
  
  // Disable button
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  document.getElementById('btnText').classList.add('hidden');
  document.getElementById('btnLoading').classList.remove('hidden');
  
  const streamId = 'stream-' + Date.now();
  
  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, niche, post_type: postType, tone, stream_id: streamId })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error('Failed to start generation');
    
    const eventSource = new EventSource(`/stream/${streamId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'status') {
        updateProgress(data.text, data.progress);
      } else if (data.type === 'captions') {
        contentData.captions = data.data;
        displayCaptions(data.data);
      } else if (data.type === 'hashtags') {
        contentData.hashtags = data.data;
        displayHashtags(data.data);
      } else if (data.type === 'hooks') {
        contentData.hooks = data.data;
        displayHooks(data.data);
      } else if (data.type === 'scripts') {
        contentData.scripts = data.data;
        displayScripts(data.data);
      } else if (data.type === 'bio') {
        contentData.bio = data.data;
        displayBio(data.data);
      } else if (data.type === 'strategy') {
        contentData.strategy = data.data;
        displayStrategy(data.data);
      } else if (data.type === 'error') {
        alert('Error: ' + data.text);
      } else if (data.type === 'done') {
        document.getElementById('progressSection').classList.add('section-hidden');
        document.getElementById('resultsSection').classList.remove('section-hidden');
        eventSource.close();
      }
    };
    
    eventSource.onerror = () => {
      alert('Connection error');
      btn.disabled = false;
      document.getElementById('btnText').classList.remove('hidden');
      document.getElementById('btnLoading').classList.add('hidden');
      eventSource.close();
    };
    
  } catch (error) {
    alert('Error: ' + error.message);
    btn.disabled = false;
    document.getElementById('btnText').classList.remove('hidden');
    document.getElementById('btnLoading').classList.add('hidden');
  }
});

function updateProgress(text, progress) {
  document.getElementById('progressText').textContent = text;
  document.getElementById('progressPercent').textContent = progress + '%';
  document.getElementById('progressFill').style.width = progress + '%';
}

function displayCaptions(data) {
  document.getElementById('bestCaption').textContent = data.best_caption || '-';
  
  const captionsList = document.getElementById('captionsList');
  captionsList.innerHTML = '';
  if (data.captions && Array.isArray(data.captions)) {
    data.captions.forEach(caption => {
      const card = document.createElement('div');
      card.className = 'caption-card';
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <span class="score-badge">${caption.engagement_score || 9}</span>
              <span class="text-xs font-bold text-gray-500 uppercase">${caption.type || 'Caption'}</span>
            </div>
            <p class="text-base text-gray-800 whitespace-pre-wrap">${caption.text || caption}</p>
          </div>
          <button onclick="copyCaptionText(\`${escapeHtml(caption.text || caption)}\`)" class="copy-button ml-4">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      `;
      captionsList.appendChild(card);
    });
  }
  
  const tipsList = document.getElementById('captionTips');
  tipsList.innerHTML = '';
  if (data.caption_tips && Array.isArray(data.caption_tips)) {
    data.caption_tips.forEach(tip => {
      const li = document.createElement('li');
      li.className = 'flex items-start text-gray-700';
      li.innerHTML = `<i class="fas fa-lightbulb text-yellow-500 mr-2 mt-1"></i><span>${tip}</span>`;
      tipsList.appendChild(li);
    });
  }
}

function displayHashtags(data) {
  displayHashtagList('recommendedHashtags', data.recommended_set);
  displayHashtagList('trendingHashtags', data.trending_hashtags);
  displayHashtagList('mediumHashtags', data.medium_hashtags);
  displayHashtagList('nicheHashtags', data.niche_hashtags);
  displayHashtagList('brandedHashtags', data.branded_hashtags);
  
  document.getElementById('hashtagStrategy').textContent = data.hashtag_strategy || '-';
  document.getElementById('viralScore').textContent = (data.viral_score || 0) + '/10';
}

function displayHashtagList(containerId, hashtags) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (hashtags && Array.isArray(hashtags)) {
    hashtags.forEach(hashtag => {
      const pill = document.createElement('span');
      pill.className = 'hashtag-pill';
      pill.textContent = hashtag;
      pill.onclick = () => copyToClipboard(hashtag);
      container.appendChild(pill);
    });
  }
}

function displayHooks(data) {
  document.getElementById('bestHook').textContent = data.best_hook || '-';
  document.getElementById('bestCTA').textContent = data.best_cta || '-';
  
  const hooksContainer = document.getElementById('captionHooks');
  hooksContainer.innerHTML = '';
  if (data.caption_hooks && Array.isArray(data.caption_hooks)) {
    data.caption_hooks.forEach(hookObj => {
      const div = document.createElement('div');
      div.className = 'p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition';
      div.innerHTML = `
        <p class="font-semibold text-gray-800">${hookObj.hook || hookObj}</p>
        ${hookObj.psychology ? `<p class="text-xs text-gray-600 mt-1">${hookObj.psychology}</p>` : ''}
      `;
      div.onclick = () => copyToClipboard(hookObj.hook || hookObj);
      hooksContainer.appendChild(div);
    });
  }
  
  const ctaContainer = document.getElementById('ctaList');
  ctaContainer.innerHTML = '';
  if (data.ctas && Array.isArray(data.ctas)) {
    data.ctas.forEach(ctaObj => {
      const div = document.createElement('div');
      div.className = 'p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition';
      div.innerHTML = `
        <p class="font-semibold text-gray-800">${ctaObj.cta || ctaObj}</p>
        ${ctaObj.action ? `<p class="text-xs text-gray-600 mt-1">${ctaObj.action}</p>` : ''}
      `;
      div.onclick = () => copyToClipboard(ctaObj.cta || ctaObj);
      ctaContainer.appendChild(div);
    });
  }
  
  displaySimpleList('storyHooks', data.story_hooks);
  displaySimpleList('commentPrompts', data.comment_prompts);
}

function displayScripts(data) {
  const reelContainer = document.getElementById('reelScripts');
  reelContainer.innerHTML = '';
  if (data.reel_scripts && Array.isArray(data.reel_scripts)) {
    data.reel_scripts.forEach(reel => {
      const card = document.createElement('div');
      card.className = 'script-card mb-4';
      card.innerHTML = `
        <h4 class="font-bold text-lg text-gray-800 mb-2">${reel.title || 'Reel Script'}</h4>
        <p class="text-sm text-gray-600 mb-3"><strong>Duration:</strong> ${reel.duration || '15-30 seconds'}</p>
        <div class="bg-white p-4 rounded-lg mb-3">
          <p class="text-gray-800 whitespace-pre-wrap">${reel.script || '-'}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-purple-50 p-3 rounded">
            <p class="text-xs font-semibold text-gray-600">Hook (First 3s)</p>
            <p class="text-sm text-gray-800">${reel.hook || '-'}</p>
          </div>
          <div class="bg-blue-50 p-3 rounded">
            <p class="text-xs font-semibold text-gray-600">Music</p>
            <p class="text-sm text-gray-800">${reel.music_suggestion || '-'}</p>
          </div>
        </div>
        <button onclick="copyToClipboard(\`${escapeHtml(reel.script || '')}\`)" class="copy-button mt-3">
          <i class="fas fa-copy mr-2"></i> Copy Script
        </button>
      `;
      reelContainer.appendChild(card);
    });
  }
  
  const storyContainer = document.getElementById('storySequences');
  storyContainer.innerHTML = '';
  if (data.story_sequences && Array.isArray(data.story_sequences)) {
    data.story_sequences.forEach(sequence => {
      const card = document.createElement('div');
      card.className = 'script-card mb-4';
      card.innerHTML = `
        <h4 class="font-bold text-lg text-gray-800 mb-2">${sequence.sequence_title || 'Story Sequence'}</h4>
        <div class="space-y-2 mb-3">
          ${sequence.slides && Array.isArray(sequence.slides) ? sequence.slides.map((slide, i) => `
            <div class="bg-white p-3 rounded-lg">
              <p class="text-xs font-semibold text-gray-600">Slide ${i + 1}</p>
              <p class="text-gray-800">${slide}</p>
            </div>
          `).join('') : ''}
        </div>
        <p class="text-sm text-gray-600"><strong>Engagement:</strong> ${sequence.engagement_tactic || '-'}</p>
      `;
      storyContainer.appendChild(card);
    });
  }
  
  const carouselContainer = document.getElementById('carouselStructure');
  if (data.carousel_structure) {
    const carousel = data.carousel_structure;
    carouselContainer.innerHTML = `
      <h4 class="font-bold text-lg text-gray-800 mb-3">${carousel.title || 'Carousel Post'}</h4>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        ${carousel.slides && Array.isArray(carousel.slides) ? carousel.slides.map((slide, i) => `
          <div class="bg-white p-3 rounded-lg text-center">
            <p class="text-xs font-semibold text-gray-600 mb-1">Slide ${i + 1}</p>
            <p class="text-sm text-gray-800">${slide}</p>
          </div>
        `).join('') : ''}
      </div>
      <div class="bg-blue-50 p-3 rounded-lg">
        <p class="text-sm font-semibold text-gray-700 mb-2">Design Tips:</p>
        <ul class="text-sm text-gray-700 space-y-1">
          ${carousel.design_tips && Array.isArray(carousel.design_tips) ? carousel.design_tips.map(tip => `<li>• ${tip}</li>`).join('') : ''}
        </ul>
      </div>
    `;
  }
}

function displayBio(data) {
  document.getElementById('bestBio').textContent = data.best_bio || '-';
  
  const bioContainer = document.getElementById('bioVariations');
  bioContainer.innerHTML = '';
  if (data.bio_variations && Array.isArray(data.bio_variations)) {
    data.bio_variations.forEach(bioObj => {
      const div = document.createElement('div');
      div.className = 'p-3 bg-pink-50 rounded-lg cursor-pointer hover:bg-pink-100 transition';
      div.innerHTML = `
        <p class="text-sm font-semibold text-gray-800 mb-1">${bioObj.bio || bioObj}</p>
        <p class="text-xs text-gray-600">${bioObj.style || ''} - Score: ${bioObj.conversion_score || '-'}</p>
      `;
      div.onclick = () => copyToClipboard(bioObj.bio || bioObj);
      bioContainer.appendChild(div);
    });
  }
  
  displaySimpleList('nameSuggestions', data.name_suggestions);
  document.getElementById('linkText').textContent = data.link_text || '-';
  
  const highlightsContainer = document.getElementById('highlightNames');
  highlightsContainer.innerHTML = '';
  if (data.highlight_names && Array.isArray(data.highlight_names)) {
    data.highlight_names.forEach(name => {
      const span = document.createElement('span');
      span.className = 'px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full text-sm font-semibold text-gray-800';
      span.textContent = name;
      highlightsContainer.appendChild(span);
    });
  }
}

function displayStrategy(data) {
  const timesContainer = document.getElementById('postingTimes');
  timesContainer.innerHTML = '';
  if (data.posting_times && Array.isArray(data.posting_times)) {
    data.posting_times.forEach(time => {
      const p = document.createElement('p');
      p.className = 'text-sm mb-1';
      p.textContent = time;
      timesContainer.appendChild(p);
    });
  }
  
  document.getElementById('viralPotential').textContent = (data.viral_potential || 0) + '/10';
  
  const metricsContainer = document.getElementById('successMetrics');
  metricsContainer.innerHTML = '';
  if (data.success_metrics && Array.isArray(data.success_metrics)) {
    data.success_metrics.forEach(metric => {
      const p = document.createElement('p');
      p.className = 'text-sm mb-1';
      p.textContent = metric;
      metricsContainer.appendChild(p);
    });
  }
  
  displayListWithIcon('engagementTactics', data.engagement_tactics, 'fa-heart', '#E1306C');
  displayListWithIcon('algorithmTips', data.algorithm_tips, 'fa-robot', '#3b82f6');
  displayListWithIcon('growthHacks', data.growth_hacks, 'fa-rocket', '#fcb045');
  
  const calendarContainer = document.getElementById('contentCalendar');
  calendarContainer.innerHTML = '';
  if (data.content_calendar && Array.isArray(data.content_calendar)) {
    data.content_calendar.forEach(day => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg';
      card.innerHTML = `
        <h4 class="font-bold text-gray-800 mb-1">${day.day || 'Day'}</h4>
        <p class="text-sm text-gray-600 mb-1"><strong>${day.content_type || 'Post'}</strong></p>
        <p class="text-sm text-gray-700">${day.topic || '-'}</p>
      `;
      calendarContainer.appendChild(card);
    });
  }
}

function displaySimpleList(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (items && Array.isArray(items)) {
    items.forEach(item => {
      const p = document.createElement('p');
      p.className = 'text-gray-700 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition';
      p.textContent = item;
      p.onclick = () => copyToClipboard(item);
      container.appendChild(p);
    });
  }
}

function displayListWithIcon(containerId, items, icon, color) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (items && Array.isArray(items)) {
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'flex items-start text-gray-700';
      li.innerHTML = `<i class="fas ${icon} mr-2 mt-1" style="color: ${color};"></i><span>${item}</span>`;
      container.appendChild(li);
    });
  }
}

// Copy functions
function copyText(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  copyToClipboard(text);
}

function copyCaptionText(caption) {
  copyToClipboard(caption);
}

function copyAllCaptions() {
  if (!contentData.captions || !contentData.captions.captions) return;
  const captions = contentData.captions.captions.map(c => c.text || c).join('\n\n---\n\n');
  copyToClipboard(captions);
}

function copyAllHashtags() {
  if (!contentData.hashtags || !contentData.hashtags.all_hashtags) return;
  const hashtags = contentData.hashtags.all_hashtags.join(' ');
  copyToClipboard(hashtags);
}

function copyRecommendedHashtags() {
  if (!contentData.hashtags || !contentData.hashtags.recommended_set) return;
  const hashtags = contentData.hashtags.recommended_set.join(' ');
  copyToClipboard(hashtags);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    `;
    notification.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Copied to clipboard!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/'/g, "\\'").replace(/`/g, "\\`");
}
