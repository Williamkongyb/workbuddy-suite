/**
 * Brand Brain — 品牌记忆层 v1.0
 * 对标: Jasper Brand Voice ($69/月核心功能)
 * 
 * 功能:
 * 1. 品牌信息 CRUD（名称/标语/调性/禁忌词/目标受众）
 * 2. 上传范文 → AI提取语调特征 → 存储
 * 3. 生成时自动注入品牌语调到 Prompt
 * 4. 品牌一致性评分（检测内容是否偏离品牌语调）
 */

const fs = require('fs');
const path = require('path');

// 品牌配置存储路径
const BRAND_PATH = path.join(__dirname, '..', 'data', 'brand-profile.json');
// 默认品牌配置
const DEFAULT_PROFILE = {
  version: '1.0',
  name: '',
  slogan: '',
  industry: '',
  tone: {
    personality: [],       // 人格标签: ['专业', '亲和', '幽默']
    voice_style: '',       // 语调风格描述
    taboo_words: [],       // 品牌禁忌词
    keywords: [],          // 品牌关键词
    audience: '',          // 目标受众
    sample_style: ''       // 范文风格总结
  },
  samples: [],             // 上传的品牌范文
  created_at: '',
  updated_at: ''
};

function readBrandProfile() {
  try {
    if (fs.existsSync(BRAND_PATH)) {
      return JSON.parse(fs.readFileSync(BRAND_PATH, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_PROFILE };
}

function writeBrandProfile(profile) {
  const dir = path.dirname(BRAND_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  profile.updated_at = new Date().toISOString();
  if (!profile.created_at) profile.created_at = new Date().toISOString();
  fs.writeFileSync(BRAND_PATH, JSON.stringify(profile, null, 2), 'utf-8');
  return profile;
}

/**
 * 获取品牌配置
 */
function getBrand() {
  return readBrandProfile();
}

/**
 * 保存/更新品牌信息
 */
function saveBrand(data) {
  const current = readBrandProfile();
  const updated = {
    ...current,
    name: data.name || current.name,
    slogan: data.slogan || current.slogan,
    industry: data.industry || current.industry,
    tone: {
      ...current.tone,
      personality: data.tone?.personality || current.tone?.personality || [],
      voice_style: data.tone?.voice_style || current.tone?.voice_style || '',
      taboo_words: data.tone?.taboo_words || current.tone?.taboo_words || [],
      keywords: data.tone?.keywords || current.tone?.keywords || [],
      audience: data.tone?.audience || current.tone?.audience || '',
      sample_style: current.tone?.sample_style || ''
    },
    samples: data.samples || current.samples || []
  };
  return writeBrandProfile(updated);
}

/**
 * AI分析品牌语调
 * 上传3-5篇品牌范文 → DeepSeek提取语调特征
 */
async function analyzeTone(samples, callDeepSeek) {
  if (!samples || samples.length === 0) {
    throw new Error('请至少提供1篇品牌范文');
  }
  if (!callDeepSeek) {
    throw new Error('需要传入 callDeepSeek 函数');
  }

  const sampleText = samples.map((s, i) => `范文${i + 1}: ${typeof s === 'string' ? s : s.content || s}`).join('\n\n---\n\n');

  const systemPrompt = `你是一位品牌语调分析专家。你的任务是分析品牌文案的风格特征。
请从以下维度提取：

1. **人格特征** (personality): 选出最匹配的3-5个标签，如: 专业/亲和/幽默/犀利/温暖/理性/种草/热血/治愈/毒舌/学术/文艺/接地气
2. **语调风格** (voice_style): 一句话总结语调特征，含句式特点（长短句偏好/是否用emoji/感叹号频率/第一人称vs第三人称）
3. **品牌关键词** (keywords): 高频出现的品牌专属词汇（5-10个）
4. **禁忌特征** (taboo): 品牌应该避免的风格或词汇
5. **目标受众画像** (audience): 推断的目标用户群体
6. **写作DNA总结** (dna_summary): 100字以内，高度凝练的品牌写作基因

请严格按JSON格式输出，不要其他内容。`;

  const userPrompt = `请分析以下品牌范文，提取语调特征：\n\n${sampleText}`;

  try {
    const response = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.3);

    // 解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!analysis) {
      throw new Error('AI分析结果解析失败');
    }

    // 更新品牌配置
    const updated = saveBrand({
      tone: {
        personality: analysis.personality || [],
        voice_style: analysis.voice_style || '',
        taboo_words: analysis.taboo || [],
        keywords: analysis.keywords || [],
        audience: analysis.audience || '',
        sample_style: analysis.dna_summary || ''
      },
      samples: samples.map((s, i) => ({
        index: i + 1,
        content: typeof s === 'string' ? s : s.content || s,
        added_at: new Date().toISOString()
      }))
    });

    return {
      analysis,
      profile: updated
    };
  } catch (e) {
    throw new Error(`品牌语调分析失败: ${e.message}`);
  }
}

/**
 * 将品牌语调注入系统Prompt
 * 返回增强后的system prompt文本
 */
function injectBrandVoice(baseSystemPrompt) {
  const brand = readBrandProfile();
  
  // 如果品牌信息几乎为空，不加注入
  if (!brand.name && (!brand.tone?.personality || brand.tone.personality.length === 0)) {
    return baseSystemPrompt;
  }

  const parts = [];

  if (brand.name) {
    parts.push(`品牌名称: ${brand.name}${brand.slogan ? ` — 「${brand.slogan}」` : ''}`);
  }

  if (brand.tone?.personality?.length > 0) {
    parts.push(`品牌人格: ${brand.tone.personality.join('、')}`);
  }

  if (brand.tone?.voice_style) {
    parts.push(`语调风格: ${brand.tone.voice_style}`);
  }

  if (brand.tone?.keywords?.length > 0) {
    parts.push(`品牌关键词: ${brand.tone.keywords.join('、')}`);
  }

  if (brand.tone?.audience) {
    parts.push(`目标受众: ${brand.tone.audience}`);
  }

  if (brand.tone?.taboo_words?.length > 0) {
    parts.push(`禁忌: 避免使用以下风格或词汇 — ${brand.tone.taboo_words.join('、')}`);
  }

  if (brand.tone?.sample_style) {
    parts.push(`品牌DNA: ${brand.tone.sample_style}`);
  }

  const brandBlock = [
    '\n【品牌语调约束 — 必须遵守】',
    ...parts.map(p => `- ${p}`),
    '请确保生成内容严格符合以上品牌语调，保持一致的风格和调性。\n'
  ].join('\n');

  return baseSystemPrompt + '\n' + brandBlock;
}

/**
 * 品牌一致性评分
 * 检查内容是否符合品牌语调
 */
async function checkConsistency(content, callDeepSeek) {
  const brand = readBrandProfile();

  if (!brand.name || (!brand.tone?.sample_style && !brand.tone?.voice_style)) {
    return {
      score: 100,
      verdict: '品牌信息未完整配置，跳过一致性检查',
      issues: [],
      suggestions: ['建议先完成 Brand Brain 配置以获得准确的一致性检查']
    };
  }

  if (!callDeepSeek) {
    return {
      score: null,
      verdict: 'AI服务不可用，无法检查',
      issues: [],
      suggestions: []
    };
  }

  const brandSummary = [
    brand.name ? `品牌: ${brand.name}` : '',
    brand.tone?.personality?.length > 0 ? `人格: ${brand.tone.personality.join('、')}` : '',
    brand.tone?.voice_style ? `语调: ${brand.tone.voice_style}` : '',
    brand.tone?.sample_style ? `DNA: ${brand.tone.sample_style}` : '',
    brand.tone?.taboo_words?.length > 0 ? `禁忌: ${brand.tone.taboo_words.join('、')}` : ''
  ].filter(Boolean).join('\n');

  const prompt = `你是一位品牌一致性审核官。请检查以下内容是否符合品牌语调。

【品牌标准】
${brandSummary}

【待检查内容】
${typeof content === 'string' ? content : content.body || JSON.stringify(content)}

请给出：
1. 一致性评分 (0-100)，80分以上为及格
2. 不合格的具体问题列表
3. 修改建议

请按JSON格式输出：{"score": 数字, "issues": ["问题1", "问题2"], "suggestions": ["建议1", "建议2"], "verdict": "通过/不通过"}`;

  try {
    const response = await callDeepSeek([
      { role: 'user', content: prompt }
    ], 0.3);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, issues: ['无法解析分析结果'], suggestions: [], verdict: '检查失败' };

    return {
      score: result.score || 0,
      verdict: result.verdict || (result.score >= 80 ? '通过' : '不通过'),
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      brand_name: brand.name
    };
  } catch (e) {
    return {
      score: null,
      verdict: `检查异常: ${e.message}`,
      issues: [],
      suggestions: []
    };
  }
}

module.exports = {
  getBrand,
  saveBrand,
  analyzeTone,
  injectBrandVoice,
  checkConsistency
};
