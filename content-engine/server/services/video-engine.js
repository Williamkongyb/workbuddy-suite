/**
 * Synapse 视频引擎抽象层 v1.0
 * 
 * 策略模式：定义 VideoEngine 抽象基类，各引擎独立实现
 * 当前引擎：KlingEngine（可灵）— 主力
 * 预留引擎：JimengEngine（即梦）— 字节系副引擎
 * 
 * 用法：
 *   const engine = getEngine('kling');
 *   await engine.generate(text, options, callDeepSeek);
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const VIDEO_HISTORY_PATH = path.join(DATA_DIR, 'video-history.json');

// ==================== 通用工具 ====================

function httpRequest(baseHost, urlPath, body, apiKey, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: baseHost,
      path: urlPath,
      method: body ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data, 'utf-8') } : {})
      },
      timeout
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`API timeout ${timeout}ms`)); });
    if (data) req.write(data);
    req.end();
  });
}

function loadHistory() {
  try {
    if (fs.existsSync(VIDEO_HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(VIDEO_HISTORY_PATH, 'utf-8')).tasks || [];
    }
  } catch (e) { /* ignore */ }
  return [];
}

function saveHistory(tasks) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(VIDEO_HISTORY_PATH, JSON.stringify({
    updated: new Date().toISOString(), tasks
  }, null, 2), 'utf-8');
}

// ==================== 抽象基类 ====================

class VideoEngine {
  constructor(name) {
    if (new.target === VideoEngine) {
      throw new Error('VideoEngine 是抽象类，不能直接实例化');
    }
    this.name = name;
  }

  async generate(text, options, callDeepSeek) {
    throw new Error('子类必须实现 generate()');
  }

  async checkStatus(taskId) {
    throw new Error('子类必须实现 checkStatus()');
  }

  getHistory(limit = 20) {
    const engineHistory = loadHistory().filter(t => t.engine === this.name);
    return engineHistory.slice(0, limit);
  }

  getStatus() {
    return 'degraded';
  }
}

// ==================== 可灵引擎 ====================

const KLING_BASE = 'api.klingapi.com';
const KLING_PATH = '/v1';

class KlingEngine extends VideoEngine {
  constructor() {
    super('kling');
    this.apiKey = process.env.KLING_API_KEY || '';
    this.defaultOptions = {
      model: 'kling-v2.6-std',
      duration: 5,
      aspect_ratio: '16:9',
      mode: 'standard'
    };
  }

  getStatus() {
    return this.apiKey ? 'ok' : 'unconfigured';
  }

  async optimizePrompt(text, callDeepSeek) {
    if (!callDeepSeek) {
      return text.replace(/[，。！？、]/g, ' ').trim() + ', cinematic quality, 4K';
    }
    const systemPrompt = `你是一个视频脚本优化专家。将用户的中文文案转化为一个高质量的英文视频生成提示词(英文prompt)。
要求：
1. 用英文输出，适合AI视频生成模型
2. 包含场景描述、视觉风格、光照、色彩
3. 控制在100个单词以内
4. 添加高质量标签(如"cinematic, 4K, photorealistic")
5. 只输出prompt文本，不要解释`;

    try {
      const response = await callDeepSeek([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ], 0.7);
      return response.trim();
    } catch (e) {
      return text.replace(/[，。！？、]/g, ' ').trim() + ', cinematic quality';
    }
  }

  async generate(text, options = {}, callDeepSeek) {
    if (!this.apiKey) {
      throw new Error('KLING_API_KEY 环境变量未配置。请在 .env 中添加 KLING_API_KEY');
    }
    if (!text || typeof text !== 'string') {
      throw new Error('请提供有效的文案内容');
    }

    const promptOptimized = await this.optimizePrompt(text, callDeepSeek);

    const params = { ...this.defaultOptions, ...options, prompt: promptOptimized };
    const allowedKeys = ['model', 'prompt', 'duration', 'aspect_ratio', 'mode'];
    const payload = {};
    allowedKeys.forEach(k => { if (params[k] !== undefined) payload[k] = params[k]; });

    let response;
    try {
      response = await httpRequest(KLING_BASE, KLING_PATH + '/videos/text2video', payload, this.apiKey);
    } catch (e) {
      throw new Error(`可灵API调用失败: ${e.message}`);
    }

    const taskId = response.task_id || response.data?.task_id || response.id;
    if (!taskId) {
      throw new Error(`可灵API返回异常: ${JSON.stringify(response).slice(0, 200)}`);
    }

    const tasks = loadHistory();
    const record = {
      engine: 'kling',
      task_id: taskId,
      user_text: text.slice(0, 200),
      prompt_optimized: promptOptimized,
      options: { duration: params.duration, aspect_ratio: params.aspect_ratio, mode: params.mode },
      status: 'pending',
      video_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tasks.unshift(record);
    saveHistory(tasks);

    return { task_id: taskId, status: 'pending', prompt_optimized: promptOptimized, engine: 'kling' };
  }

  async checkStatus(taskId) {
    if (!this.apiKey) throw new Error('KLING_API_KEY 未配置');
    if (!taskId) throw new Error('需要 task_id');

    let response;
    try {
      response = await httpRequest(KLING_BASE, KLING_PATH + `/videos/${taskId}`, null, this.apiKey);
    } catch (e) {
      throw new Error(`查询任务状态失败: ${e.message}`);
    }

    const status = response.status || response.data?.status || 'unknown';
    const videoUrl = response.video_url || response.data?.video_url || response.result?.video_url || null;

    const tasks = loadHistory();
    const task = tasks.find(t => t.task_id === taskId);
    if (task) {
      task.status = status;
      if (videoUrl) task.video_url = videoUrl;
      task.updated_at = new Date().toISOString();
      saveHistory(tasks);
    }

    return { task_id: taskId, status, video_url: videoUrl, engine: 'kling', raw: response };
  }
}

// ==================== 即梦引擎（桩代码） ====================

class JimengEngine extends VideoEngine {
  constructor() {
    super('jimeng');
    this.apiKey = process.env.JIMENG_API_KEY || '';
  }

  getStatus() {
    return this.apiKey ? 'ok' : 'unconfigured';
  }

  async generate(text, options = {}) {
    throw new Error('即梦引擎尚未完成实现。请使用可灵引擎（kling）作为主力。');
  }

  async checkStatus(taskId) {
    throw new Error('即梦引擎尚未完成实现。');
  }
}

// ==================== 工厂方法 ====================

const ENGINES = {
  kling: new KlingEngine(),
  jimeng: new JimengEngine()
};

function getEngine(type = 'kling') {
  const engine = ENGINES[type];
  if (!engine) {
    throw new Error(`未知引擎类型: ${type}。可选: ${Object.keys(ENGINES).join(', ')}`);
  }
  return engine;
}

module.exports = {
  VideoEngine,
  KlingEngine,
  JimengEngine,
  getEngine,
  ENGINES
};
