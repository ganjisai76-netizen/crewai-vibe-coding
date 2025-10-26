let optimizationData = {
  trends: null,
  titles: null,
  tags: null,
  hashtags: null,
  strategy: null
};

// Form submission
document.getElementById('optimizerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const concept = document.getElementById('videoConcept').value.trim();
  const niche = document.getElementById('niche').value;
  const audience = document.getElementById('audience').value;
  const videoType = document.getElementById('videoType').value;
  
  if (!concept) return;
  
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
      body: JSON.stringify({ 
        concept, 
        niche, 
        audience, 
        type: videoType, 
        stream_id: streamId 
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error('Failed to start generation');
    
    const eventSource = new EventSource(`/stream/${streamId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'status') {
        updateProgress(data.text, data.progress);
      } else if (data.type === 'trend_analysis') {
        optimizationData.trends = data.data;
        displayTrendAnalysis(data.data);
      } else if (data.type === 'titles') {
        optimizationData.titles = data.data;
        displayTitles(data.data);
      } else if (data.type === 'tags') {
        optimizationData.tags = data.data;
        displayTags(data.data);
      } else if (data.type === 'hashtags') {
        optimizationData.hashtags = data.data;
        displayHashtags(data.data);
      } else if (data.type === 'strategy') {
        optimizationData.strategy = data.data;
        displayStrategy(data.data);
      } else if (data.type === 'error') {
        alert('Error: ' + data.text);
      } else if (data.type === 'done') {
        // Show results
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

function displayTrendAnalysis(data) {
  // Trending topics
  const topicsContainer = document.getElementById('trendingTopics');
  topicsContainer.innerHTML = '';
  if (data.trending_topics && Array.isArray(data.trending_topics)) {
    data.trending_topics.forEach(topic => {
      const badge = document.createElement('span');
      badge.className = 'trend-badge';
      badge.innerHTML = `<i class="fas fa-fire mr-1"></i>${topic}`;
      topicsContainer.appendChild(badge);
    });
  }
  
  // Search keywords
  const keywordsContainer = document.getElementById('searchKeywords');
  keywordsContainer.innerHTML = '';
  if (data.search_keywords && Array.isArray(data.search_keywords)) {
    data.search_keywords.forEach(keyword => {
      const badge = document.createElement('span');
      badge.className = 'trend-badge';
      badge.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
      badge.innerHTML = `<i class="fas fa-search mr-1"></i>${keyword}`;
      keywordsContainer.appendChild(badge);
    });
  }
  
  // Metrics
  document.getElementById('competitionLevel').textContent = data.competition_level || '-';
  document.getElementById('opportunityScore').textContent = (data.opportunity_score || 0) + '/10';
  
  if (data.viral_patterns && Array.isArray(data.viral_patterns)) {
    document.getElementById('viralPatterns').textContent = data.viral_patterns.length + ' patterns';
  }
}

function displayTitles(data) {
  // Best title
  document.getElementById('bestTitle').textContent = data.best_title || '-';
  
  // All titles
  const titlesList = document.getElementById('titlesList');
  titlesList.innerHTML = '';
  if (data.titles && Array.isArray(data.titles)) {
    data.titles.forEach((titleObj, index) => {
      const card = document.createElement('div');
      card.className = 'title-card';
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span class="score-badge">${titleObj.score || (10 - index)}</span>
              <span class="text-xs font-semibold text-gray-500 uppercase">${titleObj.strategy || 'Optimized'}</span>
            </div>
            <p class="text-lg font-semibold text-gray-800">${titleObj.title || titleObj}</p>
          </div>
          <button onclick="copyTitleText('${escapeHtml(titleObj.title || titleObj)}')" class="copy-button ml-4">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      `;
      titlesList.appendChild(card);
    });
  }
  
  // Title tips
  const tipsList = document.getElementById('titleTips');
  tipsList.innerHTML = '';
  if (data.title_tips && Array.isArray(data.title_tips)) {
    data.title_tips.forEach(tip => {
      const li = document.createElement('li');
      li.className = 'flex items-start text-gray-700';
      li.innerHTML = `<i class="fas fa-lightbulb text-yellow-500 mr-2 mt-1"></i><span>${tip}</span>`;
      tipsList.appendChild(li);
    });
  }
}

