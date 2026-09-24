// routes/portfolio.js
const express = require("express");
const router = express.Router();
const pool = require("../models");

// 공개 포트폴리오 조회 (is_public = 1)
router.get("/:id", async (req, res) => {
    const resumeId = req.params.id;

    try {
        // 1) 이력서 기본 정보
        const [rows] = await pool.query(
            `
                SELECT
                    *
                FROM resumes
                WHERE id = ?
                  AND is_public = 1
            `,
            [resumeId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "공개된 이력서를 찾을 수 없습니다."
            });
        }

        const resume = rows[0];

        // 2) 섹션들
        const [sections] = await pool.query(
            `
                SELECT
                    id,
                    section_type,
                    content,
                    sort_order
                FROM resume_sections
                WHERE resume_id = ?
                ORDER BY section_type, sort_order, id
            `,
            [resumeId]
        );

        res.json({
            resume,
            sections
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "포트폴리오 조회 중 오류" });
    }
});


module.exports = router;
