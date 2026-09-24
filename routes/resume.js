// routes/resume.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const pool = require("../models");

// =======================================================
// Multer 설정
// =======================================================
const uploadPath = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// =======================================================
// 로그인 체크
// =======================================================
function requireLogin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "로그인 필요" });
    }
    next();
}

// =======================================================
// [페이지 렌더링 라우터] — HTML View 렌더링
// =======================================================

// 새 이력서 작성 화면
router.get("/new", requireLogin, (req, res) => {
    res.render("resume/resume_new.html");
});

// 이력서 수정 화면
router.get("/:id/edit", requireLogin, (req, res) => {
    res.render("resume/resume_edit.html", { resumeId: req.params.id });
});


// 이력서 상세 보기 화면
router.get("/:id/view", requireLogin, (req, res) => {
    res.render("resume/resume_view.html", { resumeId: req.params.id });
});

// =======================================================
// 섹션 생성 유틸 함수
// =======================================================
async function insertSections(conn, resumeId, body) {
    const keys = [
        "summary", "education", "internships", "projects",
        "awards", "activities", "skills", "others"
    ];

    for (const key of keys) {
        const value = body[key];
        if (!value || !String(value).trim()) continue;

        await conn.query(
            `INSERT INTO resume_sections (resume_id, section_type, content, sort_order)
             VALUES (?, ?, ?, ?)`,
            [resumeId, key, value.trim(), 1]
        );
    }
}

// =======================================================
// 1) 내 이력서 리스트  GET /api/resumes/my
// =======================================================
router.get("/my", requireLogin, async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT id, resume_title AS title, name, email, telephone,
                    github_id, profile_image_url, is_public,
                    created_at, updated_at
             FROM resumes
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "목록 조회 오류" });
    }
});

// =======================================================
// 2) 이력서 조회 GET /api/resumes/:id
// =======================================================
router.get("/:id", requireLogin, async (req, res) => {
    try {
        const resumeId = req.params.id;
        const userId = req.user.id;

        const [resumeRows] = await pool.query(
            `SELECT * FROM resumes WHERE id = ?`,
            [resumeId]
        );

        if (resumeRows.length === 0)
            return res.status(404).json({ message: "존재하지 않음" });

        const resume = resumeRows[0];
        if (resume.user_id !== userId)
            return res.status(403).json({ message: "권한 없음" });

        const [sections] = await pool.query(
            `SELECT * FROM resume_sections
             WHERE resume_id = ?
             ORDER BY section_type, sort_order, id`,
            [resumeId]
        );

        res.json({ resume, sections });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "조회 오류" });
    }
});

