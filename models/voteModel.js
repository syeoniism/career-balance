// models/voteModel.js
const db = require('./index');

const VoteModel = {
    // 한 번만 투표 허용
    // return 값: true = 이번에 새로 투표함, false = 이미 투표한 상태라 무시
    upsert: async ({ postId, optionId, userId }) => {
        // 1) 이미 이 글에 투표했는지 확인
        const [rows] = await db.query(
            'SELECT id FROM votes WHERE post_id = ? AND user_id = ? LIMIT 1',
            [postId, userId]
        );

        if (rows.length > 0) {
            // 이미 투표한 유저라면 false 반환 (중복 투표 차단)
            return false;
        }

        // 2) 처음 투표하는 경우에만 INSERT
        await db.query(
            'INSERT INTO votes (post_id, option_id, user_id) VALUES (?, ?, ?)',
            [postId, optionId, userId]
        );

        return true;
    },

    // 결과 집계
    getSummary: async (postId) => {
        const [rows] = await db.query(
            'SELECT option_id, COUNT(*) AS count FROM votes WHERE post_id = ? GROUP BY option_id',
            [postId]
        );
        return rows; // 예 : [{option_id: 1, count: 10}, ...]
    },

    // 내가 투표한 내용 확인
    getUserVote: async (postId, userId) => {
        const [rows] = await db.query(
            'SELECT * FROM votes WHERE post_id = ? AND user_id = ? LIMIT 1',
            [postId, userId]
        );
        return rows[0] || null;
    },

    // 댓글 색상 표시용 (어디에 투표했는지? 구분)
    getUserVotesByPost: async (postId) => {
        const [rows] = await db.query(
            `SELECT v.user_id, v.option_id, o.option_index
             FROM votes v
                      JOIN balance_options o ON v.option_id = o.id
             WHERE v.post_id = ?`,
            [postId]
        );
        return rows; // [{ user_id, option_id, option_index }, ...]
    },
};

module.exports = VoteModel;
