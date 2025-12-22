// 主应用程序逻辑
class MusicPlayerApp {
    constructor() {
        this.currentSong = null;
        this.currentSongIndex = -1;
        this.playlist = [];
        this.searchResults = []; // 新增：存储搜索结果
        this.isPlaying = false;
        this.audioPlayer = document.getElementById('audioPlayer');
        this.themeStorageKey = 'musicPlayer_theme';
        this.defaultBackgrounds = {
            dark: 'linear-gradient(135deg, #05050f 0%, #111827 45%, #312e81 100%)',
            light: 'linear-gradient(135deg, #fdf2f8 0%, #dbeafe 45%, #c4b5fd 100%)'
        };
        this.defaultGlowColors = {
            dark: 'rgba(94, 234, 212, 0.4)',
            light: 'rgba(147, 197, 253, 0.45)'
        };
        this.lastDominantColor = null;
        this.theme = this.loadTheme();
        this.currentSource = 'kuwo'; // 当前数据源（默认酷我）
        this.currentPage = 1; // 当前页码

        this.totalPages = 1; // 总页数
        this.searchKeyword = ''; // 搜索关键词
        this.searchType = 'song'; // 搜索类型（歌曲/专辑）
        
        // 新增：播放模式相关属性
        this.playMode = this.loadPlayMode(); // 从本地存储加载播放模式，默认为列表循环
        this.playModes = ['list', 'single', 'random']; // 播放模式：列表循环、单曲循环、随机播放
        this.playModeIcons = {
            'list': '🔁',
            'single': '🔂',
            'random': '🔀'
        };
        
        // 新增：歌词相关属性
        this.lyrics = []; // 存储解析后的歌词
        this.lyricsScrollLocked = false; // 歌词滚动锁定状态
        this.lyricsScrollLockTimeout = null; // 歌词滚动锁定超时ID
        
        // 新增：收藏列表
        this.favorites = this.loadFavorites();
        
        this.applyTheme(this.theme);
        this.initEventListeners();
        this.initPlayerEvents();
        this.updatePlayModeButton();
        // Ensure audio element has CORS anonymous to allow cross-origin playback when possible
        try {
            if (this.audioPlayer) this.audioPlayer.crossOrigin = 'anonymous';
        } catch (e) {
            // ignore
        }
        // 添加音频上下文用于可视化
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.isVisualizationActive = false;
        
        // 初始化媒体会话控制
        this.initMediaSession();
    }

    loadTheme() {
        try {
            const storedTheme = localStorage.getItem(this.themeStorageKey);
            if (storedTheme === 'light' || storedTheme === 'dark') {
                return storedTheme;
            }
        } catch (error) {
            console.warn('无法读取主题设置:', error);
        }
        return 'dark';
    }


    saveTheme(theme) {
        try {
            localStorage.setItem(this.themeStorageKey, theme);
        } catch (error) {
            console.warn('无法保存主题设置:', error);
        }
    }

    applyTheme(theme) {
        const body = document.body;
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(`${theme}-theme`);
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        if (this.lastDominantColor) {
            this.applyBackground(this.lastDominantColor);
        } else {
            this.resetBackground();
        }
    }

    // 新增：加载播放模式
    loadPlayMode() {
        const savedMode = localStorage.getItem('musicPlayer_playMode');
        return savedMode && this.playModes.includes(savedMode) ? savedMode : 'list';
    }

    // 新增：保存播放模式
    savePlayMode() {
        localStorage.setItem('musicPlayer_playMode', this.playMode);
    }

    // 新增：切换播放模式
    togglePlayMode() {
        const currentIndex = this.playModes.indexOf(this.playMode);
        const nextIndex = (currentIndex + 1) % this.playModes.length;
        this.playMode = this.playModes[nextIndex];
        this.savePlayMode();
        this.updatePlayModeButton();
    }

    // 新增：更新播放模式按钮显示
    updatePlayModeButton() {
        const playModeBtn = document.getElementById('playModeBtn');
        if (playModeBtn) {
            playModeBtn.textContent = this.playModeIcons[this.playMode];
            playModeBtn.title = this.getPlayModeText();
        }
    }

