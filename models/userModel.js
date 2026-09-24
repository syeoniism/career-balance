// models/userModel.js

const db = require('./index');
const bcrypt = require('bcrypt');

const UserModel = {
    // 회원가입
    create: async ({ email, password, nickname }) => {
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)',
            [email, hashed, nickname]
        );
        return {
            id: result.insertId,
            email,
            nickname,
        };
    },

    // 이메일로 한 명 조회
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [
            email,
        ]);
        return rows[0] || null;
    },

    // id로 한 명 조회 (비번은 빼고)
    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, email, nickname FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },
};

module.exports = UserModel;
