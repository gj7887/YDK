// Browser-safe MusicAPI client (exposes global `musicAPI`)
(function () {
    class MusicAPIClient {
        constructor() {
            this.baseUrl = '/api/music-proxy';
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

        getSources() {
            return this.sources;
        }

        async search(keyword, page = 1, limit = 20, source = 'netease', searchType = 'song') {
            const searchSource = searchType === 'album' ? `${source}_album` : source;
            const url = `${this.baseUrl}?types=search&count=${limit}&source=${searchSource}&pages=${page}&name=${encodeURIComponent(keyword)}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        }

        async getMusicUrl(id, source, quality = '320k') {
            const resp = await fetch(`${this.baseUrl}?types=url&id=${id}&source=${source}&br=${quality}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            // 返回 API 提供的 URL，可能需要通过代理处理
            return data;
        }

        async getLyrics(lyricId, source = 'netease') {
            const resp = await fetch(`${this.baseUrl}?types=lyric&id=${lyricId}&source=${source}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        }

        async getPic(id, source = 'netease', size = '500') {
            const resp = await fetch(`${this.baseUrl}?types=pic&id=${id}&source=${source}&size=${size}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        }
    }

    // Expose global
    window.musicAPI = new MusicAPIClient();
})();
