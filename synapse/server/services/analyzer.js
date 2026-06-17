/**
 * M1 内容分析器 — Analyzer Service
 * 负责：爆款结构提取、标题公式分析、关键词统计、对标评分
 */

const collector = require('./collector');

/**
 * 提取标题公式
 * 分析标题的共同模式
 */
function extractTitleFormulas(posts) {
  const formulas = [];
  const patterns = [];

  posts.forEach(p => {
    const t = p.title;
    // 检测常见模式
    if (/\d+[个款种]/.test(t)) patterns.push('数字列举型');
    if (/！$/.test(t) || /！/.test(t)) patterns.push('感叹结尾型');
    if (/\d{4}年/.test(t) || /20\d{2}/.test(t)) patterns.push('年份时效型');
    if (/千万别|必看|揭秘|终极|最全/.test(t)) patterns.push('紧迫感型');
    if (/怎么|如何|怎样/.test(t)) patterns.push('问题解决型');
    if (/测评|实测|对比/.test(t)) patterns.push('测评型');
    if (/打工人|新手|一人|博主/.test(t)) patterns.push('身份标签型');
    if (/爆款|效率|翻倍|[0-9]+倍/.test(t)) patterns.push('效果承诺型');
  });

  // 统计频率
  const freq = {};
  patterns.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / posts.length) * 100)
    }));

  // 提取具体公式
  formulas.push({
    name: '数字+效果承诺',
    template: '{数字}个{品类}让你{效果}——{紧迫感词}',
    examples: [
      '这5个工具让你效率翻倍，千万别错过',
      '8个AI工具让我每天多出3小时',
      '4个自动化工作流让你效率翻倍'
    ],
    effectiveness: '高——数字增加可信度，效果承诺制造期待'
  });

  formulas.push({
    name: '年份+品类+测评',
    template: '{年份}{品类}{测评/推荐}！{身份标签}{效果}',
    examples: [
      '2026小红书AI写作工具测评！新手高效出稿攻略',
      '2025小红书AI创作工具Top 10',
      '2026AI写作软件哪个好用？全网深度测评'
    ],
    effectiveness: '高——年份=时效性，测评=权威感'
  });

  formulas.push({
    name: '痛点+解决方案群',
    template: '别再{痛点行为了}！{解决方案群}{效果承诺}',
    examples: [
      '别再熬夜写文案了！AI生成小红书爆款笔记的5个秘诀',
      '小红书创作总卡壳？这4个自动化工作流让你效率翻倍'
    ],
    effectiveness: '极高——情绪共鸣强，解决方案提供价值'
  });

  return {
    total_analyzed: posts.length,
    top_patterns: sorted.slice(0, 5),
    formulas
  };
}

/**
 * 提取爆款结构模式
 */
function extractStructurePatterns(posts) {
  const structures = posts
    .filter(p => p.structure)
    .map(p => p.structure);

  // 统计开头模式
  const openingTypes = {};
  structures.forEach(s => {
    if (s.opening) {
      if (s.opening.includes('痛点')) openingTypes['痛点引入型'] = (openingTypes['痛点引入型'] || 0) + 1;
      else if (s.opening.includes('共鸣')) openingTypes['场景共鸣型'] = (openingTypes['场景共鸣型'] || 0) + 1;
      else if (s.opening.includes('数据')) openingTypes['数据冲击型'] = (openingTypes['数据冲击型'] || 0) + 1;
      else if (s.opening.includes('现状')) openingTypes['行业现状型'] = (openingTypes['行业现状型'] || 0) + 1;
    }
  });

  // 统计正文结构
  const bodyTypes = {};
  structures.forEach(s => {
    if (s.body_type) {
      bodyTypes[s.body_type] = (bodyTypes[s.body_type] || 0) + 1;
    }
  });

  // 统计结尾模式
  const closingTypes = {};
  structures.forEach(s => {
    if (s.closing) {
      if (s.closing.includes('推荐')) closingTypes['推荐引导型'] = (closingTypes['推荐引导型'] || 0) + 1;
      if (s.closing.includes('总结')) closingTypes['总结回顾型'] = (closingTypes['总结回顾型'] || 0) + 1;
      if (s.closing.includes('行动')) closingTypes['行动号召型'] = (closingTypes['行动号召型'] || 0) + 1;
      if (s.closing.includes('资源') || s.closing.includes('分享')) closingTypes['资源分享型'] = (closingTypes['资源分享型'] || 0) + 1;
    }
  });

  return {
    opening_patterns: Object.entries(openingTypes).map(([k, v]) => ({ type: k, count: v })),
    body_patterns: Object.entries(bodyTypes).map(([k, v]) => ({ type: k, count: v })),
    closing_patterns: Object.entries(closingTypes).map(([k, v]) => ({ type: k, count: v })),
    recommended_structure: {
      opening: '痛点引入 + 数据冲击 (最高频组合)',
      body: '横向对比 > 实战教程 > 秘诀罗列 (选一种)',
      closing: '价值总结 → 核心推荐 → 行动号召'
    }
  };
}

/**
 * 关键词频率分析
 */
function analyzeKeywords(posts) {
  const kwMap = {};
  const tagMap = {};

  posts.forEach(p => {
    (p.keywords || []).forEach(k => {
      kwMap[k] = (kwMap[k] || 0) + 1;
    });
    (p.hashtags || []).forEach(h => {
      tagMap[h] = (tagMap[h] || 0) + 1;
    });
  });

  const topKeywords = Object.entries(kwMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => ({ keyword: k, count: v, frequency: Math.round((v / posts.length) * 100) }));

  const topHashtags = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([h, v]) => ({ hashtag: h, count: v, frequency: Math.round((v / posts.length) * 100) }));

  return { top_keywords: topKeywords, top_hashtags: topHashtags };
}

