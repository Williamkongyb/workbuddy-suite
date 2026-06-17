/**
 * M2 AI内容生成器 — Generator Service v2.0
 * 负责：基于 DeepSeek API + 爆款模板生成原创内容（通用品类，不限于AI）
 */

const https = require('https');
const collector = require('./collector');
const analyzer = require('./analyzer');
const formatter = require('./formatter');

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.SF_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 品类关键词映射表（用于智能推断行业语境）
const INDUSTRY_KEYWORDS = {
  '美妆护肤': ['美妆', '护肤', '化妆', '口红', '粉底', '面膜', '眼影', '防晒', '卸妆', '彩妆', '素颜', '变美'],
  '美食烹饪': ['美食', '做饭', '菜谱', '烘焙', '甜品', '早餐', '晚餐', '小吃', '探店', '减脂餐', '家常菜'],
  '穿搭时尚': ['穿搭', '衣服', '时尚', '搭配', '裙子', '鞋子', '包包', '配饰', '显瘦', '显高', '职场穿搭'],
  '家居生活': ['家居', '装修', '收纳', '改造', '租房', '新房', '布置', '清洁', '好物', '电器'],
  '旅行攻略': ['旅行', '旅游', '酒店', '民宿', '景点', '攻略', '打卡', '周末', '自驾', '出国'],
  '宠物生活': ['宠物', '猫', '狗', '猫咪', '狗狗', '猫粮', '猫砂', '养猫', '养狗', '撸猫'],
  '健身运动': ['健身', '减肥', '运动', '跑步', '瑜伽', '增肌', '燃脂', '塑形', '撸铁', '跳绳'],
  '数码科技': ['数码', '手机', '电脑', '耳机', '平板', '相机', '智能', '开箱', '测评', '黑科技'],
  '效率工具': ['AI', '效率', '工具', '效率提升', '工作流', '自动化', '神器', 'Chrome插件', '快捷键'],
  '母婴育儿': ['母婴', '宝宝', '育儿', '怀孕', '待产', '奶粉', '纸尿裤', '早教', '产后', '月子'],
  '职场成长': ['职场', '面试', '简历', '跳槽', '涨薪', '管理', '领导力', '副业', '搞钱', '创业'],
  '情感生活': ['情感', '恋爱', '分手', '闺蜜', '婆媳', '单身', '相亲', '婚姻', '异地'],
};

/**
 * 智能推断品类
 */
function detectIndustry(topic) {
  const t = topic.toLowerCase();
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const kw of keywords) {
      if (t.includes(kw.toLowerCase())) return industry;
    }
  }
  return '通用';
}

/**
 * 调用 DeepSeek Chat API
 */
