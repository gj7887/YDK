// 音乐API封装模块
import database from './database.js';

class MusicAPI {
    constructor() {
        this.baseUrl = '/api/music-proxy';
        // 支持的数据源列表
        this.sources = [
            { id: 'netease', name: '网易云' },
            { id: 'tencent', name: '腾讯' },
            { id: 'tidal', name: 'Tidal' },
            { id: 'spotify', name: 'Spotify' },
            { id: 'ytmusic', name: 'YouTube Music' },
            { id: 'qobuz', name: 'Qobuz' },
            { id: 'joox', name: 'JOOX' },
            { id: 'deezer', name: 'Deezer' },
            { id: 'migu', name: '咪咕' },
            { id: 'kugou', name: '酷狗' },
            { id: 'kuwo', name: '酷我' },
            { id: 'ximalaya', name: '喜马拉雅' },
            { id: 'apple', name: 'Apple Music' }
        ];
    }

    // 初始化数据库
    initDatabase(env) {
        database.init(env);
    }

    // 创建数据库表
    async createTables() {
        try {
            await database.createTables();
            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Failed to create database tables:', error);
        }
    }

    // 搜索音乐或专辑
    async search(keyword, page = 1, limit = 20, source = 'netease', searchType = 'song') {
        try {
            // 对于新API，不需要添加 "_album" 后缀，直接使用 source
            const url = `${this.baseUrl}?types=search&count=${limit}&source=${source}&page=${page}&name=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 检查 API 返回的错误
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('搜索音乐失败:', error);
            throw error;
        }
    }

    // 获取音乐URL
    async getMusicUrl(id, source, quality = '320k') {
        try {
            // 新 API 支持的音质: 128k, 320k, flac, flac24bit
            // 如果传入的是数字，转换为 k 后缀格式
            let br = quality;
            if (!isNaN(quality)) {
                // 如果是纯数字，转换为 k 格式
                br = quality === '999' ? '320k' : `${quality}k`;
            }
            
            const response = await fetch(`${this.baseUrl}?types=url&id=${id}&source=${source}&br=${br}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // 新 API 在响应中返回 URL，或需要处理重定向
            // 如果 API 返回了 URL，将其包装在代理中以处理 CORS
            if (data.data && data.data.url) {
                data.data.url = `/api/music-proxy?target=${encodeURIComponent(data.data.url)}`;
            }
            return data;
        } catch (error) {
            console.error('获取音乐URL失败:', error);
            throw error;
        }
    }

    // 获取音乐歌词 (LRC格式)
    async getLyrics(lyricId, source = 'netease') {
        try {
            const response = await fetch(`${this.baseUrl}?types=lyric&id=${lyricId}&source=${source}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // 新 API 返回歌词内容在 data.lrc 中（LRC 格式）
            // 如果有翻译，会在 data.tlyric 中（可选）
            return data;
        } catch (error) {
            console.error('获取歌词失败:', error);
            throw error;
        }
    }

    // 获取专辑图片
    async getPic(id, source = 'netease', size = '500') {
        try {
            const response = await fetch(`${this.baseUrl}?types=pic&id=${id}&source=${source}&size=${size}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('获取图片失败:', error);
            throw error;
        }
    }
    
    // 获取支持的数据源列表
    getSources() {
        return this.sources;
    }
    
    // 获取播放列表
    async getPlaylists() {
        return await database.getPlaylists();
    }
    
    // 创建播放列表
    async createPlaylist(name) {
        return await database.createPlaylist(name);
    }
    
    // 删除播放列表
    async deletePlaylist(id) {
        return await database.deletePlaylist(id);
    }
    
    // 获取播放列表中的歌曲
    async getPlaylistSongs(playlistId) {
        return await database.getPlaylistSongs(playlistId);
    }
    
    // 向播放列表添加歌曲
    async addSongToPlaylist(playlistId, song) {
        return await database.addSongToPlaylist(playlistId, song);
    }
    
    // 从播放列表移除歌曲
    async removeSongFromPlaylist(playlistId, songId) {
        return await database.removeSongFromPlaylist(playlistId, songId);
    }
    
    // 获取收藏列表
    async getFavorites() {
        return await database.getFavorites();
    }
    
    // 添加到收藏
    async addFavorite(song) {
        return await database.addFavorite(song);
    }
    
    // 从收藏移除
    async removeFavorite(songId, source) {
        return await database.removeFavorite(songId, source);
    }
    
    // 获取播放模式设置
    async getPlayMode() {
        const mode = await database.getSetting('play_mode');
        return mode || 'list'; // 默认为列表循环
    }
    
    // 保存播放模式设置
    async savePlayMode(mode) {
        return await database.saveSetting('play_mode', mode);
    }
}

export default new MusicAPI();