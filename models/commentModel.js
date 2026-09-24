// models/commentModel.js
// 게시판의 댓글 구현
const db = require('./index');

const CommentModel = {
    // 특정 게시글의 댓글 목록 모두 가져오기
    getByPostId: async (postId) => {
        const [rows] = await db.query(
            `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
                    DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at_simple,
                    u.nickname
             FROM comments c
                      JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postId]
        );
        return rows;
    },

    // 댓글/대댓글 작성
    create: async ({ postId, userId, content, parentId = null }) => {
        const [result] = await db.query(
            'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
            [postId, userId, parentId, content]
        );
        return result.insertId;
    },

    // 댓글 하나 조회 (삭제 시 post_id 필요)
    getById: async (id) => {
        const [rows] = await db.query(
            'SELECT * FROM comments WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    // 댓글 삭제 (내 댓글만)
    delete: async ({ id, userId }) => {
        const [result] = await db.query(
            'DELETE FROM comments WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows; // 1이면 성공, 0이면 권한 없음 or 존재X
    },

};

module.exports = CommentModel;
