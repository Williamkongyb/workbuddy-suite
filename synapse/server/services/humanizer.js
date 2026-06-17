/**
 * Humanizer — 去AI味引擎 v1.0
 * 解决AI文案最大的痛点：一眼就能看出是AI写的
 * 
 * 功能:
 * 1. AI痕迹检测 → 标记 → 评分
 * 2. 去AI味改写 → 注入口语化规则
 * 3. 输出AI味评分（0-100，越低越像人写）
 */

const generator = require('./generator');

/**
 * AI痕迹特征库
 * 这些是AI文本最常见的"指纹"
 */
const AI_FINGERPRINTS = [
  // 句式特征
  { pattern: /总的来说|综上所述|总而言之|首先.*其次.*最后/g, label: '套话开头/结尾', weight: 8 },
  { pattern: /不仅.*而且.*更/g, label: '递进套话', weight: 5 },
  { pattern: /值得.*的是/g, label: 'AI高频句式', weight: 3 },
  { pattern: /在.*的.*下/g, label: '介词框架僵硬', weight: 4 },

  // 词汇特征
  { pattern: /赋能|抓手|闭环|打法|底层逻辑|颗粒度|组合拳/g, label: '互联网黑话', weight: 6 },
  { pattern: /不可或缺|至关重要|不容忽视|引人入胜/g, label: 'AI高频词汇', weight: 5 },
  { pattern: /它不仅仅是.*更是/g, label: 'AI句式模板', weight: 6 },
  { pattern: /可以(帮助|让|使)我们/g, label: '说教腔', weight: 4 },

  // 结构特征
  { pattern: /第[一二三四五六七八九十]\S{0,2}[，,]|首先[，,]|其次[，,]|最后[，,]/g, label: '机械列举', weight: 5 },
  { pattern: /(?:建议|推荐)如下[：:]/g, label: 'AI建议腔', weight: 3 },
  { pattern: /希望能够?(?:帮助|对.*有帮助)/g, label: 'AI结尾套话', weight: 2 },
  { pattern: /.*?。\n.*?。\n.*?。/g, label: '单调句长', weight: 3 },

  // emoji特征
  { pattern: /✨|💡|🔥|📢|🎯|🚀|💪|📌|⭐/g, label: 'AI高频emoji', weight: 2 },
];

/**
 * 人写特征（加分项）
 */
const HUMAN_FINGERPRINTS = [
  { pattern: /卧槽|哈哈|笑死|救命|离谱|绝了|牛啊/g, label: '口语词', weight: 3 },
  { pattern: /我.*真的.*服|谁懂啊|咱就是说/g, label: '网络热梗', weight: 3 },
  { pattern: /[。！？]\s*[。！？]/g, label: '重复标点', weight: 1 },
  { pattern: /~(?!\/)/g, label: '波浪线口语', weight: 2 },
  { pattern: /别杠|实话实说|亲测|踩过坑|避雷/g, label: '真实分享信号', weight: 3 },
];

/**
 * 检测AI痕迹
 * 返回: score (0-100, 越低越像人写), fingerprints[], suggestions[]
 */