function callDeepSeek(messages, temperature = 0.7) {
  return new Promise((resolve, reject) => {
    if (!DEEPSEEK_API_KEY) {
      reject(new Error('DeepSeek API Key 未配置。请设置环境变量 SF_API_KEY'));
      return;
    }

    const data = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens: 4096,
      stream: false
    });

    const options = {
      hostname: DEEPSEEK_API_URL,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            reject(new Error(`DeepSeek API Error: ${json.error.message || JSON.stringify(json.error)}`));
            return;
          }
          resolve(json.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error(`DeepSeek 响应解析失败: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`DeepSeek 请求失败: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DeepSeek 请求超时 (60s)'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * 获取爆款模板作为生成参考（尝试按品类筛选，没数据时返回通用模板）
 */
function getTemplateContext(category = '通用') {
  const topPosts = collector.getTopPosts(10);
  
  // 先尝试按品类筛选
  let relevantPosts = topPosts.filter(p => p.category === category);
  if (relevantPosts.length < 3) {
    // 品类数据不足，使用全部数据
    relevantPosts = topPosts;
  }

  const analysis = analyzer.extractTitleFormulas(relevantPosts);
  const structures = analyzer.extractStructurePatterns(relevantPosts);
  const keywords = analyzer.analyzeKeywords(relevantPosts);

  const templateSummary = relevantPosts.slice(0, 5).map((p, i) =>
    `${i + 1}. 《${p.title}》 — 点赞${p.likes || 0} 收藏${p.collects || 0} — 结构:${p.structure?.body_type || '未知'}`
  ).join('\n');

  const formulaSummary = analysis.formulas.map(f =>
    `- ${f.name}: ${f.template} (${f.effectiveness})`
  ).join('\n');

  return {
    template_summary: templateSummary || '暂无参考数据',
    title_formulas: formulaSummary || '暂无标题公式',
    recommended_structure: structures.recommended_structure || {},
    top_keywords: keywords.top_keywords?.slice(0, 10).map(k => k.keyword).join('、') || '',
    top_hashtags: keywords.top_hashtags?.slice(0, 8).map(h => h.hashtag).join(' ') || ''
  };
}

/**
 * 构建生成 Prompt（通用版，适配任何品类）
 */
function buildGenerationPrompt(topic, platform, templateContext, options = {}) {
  const { count = 1, style = 'auto', keywords = [] } = options;

  const platformConfig = formatter.PLATFORM_CONFIGS[platform] || formatter.PLATFORM_CONFIGS.general;
  const industry = detectIndustry(topic);

  return {
    system: `你是一位资深的多品类内容创作者，精通小红书、公众号、抖音、知乎、B站等全平台爆款文案写作。

你的写作原则（适用于任何品类）：
- 口语化、有网感、像朋友在真诚分享
- 善用短句、emoji、感叹号增加阅读节奏
- 开头3秒抓人（痛点/数据/悬念/故事）
- 正文有结构有干货，不是泛泛而谈
- 结尾引导互动（收藏/评论/关注）

当前写作品类：${industry}

平台要求：${platformConfig.name}
- 风格：${platformConfig.style}
- ${platformConfig.requirements.join('\n- ')}`,

    user: `请根据以下信息，为「${industry}」品类生成${count}篇${platformConfig.name}文案。

【创作主题】
${topic}

${keywords.length > 0 ? `【关键词要求】\n请融入这些关键词：${keywords.join('、')}` : ''}

${templateContext.template_summary !== '暂无参考数据' ? `【爆款参考模板】
以下是该平台 Top 爆款的结构参考：
${templateContext.template_summary}

【标题公式参考】
${templateContext.title_formulas}

【推荐结构】
- 开头：${templateContext.recommended_structure?.opening || '痛点引入 + 数据冲击'}
- 正文：${templateContext.recommended_structure?.body || '分点展开 + 对比分析'}
- 结尾：${templateContext.recommended_structure?.closing || '总结 + 推荐 + 行动号召'}

【参考关键词】
${templateContext.top_keywords}

【参考标签】
${templateContext.top_hashtags}
` : `【注意】该品类暂无历史爆款数据参考。请根据你对「${industry}」品类的理解自由创作，保持${platformConfig.name}的内容风格。

通用写作建议：
- 开头：痛点引入 + 数据冲击（如有）或 个人故事/经历
- 正文：分点展开 + 真实案例/细节 + 个人经验
- 结尾：总结推荐 + 引导收藏评论关注`}

【输出格式】
请严格按以下JSON格式输出（只输出JSON，不要其他内容）：

{
  "posts": [
    {
      "title": "标题（${platformConfig.name === '小红书' ? '20字以内，含数字+情绪词' : '60字以内，抓人眼球'}）",
      "body": "正文（${platformConfig.style}风格，结构清晰：开头钩子+干货正文+结尾互动引导。要具体、有细节、让人想收藏。）",
      "hashtags": ["#标签1", "#标签2", "#标签3", "#标签4", "#标签5"],
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "cta": "行动号召语（引导收藏/评论/关注）"
    }
  ]
}

请确保内容100%原创，贴合「${industry}」品类的真实用户需求和${platformConfig.name}的平台调性。`
  };
}

/**
 * 生成内容
 */
async function generate(topic, platform, options = {}) {
  const industry = detectIndustry(topic);
  const templateContext = getTemplateContext(industry);

  const prompt = buildGenerationPrompt(topic, platform, templateContext, options);

  try {
    const response = await callDeepSeek([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ], options.temperature || 0.75);

    // 解析JSON响应
    let parsed;
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(response);
      }
    } catch (e) {
      // AI返回的不是纯JSON，尝试结构化提取
      return {
        raw: response,
        parse_error: e.message,
        posts: [{
          title: topic,
          body: response,
          hashtags: [],
          keywords: [],
          cta: ''
        }]
      };
    }

    const posts = (parsed.posts || [parsed]).map(p => ({
      ...p,
      platform: platform,
      topic: topic,
      industry: industry,
      generated_at: new Date().toISOString()
    }));

    return {
      posts,
      template_used: templateContext,
      generation_info: {
        model: DEEPSEEK_MODEL,
        platform: platform,
        topic: topic,
        industry: industry,
        post_count: posts.length
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 生成 + 对标评分
 */
async function generateAndBenchmark(topic, platform, options = {}) {
  // 先生成
  const generated = await generate(topic, platform, options);
  const topPosts = collector.getTopPosts(10);

  // 每篇生成内容对标
  const benchmarked = generated.posts.map(post => ({
    ...post,
    benchmark: analyzer.benchmarkAgainstTop(post, topPosts)
  }));

  return {
    ...generated,
    posts: benchmarked,
    benchmark_summary: {
      avg_original_score: Math.round(benchmarked.reduce((s, p) => s + p.benchmark.original_score, 0) / benchmarked.length),
      avg_benchmark_score: Math.round(benchmarked.reduce((s, p) => s + p.benchmark.benchmark_avg_score, 0) / benchmarked.length),
      qualified_count: benchmarked.filter(p => p.benchmark.verdict.includes('✅')).length,
      total_count: benchmarked.length
    }
  };
}

/**
 * 健康检查
 */
async function healthCheck() {
  if (!DEEPSEEK_API_KEY) {
    return { status: 'degraded', reason: 'API Key 未配置' };
  }
  try {
    await callDeepSeek([{ role: 'user', content: '回复OK' }], 0.1);
    return { status: 'ok', model: DEEPSEEK_MODEL };
  } catch (e) {
    return { status: 'error', reason: e.message };
  }
}

module.exports = {
  generate,
  generateAndBenchmark,
  healthCheck,
  callDeepSeek,
  getTemplateContext,
  detectIndustry
};
