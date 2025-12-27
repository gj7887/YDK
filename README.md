# 🎵 现代音乐播放器 - Modern Music Player

---

## 🎯 项目简介

一个功能完整、现代化设计的在线音乐播放器，支持**国内外音乐源**、**5档音质选择**、**实时歌词显示**等丰富功能。

---

## ⭐ 核心功能

### 🎵 播放功能
- ✅ 多源搜索
- ✅ 歌曲/专辑双模式搜索
- ✅ 5档音质选择（128/192/320/740/999无损）
- ✅ 播放/暂停/上一首/下一首
- ✅ 播放模式切换（列表循环、单曲循环、随机）
- ✅ 实时进度条拖拽
- ✅ 音量调节
- ✅ 下载功能

### 🎨 用户体验
- ✅ 现代 Glass-morphism 设计
- ✅ 深色/浅色主题切换
- ✅ 响应式布局
- ✅ 实时歌词显示与同步
- ✅ 专辑封面自动取色背景
- ✅ 平滑动画效果

### 📚 播放列表管理
- ✅ 动态播放列表
- ✅ 收藏/取消收藏
- ✅ 播放列表导入/导出
- ✅ 本地存储持久化
- ✅ 快速添加/删除

### � 安全认证
- ✅ 密码保护登录
- ✅ Cookie 会话管理
- ✅ 自动重定向
- ✅ CORS 防护

---

## 🎚️ 音质选择

支持 5 档音质，自动与播放源协商：

| 码率 | 等级 | 用途 | 推荐场景 |
|------|------|------|---------|
| **128** | 低质量 | 流量节省 | 移动网络 |
| **192** | 标准 | 移动播放 | 4G 下行 |
| **320** | 高质量 | 日常推荐 | 日常听歌 ⭐ |
| **740** | 超高 | 专业用户 | 专业设备 |
| **999** | 无损 | 最高质量 | 音乐发烧友 |

---

## �️ 技术架构

### 整体架构
```
┌─────────────────────────────────────────┐
│         用户浏览器/客户端               │
├─────────────────────────────────────────┤
│    前端应用 (HTML5 + CSS3 + JS)         │
│  • 现代UI界面                          │
│  • 播放控制逻辑                        │
│  • 本地存储管理                        │
├─────────────────────────────────────────┤
│    API 客户端 (music.js)               │
│  • search / getMusicUrl                │
│  • getLyrics / getPic                  │
├─────────────────────────────────────────┤
│         CDN 边缘节点                     │
│    (Cloudflare Workers)                │
├─────────────────────────────────────────┤
│    API 代理层 (music-proxy.js)         │
│  • 请求验证                           │
│  • 格式转换                           │
│  • 缓存控制                           │
├─────────────────────────────────────────┤
│   外部 API 服务 + 数据库               │
│  • Gmusic-dl.sayqz.com        │
│  • Cloudflare D1                       │
└─────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 功能 |
|------|------|------|
| **前端** | HTML5 + CSS3 + Vanilla JS | 无框架，原生实现 |
| **后端** | Cloudflare Workers | Edge 计算，全球低延迟 |
| **数据库** | Cloudflare D1 | SQLite，边缘存储 |
| **媒体** | Web Audio API | 音频处理、可视化 |
| **存储** | LocalStorage | 本地数据持久化 |
| **部署** | Cloudflare Pages | CDN 托管 + Workers |

---

## 🚀 快速开始

### 前提条件
- Node.js 18+
- Wrangler CLI
- Cloudflare 账户

### 本地开发
```bash
# 1. 克隆项目
git clone <repo-url>
cd f:\YDK

# 2. 安装依赖
npm install

# 3. 本地开发
wrangler dev

# 4. 访问 http://localhost:8787
```

### 生产部署
```bash
# 1. 配置密钥
wrangler secret put PASSWORD

# 2. 发布
wrangler publish

