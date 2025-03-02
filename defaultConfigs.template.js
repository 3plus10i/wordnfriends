/**
 * 默认API配置模板
 * 此文件应该被包含在版本控制中，但不包含真实的API密钥
 * 使用时，复制为defaultConfigs.js并填入自己的密钥
 */
const DEFAULT_CONFIGS = [
    {
        id: "siliconflow",
        name: "硅基流动/DeepSeek",
        baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
        model: "deepseek-ai/DeepSeek-V3",
        apiKey: "YOUR_SILICON_FLOW_API_KEY", // 请替换为您的API密钥
        isDefault: true
    },
    {
        id: "doubao",
        name: "火山方舟引擎",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        model: "doubao-1-5-lite-32k-250115",
        apiKey: "YOUR_DOUBAO_API_KEY", // 请替换为您的API密钥
        isDefault: false
    }
];

// 如果在浏览器环境中，将配置直接暴露为全局变量
if (typeof window !== 'undefined') {
    window.DEFAULT_API_CONFIGS = DEFAULT_CONFIGS;
}

// 如果在Node.js环境中，导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_CONFIGS;
}
