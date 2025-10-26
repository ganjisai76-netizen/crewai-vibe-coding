let analysisData = {
  idea: null,
  competitor: null,
  market: null,
  financial: null,
  swot: null,
  future: null
};

let charts = {
  marketSize: null,
  revenue: null
};

// Form submission
document.getElementById('analyzeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const businessIdea = document.getElementById('businessIdea').value.trim();
  if (!businessIdea) return;
  
  // Show progress, hide input
  document.getElementById('inputSection').classList.add('section-hidden');
  document.getElementById('progressSection').classList.remove('section-hidden');
  document.getElementById('resultsSection').classList.add('section-hidden');
  
  // Disable button
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('btnText').classList.add('hidden');
  document.getElementById('btnLoading').classList.remove('hidden');
  
  const streamId = 'stream-' + Date.now();
  
  try {
    const response = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: businessIdea, stream_id: streamId })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error('Failed to start analysis');
    
    const eventSource = new EventSource(`/stream/${streamId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'status') {
        updateProgress(data.text, data.progress);
      } else if (data.type === 'idea_analysis') {
        analysisData.idea = data.data;
        displayIdeaAnalysis(data.data);
      } else if (data.type === 'competitor_analysis') {
        analysisData.competitor = data.data;
        displayCompetitorAnalysis(data.data);
      } else if (data.type === 'market_analysis') {
        analysisData.market = data.data;
        displayMarketAnalysis(data.data);
      } else if (data.type === 'financial_analysis') {
        analysisData.financial = data.data;
        displayFinancialAnalysis(data.data);
      } else if (data.type === 'swot_analysis') {
        analysisData.swot = data.data;
        displaySWOTAnalysis(data.data);
      } else if (data.type === 'future_analysis') {
        analysisData.future = data.data;
        displayFutureAnalysis(data.data);
      } else if (data.type === 'error') {
        alert('Error: ' + data.text);
      } else if (data.type === 'done') {
        // Show results
        document.getElementById('progressSection').classList.add('section-hidden');
        document.getElementById('resultsSection').classList.remove('section-hidden');
        updateOverallScores();
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

function updateOverallScores() {
  // Update score circles
  if (analysisData.idea) {
    updateScoreCircle('ideaScore', analysisData.idea.overall_rating || 0);
  }
  if (analysisData.market) {
    updateScoreCircle('marketScore', analysisData.market.market_score || 0);
  }
  if (analysisData.financial) {
    updateScoreCircle('financialScore', analysisData.financial.financial_score || 0);
  }
  if (analysisData.future) {
    updateScoreCircle('futureScore', analysisData.future.future_score || 0);
  }
  
  // Update key metrics
  if (analysisData.market) {
    document.getElementById('tamValue').textContent = analysisData.market.tam || '-';
    document.getElementById('growthValue').textContent = analysisData.market.growth_rate || '-';
  }
  if (analysisData.financial) {
    document.getElementById('marketCapValue').textContent = analysisData.financial.market_cap_potential || '-';
  }
}

function updateScoreCircle(elementId, score) {
  const element = document.getElementById(elementId);
  element.textContent = score;
  
  // Update circle gradient
  const circleId = elementId + 'Circle';
  const circle = document.getElementById(circleId);
  const percentage = (score / 10) * 360;
  circle.style.background = `conic-gradient(#667eea 0deg, #764ba2 ${percentage}deg, #e0e0e0 ${percentage}deg)`;
}

function displayIdeaAnalysis(data) {
  document.getElementById('valueProposition').textContent = data.value_proposition || '-';
  document.getElementById('businessModel').textContent = data.business_model || '-';
  
  const innovationBadge = document.getElementById('innovationBadge');
  innovationBadge.textContent = data.innovation_level || '-';
  innovationBadge.className = 'badge ' + getBadgeClass(data.innovation_level);
  
  const uniqueness = data.uniqueness_score || 0;
  document.getElementById('uniquenessScore').textContent = uniqueness + '/10';
  document.getElementById('uniquenessBar').style.width = (uniqueness * 10) + '%';
  
  const insightsList = document.getElementById('keyInsights');
  insightsList.innerHTML = '';
  if (data.key_insights && Array.isArray(data.key_insights)) {
    data.key_insights.forEach(insight => {
      const li = document.createElement('li');
      li.className = 'flex items-start';
      li.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-2 mt-1"></i><span class="text-gray-700">${insight}</span>`;
      insightsList.appendChild(li);
    });
  }
}

function displayCompetitorAnalysis(data) {
  const directCompetitors = document.getElementById('directCompetitors');
  directCompetitors.innerHTML = '';
  if (data.direct_competitors && Array.isArray(data.direct_competitors)) {
    data.direct_competitors.slice(0, 5).forEach(comp => {
      const div = document.createElement('div');
      div.className = 'bg-gray-50 p-4 rounded-lg';
      div.innerHTML = `
        <h4 class="font-bold text-gray-800 mb-1">${comp.name || 'Competitor'}</h4>
        <p class="text-sm text-gray-600 mb-1"><strong>Strength:</strong> ${comp.strength || '-'}</p>
        <p class="text-sm text-gray-600"><strong>Weakness:</strong> ${comp.weakness || '-'}</p>
        ${comp.market_share ? `<p class="text-sm text-purple-600 font-semibold mt-2">Market Share: ${comp.market_share}</p>` : ''}
      `;
      directCompetitors.appendChild(div);
    });
  }
  
  const advantages = document.getElementById('competitiveAdvantages');
  advantages.innerHTML = '';
  if (data.competitive_advantages && Array.isArray(data.competitive_advantages)) {
    data.competitive_advantages.forEach(adv => {
      const li = document.createElement('li');
      li.className = 'flex items-start';
      li.innerHTML = `<i class="fas fa-plus-circle text-green-500 mr-2 mt-1"></i><span class="text-gray-700">${adv}</span>`;
      advantages.appendChild(li);
    });
  }
  
  const gaps = document.getElementById('marketGaps');
  gaps.innerHTML = '';
  if (data.market_gaps && Array.isArray(data.market_gaps)) {
    data.market_gaps.forEach(gap => {
      const li = document.createElement('li');
      li.className = 'flex items-start';
      li.innerHTML = `<i class="fas fa-lightbulb text-yellow-500 mr-2 mt-1"></i><span class="text-gray-700">${gap}</span>`;
      gaps.appendChild(li);
    });
  }
  
  const diffScore = data.differentiation_score || 0;
  document.getElementById('differentiationScore').textContent = diffScore + '/10';
  document.getElementById('differentiationBar').style.width = (diffScore * 10) + '%';
}

function displayMarketAnalysis(data) {
  document.getElementById('marketMaturity').textContent = data.maturity_level || '-';
  document.getElementById('marketGrowth').textContent = data.growth_rate || '-';
  
  if (data.target_demographics) {
    const demo = data.target_demographics;
    document.getElementById('targetDemo').textContent = 
      `Age: ${demo.age || '-'}, Income: ${demo.income || '-'}, Region: ${demo.geography || '-'}`;
  }
  
  const trendsList = document.getElementById('marketTrends');
  trendsList.innerHTML = '';
  if (data.market_trends && Array.isArray(data.market_trends)) {
    data.market_trends.forEach(trend => {
      const li = document.createElement('li');
      li.className = 'flex items-start bg-blue-50 p-3 rounded-lg';
      li.innerHTML = `<i class="fas fa-arrow-trend-up text-blue-500 mr-2 mt-1"></i><span class="text-gray-700">${trend}</span>`;
      trendsList.appendChild(li);
    });
  }
  
  // Create market size chart
  createMarketSizeChart(data);
}

function createMarketSizeChart(data) {
  const ctx = document.getElementById('marketSizeChart');
  if (charts.marketSize) charts.marketSize.destroy();
  
  charts.marketSize = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['TAM', 'SAM', 'SOM'],
      datasets: [{
        data: [100, 60, 20], // Relative sizes
        backgroundColor: ['#667eea', '#764ba2', '#9f7aea'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              let value = '-';
              if (label === 'TAM') value = data.tam || '-';
              else if (label === 'SAM') value = data.sam || '-';
              else if (label === 'SOM') value = data.som || '-';
              return label + ': ' + value;
            }
          }
        }
      }
    }
  });
}