// =======================================================
// 3) 생성 POST /api/resumes
// =======================================================
router.post(
    "/",
    requireLogin,
    upload.single("profile_image"),
    async (req, res) => {
        const conn = await pool.getConnection();
        try {
            const userId = req.user.id;
            const { resume_title, name, email, telephone, github_id, is_public } = req.body;
            const isPublicInt = (is_public === "1" || is_public === "true") ? 1 : 0;
            if (!resume_title || !name) {
                conn.release();
                return res.status(400).json({ message: "필수 항목 누락" });
            }

            const [cnt] = await conn.query(
                "SELECT COUNT(*) AS c FROM resumes WHERE user_id = ?",
                [userId]
            );
            if (cnt[0].c >= 3) {
                conn.release();
                return res.status(400).json({ message: "이력서는 최대 3개" });
            }

            const image = req.file ? `/uploads/${req.file.filename}` : null;

            await conn.beginTransaction();

            const [result] = await conn.query(
                `INSERT INTO resumes
                 (user_id, resume_title, name, email, telephone, github_id,
                  profile_image_url, is_public)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    resume_title,
                    name,
                    email || null,
                    telephone || null,
                    github_id || null,
                    image,
                    is_public ? 1 : 0
                ]
            );

            const resumeId = result.insertId;

            await insertSections(conn, resumeId, req.body);

            await conn.commit();
            conn.release();

            res.status(201).json({ message: "생성 완료", resumeId });
        } catch (err) {
            await conn.rollback();
            conn.release();
            console.error(err);
            res.status(500).json({ message: "생성 오류" });
        }
    }
);

// =======================================================
// 4) 수정 PUT /api/resumes/:id
// =======================================================
router.put(
    "/:id",
    requireLogin,
    upload.single("profile_image"),
    async (req, res) => {
        const conn = await pool.getConnection();
        try {
            const resumeId = req.params.id;
            const userId = req.user.id;
            const { resume_title, name, email, telephone, github_id, is_public } = req.body;
            const isPublicInt = (is_public === "1" || is_public === "true") ? 1 : 0;
            const [rows] = await conn.query(
                "SELECT * FROM resumes WHERE id = ?",
                [resumeId]
            );

            if (rows.length === 0) {
                conn.release();
                return res.status(404).json({ message: "존재하지 않음" });
            }

            const old = rows[0];
            if (old.user_id !== userId) {
                conn.release();
                return res.status(403).json({ message: "권한 없음" });
            }

            const image = req.file ? `/uploads/${req.file.filename}` : old.profile_image_url;

            await conn.beginTransaction();

            await conn.query(
                `UPDATE resumes
                 SET resume_title=?, name=?, email=?, telephone=?, github_id=?,
                     profile_image_url=?, is_public=?, updated_at=NOW()
                 WHERE id=? AND user_id=?`,
                [
                    resume_title,
                    name,
                    email || null,
                    telephone || null,
                    github_id || null,
                    image,
                    isPublicInt,
                    resumeId,
                    userId
                ]
            );

            await conn.query("DELETE FROM resume_sections WHERE resume_id=?", [resumeId]);
            await insertSections(conn, resumeId, req.body);

            await conn.commit();
            conn.release();

            res.json({ message: "수정 완료" });
        } catch (err) {
            await conn.rollback();
            conn.release();
            console.error(err);
            res.status(500).json({ message: "수정 오류" });
        }
    }
);

// =======================================================
// 5) 삭제 DELETE /api/resumes/:id
// =======================================================
router.delete("/:id", requireLogin, async (req, res) => {
    try {
        const resumeId = req.params.id;
        const userId = req.user.id;

        await pool.query(
            "DELETE FROM resumes WHERE id=? AND user_id=?",
            [resumeId, userId]
        );

        res.json({ message: "삭제 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "삭제 오류" });
    }
});

// =======================================================
// 6) 공개/비공개
// =======================================================
// 공개 처리 (하나만 남김)
router.patch("/:id/public", requireLogin, async (req, res) => {
    try {
        const resumeId = req.params.id;
        const userId = req.user.id;
        const token = uuidv4();

        await pool.query(
            `UPDATE resumes
             SET is_public = 1,
                 shared_token = ?
             WHERE id = ? AND user_id = ?`,
            [token, resumeId, userId]
        );

        const host = `${req.protocol}://${req.get("host")}`;
        const shareUrl = `${host}/resume/public?token=${token}`;

        res.json({
            message: "공개됨",
            share_url: shareUrl,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "오류" });
    }
});

// 비공개 처리
router.patch("/:id/private", requireLogin, async (req, res) => {
    try {
        const resumeId = req.params.id;
        const userId = req.user.id;

        await pool.query(
            `UPDATE resumes
             SET is_public=0, shared_token=NULL
             WHERE id=? AND user_id=?`,
            [resumeId, userId]
        );

        res.json({ message: "비공개 처리됨" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "오류" });
    }
});

router.get("/:id/pdf", requireLogin, (req, res) => {
    const resumeId = req.params.id;
    res.render("resume/pdf_resume.html", { resumeId });
});

// =======================================================
// 7) 공개 이력서 조회 (로그인 불필요, 토큰 기반)
//    GET /api/resumes/public/:token
// =======================================================
router.get("/public/:token", async (req, res) => {
    try {
        const token = req.params.token;

        // 1) 토큰으로 이력서 찾기 (is_public = 1 조건 필수)
        const [rows] = await pool.query(
            `SELECT id, user_id, resume_title, name, email, telephone,
                    github_id, profile_image_url, is_public, shared_token,
                    created_at, updated_at
             FROM resumes
             WHERE shared_token = ? AND is_public = 1`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "공개된 이력서를 찾을 수 없습니다." });
        }

        const resume = rows[0];

        // 2) 이력서 섹션 조회
        const [sections] = await pool.query(
            `SELECT * FROM resume_sections
             WHERE resume_id = ?
             ORDER BY section_type, sort_order, id`,
            [resume.id]
        );

        res.json({ resume, sections });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "공개 이력서 조회 오류" });
    }
});

module.exports = router;
