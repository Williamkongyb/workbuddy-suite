/**
 * Compliance Service — 合规检测增强版 v2.0
 * 对标: 句易网 (1835违禁词+19189敏感词+图片检测)
 * 
 * 三层检测策略:
 * L1: 本地词库快速匹配（0延迟，500+词）
 * L2: DeepSeek语义深度检测（变体违禁词、绕过写法）
 * L3: 平台规则引擎（不同平台的差异化规则）
 */

const fs = require('fs');
const path = require('path');
const generator = require('./generator');

// 词库路径
const BANNED_PATH = path.join(__dirname, '..', 'data', 'banned-words.json');

/**
 * 加载词库
 */
function loadBannedWords() {
  try {
    return JSON.parse(fs.readFileSync(BANNED_PATH, 'utf-8'));
  } catch (e) {
    return { categories: {}, platform_rules: {} };
  }
}

/**
 * L1: 本地词库快速检测
 */
function localCheck(content, platform) {
  const bannedData = loadBannedWords();
  const violations = [];
  const allWords = [];

  // 收集所有品类违禁词
  const categoryMap = {};
  Object.entries(bannedData.categories).forEach(([cat, data]) => {
    data.words.forEach(word => {
      allWords.push(word);
      categoryMap[word] = { category: cat, description: data.description };
    });
  });

  // 检查内容
  const text = content.toLowerCase();
  for (const word of allWords) {
    if (text.includes(word.toLowerCase())) {
      const catInfo = categoryMap[word];
      violations.push({
        word,
        category: catInfo.category,
        description: catInfo.description,
        detection_method: 'keyword_match'
      });
    }
  }

  // 检查平台特殊规则
  if (platform && bannedData.platform_rules[platform]) {
    const rule = bannedData.platform_rules[platform];
    rule.extra_banned.forEach(word => {
      if (text.includes(word.toLowerCase())) {
        violations.push({
          word,
          category: 'platform_rule',
          description: rule.description,
          detection_method: 'platform_keyword'
        });
      }
    });
  }

  // 计算评分
  const basePenalty = 5;
  const score = Math.max(0, 100 - violations.length * basePenalty);

  return {
    score,
    passed: score >= 80,
    violations: violations.map(v => v.word),
    violation_details: violations,
    total_flagged: violations.length,
    detection_method: 'keyword_match'
  };
}

/**
 * L2: AI语义深度检测
 * 检测变体写法：如"zui好""第①""蕞好""醉爱"等绕过常用检测的写法
 */
async function aiDeepCheck(content, platform) {
  const text = typeof content === 'string' ? content : content.body || JSON.stringify(content);

  const systemContext = platform
    ? `当前检测平台: ${platform}，请根据该平台的广告规范和内容审核标准进行检测。`
    : '';

  const prompt = `你是一位资深广告法合规审核专家。请严格审查以下内容是否存在违规风险。

${systemContext}

检测维度：
1. **变体绝对化用词**: 检测同音字/拆字/符号替换的极限词（如"蕞好""第①""zui爱"等）
2. **暗示性功效宣称**: "用了一周就..."、"皮肤像剥了壳的鸡蛋"等变相功效宣称
3. **虚假承诺变体**: "保证有效""无效退款""用了就知道"等
4. **引流传导**: 微信号变体（VX/威❤/薇）、链接暗示等
5. **贬低竞品**: 含沙射影的比较
6. **整体风险评级**: 低/中/高/极高

【待审内容】
${text}

请严格按JSON格式输出：
{
  "risk_level": "low|medium|high|critical",
  "violations": [
    {"word": "违规词", "reason": "违规原因（一句话）", "severity": "high|medium|low"}
  ],
  "suggestions": ["修改建议1", "修改建议2"],
  "overall_assessment": "一句话总体评价"
}`;

  try {
    const response = await generator.callDeepSeek([
      { role: 'user', content: prompt }
    ], 0.3);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {
      risk_level: 'unknown',
      violations: [],
      suggestions: ['AI检测失败，请手动检查'],
      overall_assessment: 'AI检测未完成'
    };
  } catch (e) {
    return {
      risk_level: 'unknown',
      violations: [],
      suggestions: [`AI检测失败: ${e.message}`],
      overall_assessment: 'AI服务不可用'
    };
  }
}

/**
 * 完整合规检测：L1(快速) + L2(AI深度) + L3(平台规则)
 */
async function fullCheck(content, options = {}) {
  const { platform, enable_ai = true } = options;
  const text = typeof content === 'string' ? content : content.body || content.title || JSON.stringify(content);

  // L1: 本地词库
  const localResult = localCheck(text, platform);

  // L2: AI深度检测
  let aiResult = null;
  if (enable_ai && generator.callDeepSeek) {
    try {
      aiResult = await aiDeepCheck(text, platform);
    } catch (e) {
      aiResult = { error: e.message };
    }
  }

  // 合并结果
  const allViolations = [...(localResult.violation_details || [])];
  if (aiResult?.violations?.length > 0) {
    aiResult.violations.forEach(v => {
      allViolations.push({
        word: v.word,
        category: 'ai_detected',
        description: v.reason,
        severity: v.severity || 'medium',
        detection_method: 'ai_semantic'
      });
    });
  }

  // 综合评分
  const aiPenalty = aiResult?.violations?.length || 0;
  const combinedScore = Math.max(0, 100 - (localResult.violations.length * 5) - (aiPenalty * 3));

  return {
    score: combinedScore,
    passed: combinedScore >= 80,
    risk_level: aiResult?.risk_level || (combinedScore >= 80 ? 'low' : combinedScore >= 60 ? 'medium' : 'high'),
    total_violations: allViolations.length,
    local_check: {
      violations_count: localResult.total_flagged,
      details: localResult.violation_details
    },
    ai_check: aiResult ? {
      violations_count: aiResult.violations?.length || 0,
      violations: aiResult.violations || [],
      risk_level: aiResult.risk_level,
      overall_assessment: aiResult.overall_assessment
    } : null,
    all_violations: allViolations,
    suggestions: [
      ...(localResult.violations.map(v => `删除或替换"${v.word}"（${v.description}）`)),
      ...(aiResult?.suggestions || [])
    ],
    checked_at: new Date().toISOString()
  };
}

module.exports = {
  localCheck,
  aiDeepCheck,
  fullCheck
};