    // 新增：获取播放模式文本描述
    getPlayModeText() {
        switch (this.playMode) {
            case 'list':
                return '列表循环';
            case 'single':
                return '单曲循环';
            case 'random':
                return '随机播放';
            default:
                return '列表循环';
        }
    }

    initEventListeners() {
        // 搜索功能
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // 播放控制
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevSong());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextSong());

        // 进度条控制
        document.getElementById('progressBar').addEventListener('input', (e) => {
            const progress = e.target.value;
            this.audioPlayer.currentTime = (progress / 100) * this.audioPlayer.duration;
        });

        // 音量控制
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.addEventListener('input', (e) => {
                this.audioPlayer.volume = e.target.value;
            });
        }
        
        // 添加播放列表切换功能
        document.getElementById('playlistToggle').addEventListener('click', () => {
            const panel = document.getElementById('playlistPanel');
            panel.classList.toggle('open');
        });
        
        // 关闭按钮
        const closeBtn = document.getElementById('closePlaylist');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('playlistPanel').classList.remove('open');
            });
        }
        
        // 添加主题切换功能
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // 数据源切换
        document.getElementById('sourceSelect').addEventListener('change', (e) => {
            this.currentSource = e.target.value;
            if (this.searchKeyword) {
                this.currentPage = 1;
                this.handleSearch();
            }
        });
        
        // 搜索类型切换
        document.getElementById('searchTypeSelect').addEventListener('change', (e) => {
            this.searchType = e.target.value;
            if (this.searchKeyword) {
                this.currentPage = 1;
                this.handleSearch();
            }
        });
        
        // 分页控制（按钮可能尚未渲染）
        const prevPageBtnInit = document.getElementById('prevPageBtn');
        if (prevPageBtnInit) {
            prevPageBtnInit.addEventListener('click', () => this.prevPage());
        }
        const nextPageBtnInit = document.getElementById('nextPageBtn');
        if (nextPageBtnInit) {
            nextPageBtnInit.addEventListener('click', () => this.nextPage());
        }

        // 批量导入播放队列（在初始页面中该按钮可能不存在）
        const batchImportBtnInit = document.getElementById('batchImportBtn');
        if (batchImportBtnInit) {
            batchImportBtnInit.addEventListener('click', () => this.batchImportToPlaylist());
        }
        
        // 新增：播放模式切换
        const playModeBtn = document.getElementById('playModeBtn');
        if (playModeBtn) {
            playModeBtn.addEventListener('click', () => this.togglePlayMode());
        }
        
        // 新增：导入导出功能
        const exportPlaylistBtn = document.getElementById('exportPlaylistBtn');
        if (exportPlaylistBtn) {
            exportPlaylistBtn.addEventListener('click', () => this.exportPlaylist());
        }
        const importPlaylistBtn = document.getElementById('importPlaylistBtn');
        if (importPlaylistBtn) {
            importPlaylistBtn.addEventListener('click', () => this.importPlaylist());
        }
        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => this.handleImportFile(e));
        }
    }

    initPlayerEvents() {
        // 音频播放事件
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('ended', () => this.handleSongEnd());
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioPlayer.addEventListener('play', () => this.setupVisualization());
        this.audioPlayer.addEventListener('pause', () => this.stopVisualization());
    }

    setupVisualization() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.source = this.audioContext.createMediaElementSource(this.audioPlayer);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        }
        
        this.isVisualizationActive = true;
        this.visualize();
    }

    stopVisualization() {
        this.isVisualizationActive = false;
    }

    visualize() {
        if (!this.isVisualizationActive) return;
        
        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 设置可视化参数
        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // 获取频率数据
        this.analyser.getByteFrequencyData(dataArray);
        
        // 绘制可视化效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            
            ctx.fillStyle = `rgb(${barHeight + 50}, 50, 150)`;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
        
        requestAnimationFrame(() => this.visualize());
    }

    async handleSearch(page = 1) {
        const keyword = document.getElementById('searchInput').value.trim();
        if (!keyword) return;

        this.searchKeyword = keyword;
        this.currentPage = page;
        this.showLoading();
        
        try {
            const results = await musicAPI.search(keyword, page, 20, this.currentSource, this.searchType);
            this.displayResults(results);
        } catch (error) {
            this.showError('搜索失败，请稍后重试');
        }
    }

    showLoading() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>搜索中...</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `<p class="placeholder">${message}</p>`;
    }

    displayResults(data) {
        const container = document.getElementById('resultsContainer');
        
        if (!data || !data.hasOwnProperty('songs') || data.songs.length === 0) {
            container.innerHTML = '<p class="placeholder">未找到相关音乐</p>';
            this.updatePagination(0, 1, 1);
            return;
        }

        this.searchResults = data.songs;
        this.totalPages = data.total_pages || 1;
        this.currentPage = data.page || 1;
        
        container.innerHTML = `
            <div class="results-grid">
                ${this.searchResults.map((song, index) => `
                    <div class="music-card" data-index="${index}">
                        <input type="checkbox" class="song-checkbox" data-id="${song.id}">
                        <div class="title">${song.name}</div>
                        <div class="artist">${song.artist}</div>
                        <div class="actions">
                            <button class="play-btn" onclick="app.handleResultPlay(${index})">▶ 播放</button>
                            <button class="download-btn" onclick="app.handleResultDownload(${index})">⬇ 下载</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="pagination">
                <button id="prevPageBtn" ${this.currentPage <= 1 ? 'disabled' : ''}>上一页</button>
                <span>第 ${this.currentPage} 页 / 共 ${this.totalPages} 页</span>
                <button id="nextPageBtn" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>下一页</button>
            </div>
        `;

        
        // 绑定全选复选框事件
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.song-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
        
        // 绑定批量导入按钮事件
        const batchImportBtn = document.getElementById('batchImportBtn');
        if (batchImportBtn) {
            batchImportBtn.addEventListener('click', () => this.batchImportToPlaylist());
        }
        
        // 绑定分页按钮事件
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.prevPage());
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }
        
        // 为没有图片的卡片加载专辑图
        this.loadMissingAlbumImages();
        
        // 更新播放列表面板
        this.updatePlaylistPanel();
    }
    
    // 更新分页信息
    updatePagination(total, currentPage, totalPages) {
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        
        const paginationEl = document.querySelector('.pagination');
        if (paginationEl) {
            paginationEl.innerHTML = `
                <button id="prevPageBtn" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>
                <span>第 ${currentPage} 页 / 共 ${totalPages} 页</span>
                <button id="nextPageBtn" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>
            `;
            
            // 重新绑定分页按钮事件
            document.getElementById('prevPageBtn').addEventListener('click', () => this.prevPage());
            document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        }
    }
    
    // 上一页
    prevPage() {
        if (this.currentPage > 1) {
            this.handleSearch(this.currentPage - 1);
        }
    }
    
    // 下一页
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.handleSearch(this.currentPage + 1);
        }
    }

    // 为搜索结果中缺失的专辑图加载高质量图片
    loadMissingAlbumImages() {
        const images = document.querySelectorAll('img[data-pic-id]');
        images.forEach(img => {
            // 如果图片还没加载成功或者是占位符，尝试从API获取
            if (!img.src || img.src.includes('placehold')) {
                const picId = img.dataset.picId;
                const source = img.dataset.source || 'netease';
                
                musicAPI.getPic(picId, source, '300')
                    .then(picData => {
                        if (picData.url) {
                            img.src = picData.url;
                        }
                    })
                    .catch(error => {
                        console.warn(`获取${picId}的专辑图失败:`, error);
                        // 静默处理失败，保持占位符显示
                    });
            }
        });
    }
    
    // 批量导入到播放列表
    batchImportToPlaylist() {
        const selectedCheckboxes = document.querySelectorAll('.song-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('请至少选择一首歌曲');
            return;
        }
        
        const selectedSongs = Array.from(selectedCheckboxes).map(checkbox => {
            const index = parseInt(checkbox.closest('.music-card').dataset.index);
            return this.searchResults[index];
        });
        
        // 将选中的歌曲添加到播放列表（去重）
        const uniqueSongs = selectedSongs.filter((song) =>
            !this.playlist.some((item) => item.id === song.id && item.source === song.source)
        );
        
        if (uniqueSongs.length === 0) {
            alert('选中的歌曲已全部存在于播放列表');
            return;
        }
        
        this.playlist = [...this.playlist, ...uniqueSongs];
        this.updatePlaylistPanel();
        
        // 显示成功提示
        alert(`已将 ${uniqueSongs.length} 首歌曲添加到播放列表`);
    }
    
        updatePlaylistPanel() {
        const playlistContainer = document.getElementById('playlistContainer');
        if (!playlistContainer) return;
        
        playlistContainer.innerHTML = this.playlist.map((song, index) => `
            <div class="playlist-item ${index === this.currentSongIndex ? 'active' : ''}" 
                 onclick="app.playSong(${index})">
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${song.name}</div>
                    <div class="playlist-item-artist">${song.artist}</div>
                </div>
                <button class="download-btn-small" title="下载" onclick="event.stopPropagation(); app.downloadSong(${index})">⬇</button>
            </div>
        `).join('');
    }



    ensureSongInPlaylist(song) {
        if (!song) return -1;
        const existingIndex = this.playlist.findIndex((item) => 
            item.id === song.id && item.source === song.source
        );
        if (existingIndex !== -1) {
            return existingIndex;
        }
        this.playlist = [...this.playlist, song];
        this.updatePlaylistPanel();
        return this.playlist.length - 1;
    }

    handleResultPlay(resultIndex) {
        if (resultIndex < 0 || resultIndex >= this.searchResults.length) return;
        const playlistIndex = this.ensureSongInPlaylist(this.searchResults[resultIndex]);
        if (playlistIndex !== -1) {
            this.playSong(playlistIndex);
        }
    }

    async handleResultDownload(resultIndex) {
        if (resultIndex < 0 || resultIndex >= this.searchResults.length) return;
        const song = this.searchResults[resultIndex];
        
        try {
            const quality = document.getElementById('qualitySelect').value || '999';
            const urlData = await musicAPI.getMusicUrl(song.id, song.source, quality);
            if (!urlData.url) {
                alert('无法获取下载链接');
                return;
            }
            
            console.log('开始下载:', song.name);
            alert(`正在下载: ${song.name}`);
            
            // 创建隐藏的 iframe 来下载文件
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = urlData.url;
            document.body.appendChild(iframe);
            
            // 5秒后移除 iframe
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 5000);
            
        } catch (error) {
            console.error('下载音乐失败:', error);
            alert('下载音乐失败，请稍后重试');
        }
    }



    async playSong(index) {

        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentSongIndex = index;
        this.currentSong = this.playlist[index];
        
        try {
            // 获取选中的音质
            const quality = document.getElementById('qualitySelect').value || '999';
            
            // 获取音乐播放链接
            const urlData = await musicAPI.getMusicUrl(this.currentSong.id, this.currentSong.source, quality);
            
            if (!urlData.url) {
                alert('无法获取音乐播放链接');
                return;
            }
            
            // 更新播放器信息
            this.updatePlayerInfo();
            
            // 设置音频源并播放（优先直接播放远程 URL）
            this.audioPlayer.src = urlData.url;
            try {
                await this.audioPlayer.play();
            } catch (playErr) {
                console.warn('直接播放失败，尝试通过代理播放：', playErr);
                // 回退到通过本地代理中转播放（同源）
                try {
                    const proxied = `/api/music-proxy?target=${encodeURIComponent(urlData.url)}`;
                    this.audioPlayer.src = proxied;
                    await this.audioPlayer.play();
                } catch (proxyErr) {
                    console.error('通过代理播放也失败:', proxyErr);
                    throw proxyErr;
                }
            }
            this.isPlaying = true;
            document.getElementById('playBtn').textContent = '⏸';
            
            // 获取并显示歌词
            this.loadLyrics();
            
            // 更新播放列表高亮
            this.updatePlaylistPanel();
            
            // 更新媒体会话元数据（用于锁屏控制）
            this.updateMediaSessionMetadata();
            
        } catch (error) {
            console.error('播放音乐失败:', error);
            alert('播放音乐失败，请稍后重试');
        }
    }

    async downloadSong(index) {
        if (index < 0 || index >= this.playlist.length) return;
        const song = this.playlist[index];
        try {
            const quality = document.getElementById('qualitySelect').value || '999';
            const urlData = await musicAPI.getMusicUrl(song.id, song.source, quality);
            if (!urlData.url) {
                alert('无法获取下载链接');
                return;
            }
            
            // 显示下载提示
            console.log('开始下载:', song.name);
            alert(`正在下载: ${song.name}`);
            
            // 创建隐藏的 iframe 来下载文件
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = urlData.url;
            document.body.appendChild(iframe);
            
            // 5秒后移除 iframe
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 5000);
            
        } catch (error) {
            console.error('下载音乐失败:', error);
            alert('下载音乐失败，请稍后重试');
        }
    }

    updatePlayerInfo() {
        if (!this.currentSong) return;

        
        const titleEl = document.getElementById('songTitle');
        if (titleEl) {
            titleEl.textContent = this.currentSong.name;
        }
        const artistEl = document.getElementById('songArtist');
        if (artistEl) {
            artistEl.textContent = this.currentSong.artist;
        }
        
        if (this.currentSong.pic) {
            this.updateBackgroundFromImage(this.currentSong.pic);
            return;
        }
        
        musicAPI.getPic(this.currentSong.id, this.currentSong.source, '500')
            .then(picData => {
                if (picData.url) {
                    this.updateBackgroundFromImage(picData.url);
                } else {
                    this.resetBackground();
                }
            })
            .catch(() => {
                this.resetBackground();
            });
    }


    // 根据专辑封面自动取色并更新背景
    updateBackgroundFromImage(imageSrc) {
        if (!imageSrc) {
            this.resetBackground();
            return;
        }
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    this.resetBackground();
                    return;
                }
                const width = Math.max(1, img.width);
                const height = Math.max(1, img.height);
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const sampleWidth = Math.max(1, Math.floor(width * 0.6));
                const sampleHeight = Math.max(1, Math.floor(height * 0.6));
                const startX = Math.floor((width - sampleWidth) / 2);
                const startY = Math.floor((height - sampleHeight) / 2);
                const imageData = ctx.getImageData(startX, startY, sampleWidth, sampleHeight).data;
                let totalR = 0;
                let totalG = 0;
                let totalB = 0;
                let count = 0;
                const totalPixels = imageData.length / 4;
                const stridePixels = Math.max(1, Math.floor(totalPixels / 1500));
                for (let i = 0; i < imageData.length; i += stridePixels * 4) {
                    const alpha = imageData[i + 3];
                    if (alpha < 128) continue;
                    totalR += imageData[i];
                    totalG += imageData[i + 1];
                    totalB += imageData[i + 2];
                    count++;
                }
                if (count === 0) {
                    this.resetBackground();
                    return;
                }
                const dominantColor = `rgb(${Math.round(totalR / count)}, ${Math.round(totalG / count)}, ${Math.round(totalB / count)})`;
                this.applyBackground(dominantColor);
            } catch (error) {
                console.warn('无法从专辑封面提取颜色:', error);
                this.resetBackground();
            }
        };
        img.onerror = () => this.resetBackground();
        img.src = imageSrc;
    }


    // 应用背景颜色
    applyBackground(color) {
        const body = document.body;
        const firstStop = this.adjustColor(color, this.theme === 'dark' ? 35 : 60);
        const middleStop = this.adjustColor(color, this.theme === 'dark' ? 5 : 30);
        const finalStop = this.adjustColor(color, this.theme === 'dark' ? -35 : 0);
        const gradient = `linear-gradient(135deg, ${firstStop} 0%, ${middleStop} 50%, ${finalStop} 100%)`;
        const glowBase = this.adjustColor(color, this.theme === 'dark' ? 55 : -15);
        body.style.setProperty('--immersive-bg', gradient);
        body.style.setProperty('--immersive-glow', this.convertRgbToRgba(glowBase, this.theme === 'dark' ? 0.5 : 0.35));
        this.lastDominantColor = color;
    }


    // 调整颜色亮度
    adjustColor(color, amount) {
        // 解析RGB颜色值
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return color;
        
        let r = parseInt(match[1]) + amount;
        let g = parseInt(match[2]) + amount;
        let b = parseInt(match[3]) + amount;
        
        // 确保颜色值在有效范围内
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    convertRgbToRgba(color, alpha) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return color;
        const [, r, g, b] = match;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // 重置为默认背景
    resetBackground() {
        const fallbackGradient = this.defaultBackgrounds[this.theme] || this.defaultBackgrounds.dark;
        const fallbackGlow = this.defaultGlowColors[this.theme] || this.defaultGlowColors.dark;
        document.body.style.setProperty('--immersive-bg', fallbackGradient);
        document.body.style.setProperty('--immersive-glow', fallbackGlow);
        this.lastDominantColor = null;
    }


    // 切换主题
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.saveTheme(this.theme);
        this.applyTheme(this.theme);
    }


    // 新增：解析歌词文本为时间轴对象数组
    parseLyrics(lyricText) {
        const lines = lyricText.split('\n');
        const lyrics = [];
        
        for (const line of lines) {
            // 匹配时间戳 [mm:ss.xx] 或 [mm:ss]
            const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);
            if (timeMatch) {
                const minutes = parseInt(timeMatch[1], 10);
                const seconds = parseInt(timeMatch[2], 10);
                const milliseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
                
                // 计算总秒数
                const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
                
                // 提取歌词文本（去掉时间戳）
                const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
                
                // 只有当文本非空时才添加
                if (text) {
                    lyrics.push({
                        time: totalSeconds,
                        text: text
                    });
                }
            }
        }
        
        // 按时间排序
        lyrics.sort((a, b) => a.time - b.time);
        return lyrics;
    }

    async loadLyrics() {
        if (!this.currentSong) return;
        
        try {
            // 优先使用 lyric_id，如果没有则使用 id
            const lyricId = this.currentSong.lyric_id || this.currentSong.id;
            const lyricData = await musicAPI.getLyrics(lyricId, this.currentSong.source);
            
            // 清空现有歌词
            this.lyrics = [];
            const lyricsContainer = document.getElementById('lyricsContainer');
            if (lyricsContainer) {
                lyricsContainer.innerHTML = '';
            }
            
            // 优先显示原语种歌词，如果没有则显示中文翻译
            const lyricsToDisplay = lyricData.lyric || lyricData.tlyric;
            
            if (lyricsToDisplay) {
                // 解析歌词 (LRC格式)
                this.lyrics = this.parseLyrics(lyricsToDisplay);
                this.displayLyrics();
            } else {
                lyricsContainer.innerHTML = '<div class="no-lyrics">暂无歌词</div>';
            }
        } catch (error) {
            console.log('获取歌词失败:', error);
            const lyricsContainer = document.getElementById('lyricsContainer');
            if (lyricsContainer) {
                lyricsContainer.innerHTML = '<div class="no-lyrics">暂无歌词</div>';
            }
        }
    }

    // 新增：显示歌词
    displayLyrics() {
        const lyricsContainer = document.getElementById('lyricsContainer');
        if (!lyricsContainer) return;
        
        if (this.lyrics.length === 0) {
            lyricsContainer.innerHTML = '<div class="no-lyrics">暂无歌词</div>';
            return;
        }
        
        // 构建歌词HTML
        let lyricsHTML = '<div class="lyrics-content">';
        this.lyrics.forEach((line, index) => {
            lyricsHTML += `<div class="lyric-line" data-time="${line.time}" data-index="${index}">${line.text}</div>`;
        });
        lyricsHTML += '</div>';
        
        lyricsContainer.innerHTML = lyricsHTML;
        
        // 添加滚动事件监听器
        lyricsContainer.addEventListener('scroll', () => {
            this.lockLyricsScroll();
        });
        
        // 初始时滚动到顶部
        lyricsContainer.scrollTop = 0;
    }

    // 新增：锁定歌词滚动
    lockLyricsScroll() {
        this.lyricsScrollLocked = true;
        
        // 清除之前的超时
        if (this.lyricsScrollLockTimeout) {
            clearTimeout(this.lyricsScrollLockTimeout);
        }
        
        // 设置新的超时，在3秒后解锁
        this.lyricsScrollLockTimeout = setTimeout(() => {
            this.lyricsScrollLocked = false;
        }, 3000);
    }

    // 新增：更新歌词高亮
    updateLyricsHighlight() {
        if (this.lyrics.length === 0 || !this.isPlaying) return;
        
        const currentTime = this.audioPlayer.currentTime;
        const lyricsContainer = document.getElementById('lyricsContainer');
        if (!lyricsContainer) return;
        
        // 如果滚动被锁定，则不自动滚动
        if (this.lyricsScrollLocked) return;
        
        // 查找当前应该高亮的歌词行
        let activeIndex = 0;
        for (let i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i].time <= currentTime) {
                activeIndex = i;
            } else {
                break;
            }
        }
        
        // 移除之前的所有高亮
        const lyricLines = lyricsContainer.querySelectorAll('.lyric-line');
        lyricLines.forEach(line => line.classList.remove('active'));
        
        // 高亮当前行
        const activeLine = lyricLines[activeIndex];
        if (activeLine) {
            activeLine.classList.add('active');
            
            // 自动滚动到当前行，使其居中显示
            const containerHeight = lyricsContainer.clientHeight;
            const lineOffsetTop = activeLine.offsetTop;
            const lineHeight = activeLine.offsetHeight;
            
            lyricsContainer.scrollTo({
                top: lineOffsetTop - containerHeight / 2 + lineHeight / 2,
                behavior: 'smooth'
            });
        }
    }

    togglePlay() {
        if (!this.currentSong) {
            if (this.playlist.length > 0) {
                this.playSong(0);
            }
            return;
        }
        
        if (this.isPlaying) {
            this.audioPlayer.pause();
            document.getElementById('playBtn').textContent = '▶';
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        } else {
            this.audioPlayer.play();
            document.getElementById('playBtn').textContent = '⏸';
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        }
        this.isPlaying = !this.isPlaying;
    }

    // 修改：处理歌曲结束事件
    handleSongEnd() {
        switch (this.playMode) {
            case 'single':
                // 单曲循环，重新播放当前歌曲
                this.audioPlayer.play();
                break;
            case 'random':
                // 随机播放，选择下一首随机歌曲
                this.playRandomSong();
                break;
            case 'list':
            default:
                // 列表循环，播放下一首歌曲
                this.nextSong();
                break;
        }
    }

    // 新增：播放随机歌曲
    playRandomSong() {
        if (this.playlist.length === 0) return;
        
        // 生成一个随机索引，确保不是当前播放的歌曲（如果播放列表大于1）
        let randomIndex;
        if (this.playlist.length > 1) {
            do {
                randomIndex = Math.floor(Math.random() * this.playlist.length);
            } while (randomIndex === this.currentSongIndex);
        } else {
            randomIndex = 0;
        }
        
        this.playSong(randomIndex);
    }

    nextSong() {
        if (this.playlist.length === 0) return;
        
        let newIndex;
        switch (this.playMode) {
            case 'random':
                this.playRandomSong();
                return;
            case 'single':
                newIndex = this.currentSongIndex;
                break;
            case 'list':
            default:
                newIndex = this.currentSongIndex + 1;
                if (newIndex >= this.playlist.length) newIndex = 0;
                break;
        }
        
        this.playSong(newIndex);
    }

    prevSong() {
        if (this.playlist.length === 0) return;
        
        let newIndex;
        switch (this.playMode) {
            case 'random':
                this.playRandomSong();
                return;
            case 'single':
                newIndex = this.currentSongIndex;
                break;
            case 'list':
            default:
                newIndex = this.currentSongIndex - 1;
                if (newIndex < 0) newIndex = this.playlist.length - 1;
                break;
        }
        
        this.playSong(newIndex);
    }

    updateProgress() {
        const currentTime = this.audioPlayer.currentTime;
        const duration = this.audioPlayer.duration || 1;
        const progress = (currentTime / duration) * 100;
        
        document.getElementById('progressBar').value = progress;
        document.getElementById('currentTime').textContent = this.formatTime(currentTime);
        
        // 更新歌词高亮
        this.updateLyricsHighlight();
    }

    updateDuration() {
        const duration = this.audioPlayer.duration || 0;
        document.getElementById('duration').textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }



    // 新增：加载收藏列表
    loadFavorites() {
        const savedFavorites = localStorage.getItem('musicPlayer_favorites');
        return savedFavorites ? JSON.parse(savedFavorites) : [];
    }

    // 新增：保存收藏列表
    saveFavorites() {
        localStorage.setItem('musicPlayer_favorites', JSON.stringify(this.favorites));
    }

    // 新增：导出播放列表和收藏列表
    exportPlaylist() {
        const data = {
            playlist: this.playlist,
            favorites: this.favorites,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `music-player-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 新增：导入播放列表和收藏列表
    importPlaylist() {
        document.getElementById('importFileInput').click();
    }

    // 新增：处理导入的文件
    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.playlist && Array.isArray(data.playlist)) {
                    this.playlist = data.playlist;
                    this.updatePlaylistPanel();
                }
                
                if (data.favorites && Array.isArray(data.favorites)) {
                    this.favorites = data.favorites;
                    this.saveFavorites();
                }
                
                alert('播放列表和收藏列表导入成功！');
                
                // 如果当前有正在播放的歌曲，但该歌曲不在新导入的播放列表中，
                // 则停止播放
                if (this.currentSong && this.playlist.findIndex(song => 
                    song.id === this.currentSong.id && song.source === this.currentSong.source) === -1) {
                    this.audioPlayer.pause();
                    this.audioPlayer.src = '';
                    this.isPlaying = false;
                    document.getElementById('playBtn').textContent = '▶';
                    this.currentSong = null;
                    this.currentSongIndex = -1;
                    this.updatePlayerInfo();
                }
            } catch (error) {
                console.error('导入失败:', error);
                alert('导入失败，请确保选择了有效的JSON文件');
            }
        };
        reader.readAsText(file);
        // 重置文件输入，以便下次选择相同文件也能触发事件
        event.target.value = '';
    }

    initMediaSession() {
        if ('mediaSession' in navigator) {
            // 设置媒体会话元数据更新函数
            this.updateMediaSessionMetadata = this.updateMediaSessionMetadata.bind(this);
            
            // 设置媒体会话动作处理器
            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prevSong());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.nextSong());
            
            // 在某些浏览器中，stop动作可能不可用
            try {
                navigator.mediaSession.setActionHandler('stop', () => {
                    this.audioPlayer.pause();
                    this.isPlaying = false;
                    document.getElementById('playBtn').textContent = '▶';
                });
            } catch (error) {
                console.log('Warning: Unable to set stop action handler');
            }
        }
    }

    updateMediaSessionMetadata() {
        if (!('mediaSession' in navigator) || !this.currentSong) return;
        
        let artwork = [];
        if (this.currentSong.pic) {
            artwork = [{ 
                src: this.currentSong.pic,
                sizes: '300x300',
                type: 'image/jpeg'
            }];
        }
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.currentSong.name,
            artist: this.currentSong.artist,
            album: this.currentSong.album || 'Unknown Album',
            artwork: artwork
        });
    }
}

// 初始化应用
const app = new MusicPlayerApp();

// 页面加载完成后初始化数据源选择器
document.addEventListener('DOMContentLoaded', function() {
    const sourceSelect = document.getElementById('sourceSelect');
    if (!sourceSelect) return;
    const sources = musicAPI.getSources();
    
    sourceSelect.innerHTML = sources.map(source => 
        `<option value="${source.id}">${source.name}</option>`
    ).join('');

    const hasDefaultSource = sources.some(source => source.id === app.currentSource);
    if (hasDefaultSource) {
        sourceSelect.value = app.currentSource;
    }
});