function displayFinancialAnalysis(data) {
  document.getElementById('investmentRequired').textContent = data.investment_required || '-';
  document.getElementById('roiPotential').textContent = data.roi_potential || '-';
  document.getElementById('profitabilityTimeline').textContent = data.profitability_timeline || '-';
  
  const riskBadge = document.getElementById('financialRiskBadge');
  riskBadge.textContent = data.financial_risk || '-';
  riskBadge.className = 'badge ' + getBadgeClass(data.financial_risk);
  
  // Create revenue chart
  createRevenueChart(data);
}

function createRevenueChart(data) {
  const ctx = document.getElementById('revenueChart');
  if (charts.revenue) charts.revenue.destroy();
  
  const projections = data.revenue_projections || {};
  
  charts.revenue = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
      datasets: [{
        label: 'Revenue Projection',
        data: [
          parseValue(projections.year1),
          parseValue(projections.year2),
          parseValue(projections.year3),
          parseValue(projections.year4),
          parseValue(projections.year5)
        ],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

function parseValue(str) {
  if (!str) return 0;
  // Extract numbers from string
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function displaySWOTAnalysis(data) {
  displayList('strengths', data.strengths, 'text-green-700');
  displayList('weaknesses', data.weaknesses, 'text-red-700');
  displayList('opportunities', data.opportunities, 'text-blue-700');
  displayList('threats', data.threats, 'text-orange-700');
  displayList('pros', data.pros, 'text-green-600');
  displayList('cons', data.cons, 'text-red-600');
}

function displayList(elementId, items, colorClass) {
  const list = document.getElementById(elementId);
  list.innerHTML = '';
  if (items && Array.isArray(items)) {
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = `flex items-start ${colorClass}`;
      li.innerHTML = `<i class="fas fa-circle text-xs mr-2 mt-1.5"></i><span>${item}</span>`;
      list.appendChild(li);
    });
  }
}

function displayFutureAnalysis(data) {
  document.getElementById('scalabilityScore').textContent = (data.scalability_score || 0) + '/10';
  
  const viabilityBadge = document.getElementById('viabilityBadge');
  viabilityBadge.textContent = data.long_term_viability || '-';
  viabilityBadge.className = 'badge ' + getBadgeClass(data.long_term_viability);
  
  const techBadge = document.getElementById('techAdoptionBadge');
  techBadge.textContent = data.tech_adoption || '-';
  techBadge.className = 'badge badge-medium';
  
  displayList('expansionOpportunities', data.expansion_opportunities, 'text-gray-700');
  displayList('futureTrends', data.future_trends, 'text-gray-700');
  
  document.getElementById('fiveYearOutlook').textContent = data.five_year_outlook || '-';
}

function getBadgeClass(value) {
  if (!value) return 'badge-medium';
  const lower = value.toLowerCase();
  if (lower.includes('high') || lower.includes('strong')) return 'badge-high';
  if (lower.includes('low') || lower.includes('weak')) return 'badge-low';
  return 'badge-medium';
}
