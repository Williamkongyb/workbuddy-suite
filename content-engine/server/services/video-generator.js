/**
 * M3 视频生成器 — Video Generator Service v1.1
 * 向后兼容层：所有函数委托给 video-engine.js 的多引擎实现
 */
const { getEngine } = require('./video-engine');
const kling = getEngine('kling');
async function generateVideo(text, options = {}, callDeepSeek) { return kling.generate(text, options, callDeepSeek); }
async function checkStatus(taskId) { return kling.checkStatus(taskId); }
function getHistory(limit = 20) { return kling.getHistory(limit); }
module.exports = { generateVideo, checkStatus, getHistory };