/**
 * 内容质量评分 (0-100)
 */
function scoreContent(post) {
  let score = 0;
  const t = post.title || '';
  const k = post.keywords || [];
  const h = post.hashtags || [];

  // 标题质量 (40分)
  if (t.length >= 15 && t.length <= 40) score += 15;
  else if (t.length > 40) score += 8;
  if (/\d/.test(t)) score += 10;        // 含数字
  if (/[！!]/.test(t)) score += 5;       // 有感叹
  if (/怎么|如何|怎样|为什么/.test(t)) score += 5;  // 问题型
  if (/千万别|必看|揭秘/.test(t)) score += 5;       // 紧迫感

  // 关键词质量 (30分)
  if (k.length >= 3 && k.length <= 8) score += 10;
  if (k.length >= 3) score += 10;
  if (h.length >= 2 && h.length <= 5) score += 10;

  // 互动数据 (30分，基于数据的相对评分)
  const likes = post.likes || 0;
  if (likes >= 20000) score += 30;
  else if (likes >= 10000) score += 20;
  else if (likes >= 5000) score += 10;
  else if (likes >= 1000) score += 5;

  return Math.min(score, 100);
}

/**
 * 对标分析：给定一篇原创内容 vs 爆款基准
 */
function benchmarkAgainstTop(originalContent, topPosts) {
  const originalScore = scoreContent({
    title: originalContent.title,
    keywords: originalContent.keywords || [],
    hashtags: originalContent.hashtags || [],
    likes: 0
  });

  const benchmarks = topPosts.slice(0, 5).map(p => ({
    title: p.title,
    score: scoreContent(p),
    likes: p.likes || 0,
    gap: scoreContent(p) - originalScore
  }));

  const avgBenchmarkScore = Math.round(benchmarks.reduce((s, b) => s + b.score, 0) / benchmarks.length);

  return {
    original_title: originalContent.title,
    original_score: originalScore,
    benchmark_avg_score: avgBenchmarkScore,
    gap: avgBenchmarkScore - originalScore,
    verdict: originalScore >= avgBenchmarkScore * 0.7
      ? '✅ 达到爆款标准的70%以上，可发布'
      : '⚠️ 未达到基准，建议按改进建议优化',
    benchmarks,
    improvements: generateImprovements(originalContent, topPosts)
  };
}

/**
 * 生成改进建议
 */
function generateImprovements(content, topPosts) {
  const suggestions = [];
  const title = content.title || '';

  // 标题改进
  if (!/\d/.test(title)) {
    suggestions.push('标题添加数字（如"5款""8个""10倍"），增强可信度');
  }
  if (title.length < 15) {
    suggestions.push('标题过短(<15字)，建议扩展到15-30字，包含更多信息量');
  }
  if (!/[！!?？]/.test(title)) {
    suggestions.push('标题末尾加感叹号或问号，增强情绪张力');
  }
  if (!/怎么|如何|为什么|别再/.test(title)) {
    suggestions.push('考虑用"怎么做""如何""别再"等钩子词开头');
  }

  // 标签改进
  const hashtags = content.hashtags || [];
  if (hashtags.length < 3) {
    suggestions.push('标签至少3个，建议4-5个，覆盖大品类+细分+情绪标签');
  }

  // 从爆款中提取可借鉴的元素
  const topKeywordSet = new Set();
  topPosts.slice(0, 3).forEach(p => {
    (p.keywords || []).forEach(k => topKeywordSet.add(k));
  });
  const contentKeywords = new Set(content.keywords || []);
  const missingKeywords = [...topKeywordSet].filter(k => !contentKeywords.has(k)).slice(0, 5);
  if (missingKeywords.length > 0) {
    suggestions.push(`可考虑融入高频关键词: ${missingKeywords.join('、')}`);
  }

  return suggestions;
}

/**
 * 主分析入口
 */
async function analyze(category = null, platform = null) {
  let posts;
  if (category) {
    posts = collector.filterByCategory(category, 50);
  } else if (platform) {
    posts = collector.filterByPlatform(platform, 50);
  } else {
    posts = collector.getTopPosts(50);
  }

  if (posts.length === 0) {
    return { error: '没有足够的数据进行分析，请先收集内容' };
  }

  return {
    analyzed_count: posts.length,
    category: category || 'all',
    platform: platform || 'all',
    title_formulas: extractTitleFormulas(posts),
    structure_patterns: extractStructurePatterns(posts),
    keyword_analysis: analyzeKeywords(posts),
    quality_distribution: {
      excellent: posts.filter(p => scoreContent(p) >= 80).length,
      good: posts.filter(p => scoreContent(p) >= 60 && scoreContent(p) < 80).length,
      average: posts.filter(p => scoreContent(p) >= 40 && scoreContent(p) < 60).length,
      poor: posts.filter(p => scoreContent(p) < 40).length
    },
    avg_score: Math.round(posts.reduce((s, p) => s + scoreContent(p), 0) / posts.length),
    top_scored: posts.map(p => ({ title: p.title, score: scoreContent(p), likes: p.likes }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  };
}

module.exports = {
  extractTitleFormulas,
  extractStructurePatterns,
  analyzeKeywords,
  scoreContent,
  benchmarkAgainstTop,
  analyze
};
