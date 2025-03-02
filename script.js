// script.js
const BASE_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'deepseek-ai/DeepSeek-V3';
const MAX_TOKENS = 500;

// 难度级别映射
const difficulty_map = {
    "B": "初中到高中级，涵盖基础日常生活和简单学习场景，示例单词:apple, book, run, happy, school.",
    "A": "高考英语级，日常生活和基础学术词汇，示例单词:analyze, debate, environment, manage, strategy.",
    "S": "高考到大学四级，涉及更广泛的日常和基础学术话题。示例单词:philosophy, economy, innovate, perspective, diverse.",
    "SS": "高考到大学六级，包含更多学术和专业词汇，最高能够阅读新闻、文学作品和中级学术材料，示例单词:metaphor, hypothesis, bureaucracy, paradox, renaissance.",
    "SSS": "高考到托福6.5分级，涵盖常用学术和书面词汇，能够初步阅读科学文献，示例单词: paradigm, synthesis, epistemology, ontology, heuristic."
};

// 用户设置
let userSettings = {
    phoneticType: 'uk', // 'uk'为英式音标，'us'为美式音标
    friendNumber: 5,    // 联想词数量
    difficulty: 'A'     // 默认难度级别
};

// 流式处理
let isStreaming = false;
const decoder = new TextDecoder();

// 设置页脚文字
function setFooterText() {
    const modelName = MODEL.split('/').pop(); // 获取最后一段
    const footerElement = document.querySelector('.footer div');
    if (footerElement) {
        footerElement.textContent = `由 ${modelName} 强力驱动`;
    }
}

// 初始化控制面板
function initControlPanel() {
    // 初始化本地存储中的设置
    const savedSettings = localStorage.getItem('wordnfriends_settings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            // 合并设置，确保有默认值
            userSettings = {
                ...userSettings,
                ...parsedSettings
            };
        } catch (e) {
            console.error('解析用户设置失败:', e);
            // 如果解析失败，使用默认设置
        }
    }

    // 音标切换开关
    const phoneticToggle = document.getElementById('phoneticToggle');
    const phoneticTypeText = document.getElementById('phoneticType');
    
    // 设置初始状态
    phoneticToggle.checked = userSettings.phoneticType === 'us';
    phoneticTypeText.textContent = phoneticToggle.checked ? '美' : '英';
    
    // 监听切换事件
    phoneticToggle.addEventListener('change', function() {
        userSettings.phoneticType = this.checked ? 'us' : 'uk';
        phoneticTypeText.textContent = this.checked ? '美' : '英';
        saveUserSettings();
    });
    
    // 联想词数量滑动条
    const friendSlider = document.getElementById('friendSlider');
    const friendNumberText = document.getElementById('friendNumber');
    
    // 设置初始值
    friendSlider.value = userSettings.friendNumber;
    friendNumberText.textContent = userSettings.friendNumber;
    
    // 监听滑动事件
    friendSlider.addEventListener('input', function() {
        userSettings.friendNumber = this.value;
        friendNumberText.textContent = this.value;
        saveUserSettings();
    });
    
    // 难度级别下拉菜单
    const difficultySelect = document.getElementById('difficultyLevel');
    
    // 确保有默认难度值
    if (!userSettings.difficulty || !difficulty_map[userSettings.difficulty]) {
        userSettings.difficulty = 'A'; // 使用A级作为默认难度
        saveUserSettings(); // 保存设置
    }
    
    // 设置初始值
    difficultySelect.value = userSettings.difficulty;
    
    // 监听选择事件
    difficultySelect.addEventListener('change', function() {
        userSettings.difficulty = this.value;
        saveUserSettings();
    });
    
    console.log('已初始化设置:', userSettings); // 添加日志便于调试
}

// 保存用户设置到本地存储
function saveUserSettings() {
    localStorage.setItem('wordnfriends_settings', JSON.stringify(userSettings));
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    setFooterText();
    initControlPanel();
    
    // 初始化赞赏码弹窗
    const miniIcon = document.querySelector('.mini-icon');
    const modal = document.getElementById('appreciationModal');
    const closeButton = document.querySelector('.close-button');
    
    if (miniIcon && modal) {
        miniIcon.addEventListener('click', function() {
            modal.classList.add('show');
        });
        
        closeButton.addEventListener('click', function() {
            modal.classList.remove('show');
        });
        
        // 点击弹窗外部关闭
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
});