### 💻 文件结构

        f:\YDK\
        ├── functions/                 # Cloudflare Workers 后端
        │   ├── index.js              # 主入口与路由
        │   └── api/
        │       ├── music-proxy.js    # API 代理核心
        │       ├── verify-password.js # 认证端点
        │       └── database.js       # 数据库初始化
        ├── src/api/                  # 前端 API 层
        │   ├── music.js              # API 客户端类
        │   └── database.js           # 本地存储管理
        ├── index.html                # 主页面模板
        ├── login.html                # 登录页面
        ├── app.js                    # 主应用逻辑
        ├── styles.css                # 完整样式表
        ├── wrangler.toml             # Wrangler 配置
        ├── package.json              # 依赖管理
        └── 文档/                 
            ├── QUICK_REFERENCE.md
        
        ```
      ✨ 功能演示

         搜索并播放
        ```
        1. 在搜索框输入关键词（歌名/歌手）
        2. 选择音乐源和搜索类型
        3. 点击搜索或回车
        4. 点击歌曲卡片播放
        5. 选择音质后自动播放
        ```

         高级功能
        ```
        • 切换播放模式: 点击 🔁 按钮
        • 切换主题: 点击 🌙 按钮
        • 查看播放列表: 点击 ≡ 按钮
        • 下载歌曲: 点击 ⬇ 按钮
        • 收藏歌曲: 右键菜单
        ```

         🔒 安全特性
        
        ✅ **认证保护** - 密码 + Cookie 会话  
        ✅ **API 安全** - CORS 头白名单、方法限制  
        ✅ **请求防护** - 15秒超时、错误分类  
        ✅ **输入验证** - URL 编码、转义处理  
        
        ---
        
         ⚡ 性能指标
        
        | 指标 | 数值 | 优化方案 |
        |------|------|---------|
        | 搜索响应 | < 2秒 | CDN 缓存 5分钟 |
        | 音乐播放 | 即时 | Range 请求支持 |
        | 图片加载 | < 1秒 | 两档尺寸自适应 |
        | 缓存覆盖 | 90%+ | 智能预缓存 |
        
        ---
        
         🛠️ 环境配置
        
        ### 必需的密钥
        ```bash
        # 设置登录密码
        wrangler secret put PASSWORD
        # 输入你的密码...
        ```
```bash

### D1 数据库
```bash
# 创建数据库
wrangler d1 create music-db

# 绑定数据库（在 wrangler.toml）
[[d1_databases]]
binding = "DB"
database_name = "music-db"
database_id = "your-database-id"
```

---

## 🐛 常见问题

### Q: 搜索无结果？
A: 
1. 检查网络连接
2. 更换音乐源尝试
3. 使用不同关键词
4. 查看浏览器控制台错误

### Q: 音乐无法播放？
A:
1. 确认选择了音质
2. 刷新页面重试
3. 尝试另一个源
4. 检查浏览器是否支持 MP3

### Q: 如何离线使用？
A: 当前不支持离线播放（PWA 开发中）

---

## 🎓 开发相关

### 本地开发
```bash
# 启动开发服务器
wrangler dev

# 监视文件变化
wrangler dev --watch
```

### 查看日志
```bash
# 实时日志
wrangler tail

# 查看指定期间
wrangler tail --start-time 2025-12-17T00:00:00Z
```

### 调试
```bash
# 浏览器 DevTools
# 1. F12 打开开发者工具
# 2. Console 查看日志
# 3. Network 查看请求
# 4. Application 查看存储
```

---

## 🚀 部署到生产

### 使用 Cloudflare Pages
```bash
# 1. 连接 Git 仓库到 Pages
# 2. 配置构建设置
# 3. 设置环境变量 (PASSWORD)
# 4. 自动部署

# 或手动发布
wrangler publish
```

### 自定义域名
```bash
# 在 Cloudflare Dashboard 配置
# 1. Pages 设置
# 2. 自定义域
# 3. 添加你的域名

---

## 📄 许可证

MIT License - 自由使用和修改

---

## 🙏 致谢

感谢所有贡献者和用户！

特别感谢：
- Cloudflare 提供的优质基础设施
- 开源社区的宝贵参考
- 用户的热心反馈


        📊 项目规模
        主要文件: app.js - 前端核心逻辑
        API调用: 支持多个异步API端点
        用户交互: 100+ 个DOM事件监听器
        
        🎨 设计特点
        响应式设计 - 支持桌面、平板、手机
        玻璃态UI - 现代毛玻璃效果设计
        深色主题优先 - 默认暗黑主题，可切换
        流畅动画 - CSS过渡效果

        项目结构说明

        ├── 前端文件
        │   ├── index.html           - 主播放器界面
        │   ├── login.html           - 登录认证页面
        │   ├── app.js              - 核心应用逻辑 
        │   ├── styles.css          - 样式表 
        │
        ├── 后端/边缘计算 (Cloudflare Workers)
        │   ├── functions/
        │   │   ├── _middleware.js           - 认证中间件
        │   │   └── api/
        │   │       ├── music-proxy.js       - 音乐API代理
        │   │       └── verify-password.js   - 密码验证接口
        │
        ├── API模块 (src/api/)
        │   ├── music.js            - 音乐API封装
        │   └── database.js         - D1数据库管理 
        │
        └── 配置文件
            ├── package.json        - 项目配置
            └── wrangler.toml       - Cloudflare配置

        本平台仅供学习用途，严禁用于商业用途！
        免责声明：本站资源来自网络，仅限本人学习参考，严禁下载、传播或侵犯，如有哦侵权请与我联系删除。继续使用将视为同意本声明

        

