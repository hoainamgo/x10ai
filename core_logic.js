/**
 * Blogger Headless Core Logic v1.0
 * Bộ công cụ trích xuất và xử lý dữ liệu từ Blogger JSON API
 */

const BloggerCore = {
    /**
     * Trích xuất Metadata từ nội dung bài viết
     * Quy ước: KEY: VALUE (ví dụ: PRICE: Free)
     */
    extractMeta(content, key) {
        if (!content) return '';
        const regex = new RegExp(key + ':\\s*([^\\n]+)', 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
    },

    /**
     * Trích xuất mô tả ngắn (Snippet)
     * Ưu tiên nội dung trước khi gặp marker ---META---
     */
    extractDescription(content, summary, length = 200) {
        if (!content) return '';
        const metaIndex = content.indexOf('---META---');
        let text = '';
        if (metaIndex > 0) {
            text = content.substring(0, metaIndex).trim();
        } else {
            text = (summary || content).replace(/<[^>]*>/g, '').trim();
        }
        return text.substring(0, length) + (text.length > length ? '...' : '');
    },

    /**
     * Lấy URL ảnh đầu tiên trong bài viết
     */
    extractFirstImage(content) {
        if (!content) return '';
        const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
        return imgMatch ? imgMatch[1] : '';
    },

    /**
     * Xử lý nội dung bài viết sạch (Xóa Metadata, Auto-format HTML)
     */
    extractFullContent(content) {
        if (!content) return '';
        let text = content;

        // Loại bỏ các khối Metadata quy chuẩn
        const blocks = ['---META---', '---SCREENSHOTS---', '---RELATED---', '---NOTE---'];
        blocks.forEach(block => {
            const regex = new RegExp(block + '[\\s\\S]*?---END---', 'g');
            text = text.replace(regex, '');
        });

        text = text.trim();

        // Auto-format cơ bản cho Markdown-like syntax
        text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
        text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
        text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        // Chuyển đổi xuống dòng thành <p> và <br>
        const paragraphs = text.split(/\n\s*\n/);
        return paragraphs.map(para => {
            para = para.trim();
            if (!para || para.startsWith('<h') || para.startsWith('<div')) return para;
            return `<p>${para.replace(/\n/g, '<br>')}</p>`;
        }).filter(p => p).join('\n');
    },

    /**
     * Trích xuất danh sách Screenshots
     */
    extractScreenshots(content) {
        const match = content.match(/---SCREENSHOTS---([\s\S]*?)---END---/);
        if (match) {
            return match[1].trim().split('\n').map(url => url.trim()).filter(url => url);
        }
        return [];
    },

    /**
     * Xử lý xóa dấu tiếng Việt (Hỗ trợ Search)
     */
    removeAccents(str) {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D");
    },

    /**
     * Fetch dữ liệu từ Blogger API
     */
    async fetchFeed(blogUrl, maxResults = 999) {
        const url = `${blogUrl}/feeds/posts/default?alt=json&max-results=${maxResults}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data.feed.entry || [];
        } catch (error) {
            console.error("BloggerCore Fetch Error:", error);
            return [];
        }
    }
};

// Hỗ trợ cả ES Modules và Global Window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BloggerCore;
} else {
    window.BloggerCore = BloggerCore;
}