marked.setOptions({
    gfm: true,
    tables: true
});

function process(magic) {
    return magic;
}

function sanitizeInput(input) {
    let ret = input.trim()
        .substring(0, 26)
        .replace(/[^a-zA-Z\u4e00-\u9fa5\-]/g, '');
    // 如果不同，向控制台打印
    if (ret !== input) {
        console.log('输入包含非法字符，已过滤:', input, '->', ret);
    }
    return ret;
}

async function get_system_prompt() {
    try {
        const response = await fetch('./system');
        let systemPrompt = await response.text();
        
        // 替换参数
        systemPrompt = systemPrompt.replace('{{phonetic_type}}', userSettings.phoneticType);
        systemPrompt = systemPrompt.replace('{{friend_number}}', userSettings.friendNumber);
        systemPrompt = systemPrompt.replace('{{difficulty_range}}', difficulty_map[userSettings.difficulty] || difficulty_map['A']);
        
        return systemPrompt;
    } catch (error) {
        console.error(error);
        return "输出用户给你的单词的翻译（英汉互译）。任何情况下输出长度不允许超过30个字符。并且在回复的开头加上“服务异常\n”";
    }
}

// 流式数据处理器
async function handleStream(reader, resultDiv) {
    let mdContent = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            isStreaming = false;
            return;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => {
            // 过滤有效数据行（根据官方文档格式）
            return line.startsWith('data: ') && !line.includes('[DONE]');
        });
        
        lines.forEach(line => {
            try {
                const data = JSON.parse(line.slice(6)); // 去除"data: "前缀
                if (data.choices[0].delta.content) {
                    mdContent += data.choices[0].delta.content;
                    // 将Markdown渲染为HTML
                    if (typeof marked !== 'undefined') {
                        const htmlContent = marked.parse(mdContent); // 
                        resultDiv.innerHTML = htmlContent;
                    } else {
                        // 如果 marked.js 未加载成功，创建pre标签直接显示原始Markdown文本
                        const pre = document.createElement('pre');
                        pre.textContent = mdContent;
                        resultDiv.appendChild(pre);
                    }
                }
            } catch (e) {
                console.warn('解析流数据失败:', e);
            }
        });
    }
}

async function getWordInfo() {
    if (isStreaming) {
        alert('已有请求在处理中');
        return;
    }

    const lastRequest = localStorage.getItem('lastRequest') || 0;
    if (Date.now() - lastRequest < 3000) {
        alert('操作过于频繁，请稍后再试');
        return;
    }
    localStorage.setItem('lastRequest', Date.now());

    let word = sanitizeInput(document.getElementById('wordInput').value);
    document.getElementById('wordInput').value = word;
    // 在请求前打印关键数据
    console.log('请求数据:', {
        model: MODEL,
        word: word,
        friendNumber: userSettings.friendNumber,
        phoneticType: userSettings.phoneticType,
        difficulty: userSettings.difficulty
    });

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div class="loader"></div>'; // 使用新的加载动画
    isStreaming = true;

    try {
        const [magicRes, systemPrompt] = await Promise.all([
            fetch(atob('bWFnaWNjb2Rl')).then(r => r.text()),
            get_system_prompt()
        ]);

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer sk-${process(magicRes)}`
        };

        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: MODEL,
                stream: true,
                max_tokens: MAX_TOKENS,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: word }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API请求失败');
        }

        isStreaming = true;
        await handleStream(response.body.getReader(), document.getElementById('result'));

    } catch (error) {
        console.error('请求失败:', error);
        document.getElementById('result').innerHTML = `错误：${error.message}`;
        isStreaming = false;
    }
}

// 获取 modal 元素
const modal = document.getElementById('appreciationModal');
const closeButton = document.querySelector('.close-button');
const miniIcon = document.querySelector('.mini-icon');

// 点击小图标显示 modal
miniIcon.addEventListener('click', () => {
    modal.style.display = 'block';
    // 强制重绘
    modal.offsetHeight;
    modal.classList.add('show');
});

// 点击关闭按钮隐藏 modal
closeButton.addEventListener('click', closeModal);

// 点击 modal 背景关闭
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

function closeModal() {
    modal.classList.remove('show');
    // 等待动画完成后隐藏
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // 与 CSS transition 时间相匹配
}