function detectAI(content) {
  const text = typeof content === 'string' ? content : content.body || '';
  const result = { score: 50, fingerprints: [], suggestions: [], detail: [] };

  let aiScore = 0;
  let humanScore = 0;

  // 1. 检测AI特征
  for (const fp of AI_FINGERPRINTS) {
    const matches = text.match(fp.pattern);
    if (matches) {
      aiScore += fp.weight * Math.min(matches.length, 3);
      result.detail.push({
        type: 'ai',
        label: fp.label,
        count: matches.length,
        weight: fp.weight,
        examples: [...new Set(matches)].slice(0, 3)
      });
      result.fingerprints.push(fp.label);
    }
  }

  // 2. 检测人写特征
  for (const fp of HUMAN_FINGERPRINTS) {
    const matches = text.match(fp.pattern);
    if (matches) {
      humanScore += fp.weight * Math.min(matches.length, 2);
      result.detail.push({
        type: 'human',
        label: fp.label,
        count: matches.length,
        weight: fp.weight
      });
    }
  }

  // 3. 统计句式多样性
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 0);
  if (sentences.length > 3) {
    const lengths = sentences.map(s => s.length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((s, l) => s + Math.pow(l - avgLen, 2), 0) / lengths.length;

    // 句长方差小 = 单调 = AI痕迹重
    if (variance < 20) {
      aiScore += 5;
      result.detail.push({ type: 'ai', label: '句长单一（方差<20）', variance: Math.round(variance) });
    } else if (variance > 80) {
      humanScore += 3;
      result.detail.push({ type: 'human', label: '句长变化自然（方差>80）', variance: Math.round(variance) });
    }

    // 平均句长15-25最像人写
    if (avgLen >= 12 && avgLen <= 28) {
      humanScore += 2;
    }
  }

  // 4. 计算最终得分
  const maxPossible = 100;
  const rawScore = Math.min(maxPossible, Math.max(0, 50 + aiScore - humanScore));

  result.score = Math.round(rawScore);
  result.ai_fingerprints = result.fingerprints.filter(f => result.detail.find(d => d.type === 'ai' && d.label === f));
  result.human_indicators = result.detail.filter(d => d.type === 'human').map(d => d.label);

  // 生成建议
  if (result.score > 60) {
    result.suggestions.push('建议使用"去AI味"功能进行改写');
    if (result.fingerprints.includes('AI高频句式')) {
      result.suggestions.push('减少"值得...的是"、"在...的...下"等AI套话句式');
    }
    if (result.fingerprints.includes('互联网黑话')) {
      result.suggestions.push('减少"赋能""抓手""闭环"等互联网黑话，换成大白话');
    }
    if (result.fingerprints.includes('机械列举')) {
      result.suggestions.push('避免"首先...其次...最后"的机械列举，用自然过渡');
    }
    if (result.detail.find(d => d.label === '句长单一（方差<20）')) {
      result.suggestions.push('尝试长短句交替，打破单一节奏');
    }
  }

  result.level = result.score <= 30 ? '🎭 很像人写的'
    : result.score <= 50 ? '👌 比较自然'
    : result.score <= 70 ? '🤖 有点AI味'
    : '🤖🤖 AI味较重';

  return result;
}

/**
 * 去AI味改写
 * 用DeepSeek执行人化改写
 */
async function humanize(content, options = {}) {
  const { intensity = 'medium', platform = 'xiaohongshu' } = options;
  const text = typeof content === 'string' ? content : content.body || JSON.stringify(content);
  const title = typeof content === 'object' ? content.title : '';

  // 先检测当前AI味
  const originalScore = detectAI(text);

  const intensityMap = {
    light: '轻度人化：主要修掉AI套话和僵硬句式',
    medium: '中度人化：模拟真实创作者的写作习惯，像朋友在聊天',
    heavy: '重度人化：深度改写，模拟真人打字（偶尔的不完美也是真实感的一部分）'
  };

  const systemPrompt = `你是一位"去AI味"专家，专治AI写的文案太假。

你的改写铁律：
1. 禁用"首先其次最后"、"总而言之"、"值得...的是"等AI套话
2. 禁用"赋能""抓手""闭环""颗粒度"等互联网黑话
3. 长句拆短，最长不超过25个字
4. 随机加语气词：说实话、讲真、离谱的是、重点是、关键在于
5. 用第一人称"我"来写，像朋友分享
6. 允许不完美：偶尔用省略号...、问句、反问
7. 像在微信聊天，不是在写论文
8. 保留核心干货信息

平台适配：${platform}
${intensityMap[intensity] || intensityMap.medium}`;

  const userPrompt = `请对以下内容进行去AI味改写：

${title ? `【原标题】${title}\n\n` : ''}【待改写内容】
${text}

【当前AI味评分】${originalScore.score}/100 (${originalScore.level})

请按JSON格式输出：
{
  "title": "人化后的标题",
  "body": "人化后的正文（像朋友在聊天，不要有AI味）",
  "human_score": 预估人化后的AI味评分(0-100, 越低越像人),
  "changes_made": ["具体改了什么1", "具体改了什么2"]
}`;

  try {
    const response = await generator.callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.85);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { title, body: response, human_score: originalScore.score - 20, changes_made: ['全部改写'] };

    // 再检测一次人化后的AI味
    const newScore = detectAI(result.body || result);

    return {
      mode: 'humanize',
      intensity,
      original_ai_score: originalScore.score,
      original_level: originalScore.level,
      humanized: result,
      new_ai_score: newScore.score,
      new_level: newScore.level,
      improvement: originalScore.score - newScore.score,
      generated_at: new Date().toISOString()
    };
  } catch (e) {
    throw new Error(`去AI味改写失败: ${e.message}`);
  }
}

module.exports = {
  detectAI,
  humanize
};
