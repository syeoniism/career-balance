// models/postModels.js
// 게시판 기능
const db = require('./index');

const PostModel = {
    // 전체 글 목록 (작성자 닉네임 포함)
    getAll: async () => {
        const [rows] = await db.query(
            `SELECT
                 p.id, p.user_id, p.title, p.type,
                 DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS created_at,
                 u.nickname,
                 (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
             FROM posts p
                      JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`
        );
        return rows;
    },

    // 일반 글 작성
    createNormal: async ({ userId, title, content }) => {
        const [result] = await db.query(
            'INSERT INTO posts (user_id, title, content, type) VALUES (?, ?, ?, ?)',
            [userId, title, content, 'normal']
        );
        return result.insertId;
    },

    // 밸런스 글 작성
    createBalance: async ({ userId, title, content, options }) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // 1. 게시글 저장
            const [postResult] = await conn.query(
                'INSERT INTO posts (user_id, title, content, type) VALUES (?, ?, ?, ?)',
                [userId, title, content, 'balance']
            );
            const postId = postResult.insertId;

            // 2. 옵션 저장 (배열인지 확인 후 저장)
            if (Array.isArray(options)) {
                let index = 1;
                for (const opt of options) {
                    const label = (opt || '').trim();
                    if (!label) continue; // 빈 칸은 저장 안 함

                    await conn.query(
                        'INSERT INTO balance_options (post_id, option_index, label) VALUES (?, ?, ?)',
                        [postId, index, label]
                    );
                    index += 1;
                }
            }

            await conn.commit(); // 모두 성공하면 저장 확정
            conn.release();
            return postId;
        } catch (err) {
            await conn.rollback(); // 하나라도 실패하면 없던 일로
            conn.release();
            throw err;
        }
    },

    // 글 + 옵션 + "투표 수/퍼센트" 상세 조회
    getByIdWithOptions: async (id) => {
        // Promise.all로 게시글 정보와 옵션(투표수 포함)을 동시에 가져옴
        const [[postRows], [optRows]] = await Promise.all([
            // 1. 게시글 정보 조회
            db.query(
                `SELECT
                     p.id, p.user_id, p.title, p.content, p.type,
                     DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS created_at_simple,
                     u.nickname
                 FROM posts p
                          JOIN users u ON p.user_id = u.id
                 WHERE p.id = ?`,
                [id]
            ),
            // 2. 옵션 정보 + 해당 옵션의 투표 수(count) 조회
            db.query(
                `SELECT
                     o.id, o.option_index, o.label,
                     (SELECT COUNT(*) FROM votes v WHERE v.option_id = o.id) AS count
                 FROM balance_options o
                 WHERE o.post_id = ?
                 ORDER BY o.option_index ASC`,
                [id]
            ),
        ]);

        const post = postRows[0] || null;
        let options = optRows;

        // 3. 퍼센트(%) 계산
        if (options && options.length > 0) {
            // 전체 투표 수 합산
            const totalVotes = options.reduce((sum, opt) => sum + opt.count, 0);

            // 각 옵션별 퍼센트 계산
            options = options.map(opt => {
                let percent = 0;
                if (totalVotes > 0) {
                    percent = ((opt.count / totalVotes) * 100).toFixed(1); // 소수점 1자리
                }
                return { ...opt, percent }; // 기존 옵션 데이터에 percent 추가
            });
        }

        return { post, options };
    },

    // 특정 유저가 쓴 글들
    getByUserId: async (userId) => {
        const [rows] = await db.query(
            `SELECT
                 p.id,
                 p.title,
                 p.type,
                 DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS created_at
             FROM posts p
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [userId]
        );
        return rows;
    },

    // 특정 유저가 투표한 밸런스 글 목록 보기 (마이페이지에서 확인 가능)
    getBalancePostsVotedByUser: async (userId) => {
        const [rows] = await db.query(
            `SELECT DISTINCT
                 p.id,
                 p.title,
                 DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS created_at,
                 u.nickname AS author_nickname,
                 o.option_index,
                 o.label AS option_label
             FROM votes v
                      JOIN posts p ON v.post_id = p.id
                      JOIN users u ON p.user_id = u.id
                      JOIN balance_options o ON v.option_id = o.id
             WHERE v.user_id = ?
               AND p.type = 'balance'
             ORDER BY created_at DESC`,
            [userId]
    );
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(
            `SELECT
                 p.id, p.title, p.content, p.type,
                 DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS created_at_simple,
                 u.id AS user_id, u.nickname
             FROM posts p
                      JOIN users u ON u.id = p.user_id
             WHERE p.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    update: async ({ id, userId, title, content }) => {
        const [result] = await db.query(
            'UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?',
            [title, content, id, userId]
        );
        return result.affectedRows;
    },

    delete: async ({ id, userId }) => {
        const [result] = await db.query(
            'DELETE FROM posts WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows;
    },
};

module.exports = PostModel;