function displayTags(data) {
  // Primary tags
  displayTagList('primaryTags', data.primary_tags, '#ef4444');
  
  // Secondary tags
  displayTagList('secondaryTags', data.secondary_tags, '#f97316');
  
  // Long-tail tags
  displayTagList('longTailTags', data.long_tail_tags, '#10b981');
  
  // Trending tags
  displayTagList('trendingTags', data.trending_tags, '#8b5cf6');
  
  // Tag strategy
  document.getElementById('tagStrategy').textContent = data.tag_strategy || '-';
}

function displayTagList(containerId, tags, color) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (tags && Array.isArray(tags)) {
    tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.textContent = tag;
      pill.onclick = () => {
        pill.classList.toggle('selected');
        copyToClipboard(tag);
      };
      container.appendChild(pill);
    });
  }
}

function displayHashtags(data) {
  // Recommended combination
  const recommendedContainer = document.getElementById('recommendedHashtags');
  recommendedContainer.innerHTML = '';
  if (data.recommended_combination && Array.isArray(data.recommended_combination)) {
    data.recommended_combination.forEach(hashtag => {
      const badge = document.createElement('span');
      badge.className = 'trend-badge';
      badge.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      badge.textContent = hashtag;
      recommendedContainer.appendChild(badge);
    });
  }
  
  // Trending hashtags
  displayHashtagList('trendingHashtags', data.trending_hashtags, '#ef4444');
  
  // Niche hashtags
  displayHashtagList('nicheHashtags', data.niche_hashtags, '#3b82f6');
  
  // Branded hashtags
  displayHashtagList('brandedHashtags', data.branded_hashtags, '#10b981');
  
  // Evergreen hashtags
  displayHashtagList('evergreenHashtags', data.evergreen_hashtags, '#f59e0b');
  
  // Hashtag strategy
  document.getElementById('hashtagStrategy').textContent = data.hashtag_strategy || '-';
}

function displayHashtagList(containerId, hashtags, color) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (hashtags && Array.isArray(hashtags)) {
    hashtags.forEach(hashtag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.textContent = hashtag;
      pill.onclick = () => {
        pill.classList.toggle('selected');
        copyToClipboard(hashtag);
      };
      container.appendChild(pill);
    });
  }
}

function displayStrategy(data) {
  // Description template
  document.getElementById('descriptionTemplate').textContent = data.description_template || '-';
  
  // Thumbnail tips
  displayList('thumbnailTips', data.thumbnail_tips, 'fa-image', '#ef4444');
  
  // CTA suggestions
  displayList('ctaSuggestions', data.cta_suggestions, 'fa-bullhorn', '#3b82f6');
  
  // Engagement tactics
  displayList('engagementTactics', data.engagement_tactics, 'fa-comments', '#10b981');
  
  // Posting times
  displayList('postingTimes', data.best_posting_times, 'fa-clock', '#f59e0b');
  
  // Series ideas
  displayList('seriesIdeas', data.series_ideas, 'fa-video', '#8b5cf6');
  
  // Growth score
  document.getElementById('growthScore').textContent = (data.growth_score || 0) + '/10';
  
  // Pro tips
  displayList('proTips', data.pro_tips, 'fa-star', '#eab308');
}

function displayList(containerId, items, icon, color) {
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

function copyTitleText(title) {
  copyToClipboard(title);
}

function copyAllTitles() {
  if (!optimizationData.titles || !optimizationData.titles.titles) return;
  const titles = optimizationData.titles.titles.map(t => t.title || t).join('\n\n');
  copyToClipboard(titles);
}

function copyAllTags() {
  if (!optimizationData.tags || !optimizationData.tags.all_tags) return;
  const tags = optimizationData.tags.all_tags.join(', ');
  copyToClipboard(tags);
}

function copyAllHashtags() {
  if (!optimizationData.hashtags || !optimizationData.hashtags.all_hashtags) return;
  const hashtags = optimizationData.hashtags.all_hashtags.join(' ');
  copyToClipboard(hashtags);
}

function copyRecommendedHashtags() {
  if (!optimizationData.hashtags || !optimizationData.hashtags.recommended_combination) return;
  const hashtags = optimizationData.hashtags.recommended_combination.join(' ');
  copyToClipboard(hashtags);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show feedback
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
  return div.innerHTML.replace(/'/g, "\\'");
}
