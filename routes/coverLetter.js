// routes/coverLetter.js
const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../models");

// 로그인 확인
function requireLogin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    next();
}

// 섹션 생성 유틸
async function insertSections(connection, coverLetterId, body) {
    const { background, strengths, motivation, future } = body;

    async function addSection(type, value, order = 1) {
        if (!value || !String(value).trim()) return;
        await connection.query(
            `
            INSERT INTO cover_letter_sections
                (cover_letter_id, section_type, content, sort_order)
            VALUES (?, ?, ?, ?)
        `,
            [coverLetterId, type, value.trim(), order]
        );
    }

    await addSection("background", background, 1);
    await addSection("strengths", strengths, 1);
    await addSection("motivation", motivation, 1);
    await addSection("future", future, 1);
}

// 1) 내 자기소개서 목록
//    GET /api/coverletters/my
router.get("/my", requireLogin, async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `
            SELECT
                id,
                title,
                is_public,
                created_at,
                updated_at
            FROM cover_letters
            WHERE user_id = ?
            ORDER BY created_at DESC
        `,
            [userId]
        );

        res.json(rows);
    } catch (err) {
        console.error("GET /api/coverletters/my Error:", err);
        res.status(500).json({ message: "자기소개서 목록 조회 중 오류" });
    }
});

// 2) 특정 자기소개서 조회
//    GET /api/coverletters/:id
router.get("/:id", requireLogin, async (req, res) => {
    try {
        const clId = req.params.id;
        const userId = req.user.id;

        const [clRows] = await pool.query(
            `
            SELECT
                id,
                user_id,
                title,
                is_public,
                shared_token,
                created_at,
                updated_at
            FROM cover_letters
            WHERE id = ?
        `,
            [clId]
        );

        if (clRows.length === 0) {
            return res.status(404).json({ message: "자기소개서를 찾을 수 없습니다." });
        }

        const coverLetter = clRows[0];

        if (coverLetter.user_id !== userId) {
            return res.status(403).json({ message: "내 자기소개서만 조회 가능합니다." });
        }

        const [sections] = await pool.query(
            `
            SELECT
                id,
                section_type,
                content,
                sort_order,
                created_at
            FROM cover_letter_sections
            WHERE cover_letter_id = ?
            ORDER BY section_type, sort_order, id
        `,
            [clId]
        );

        res.json({ coverLetter, sections });
    } catch (err) {
        console.error("GET /api/coverletters/:id Error:", err);
        res.status(500).json({ message: "자기소개서 조회 중 오류" });
    }
});

// 3) 자기소개서 생성
//    POST /api/coverletters
router.post("/", requireLogin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.id;
        const { title, is_public } = req.body;

        if (!title || !String(title).trim()) {
            connection.release();
            return res.status(400).json({ message: "자기소개서 제목은 필수입니다." });
        }

        await connection.beginTransaction();

        const [result] = await connection.query(
            `
            INSERT INTO cover_letters
                (user_id, title, is_public)
            VALUES (?, ?, ?)
        `,
            [userId, title.trim(), is_public ? 1 : 0]
        );

        const clId = result.insertId;

        await insertSections(connection, clId, req.body);

        await connection.commit();
        connection.release();

        res.status(201).json({
            message: "자기소개서가 생성되었습니다.",
            coverLetterId: clId,
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("POST /api/coverletters Error:", err);
        res.status(500).json({ message: "자기소개서 생성 중 오류" });
    }
});

// 4) 자기소개서 수정
//    PUT /api/coverletters/:id
router.put("/:id", requireLogin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const clId = req.params.id;
        const userId = req.user.id;
        const { title, is_public } = req.body;

        if (!title || !String(title).trim()) {
            connection.release();
            return res
                .status(400)
                .json({ message: "자기소개서 제목은 필수입니다." });
        }

        const [rows] = await connection.query(
            "SELECT * FROM cover_letters WHERE id = ?",
            [clId]
        );
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: "수정할 자기소개서를 찾을 수 없습니다." });
        }

        const old = rows[0];
        if (old.user_id !== userId) {
            connection.release();
            return res.status(403).json({ message: "내 자기소개서만 수정할 수 있습니다." });
        }

        await connection.beginTransaction();

        await connection.query(
            `
            UPDATE cover_letters
            SET title = ?,
                is_public = ?,
                updated_at = NOW()
            WHERE id = ? AND user_id = ?
        `,
            [title.trim(), is_public ? 1 : 0, clId, userId]
        );

        // 기존 섹션 삭제 후 재삽입
        await connection.query(
            "DELETE FROM cover_letter_sections WHERE cover_letter_id = ?",
            [clId]
        );
        await insertSections(connection, clId, req.body);

        await connection.commit();
        connection.release();

        res.json({ message: "자기소개서가 수정되었습니다." });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("PUT /api/coverletters/:id Error:", err);
        res.status(500).json({ message: "자기소개서 수정 중 오류" });
    }
});

// 5) 자기소개서 삭제
//    DELETE /api/coverletters/:id
router.delete("/:id", requireLogin, async (req, res) => {
    try {
        const clId = req.params.id;
        const userId = req.user.id;

        await pool.query(
            "DELETE FROM cover_letters WHERE id = ? AND user_id = ?",
            [clId, userId]
        );
        // 섹션은 ON DELETE CASCADE

        res.json({ message: "자기소개서가 삭제되었습니다." });
    } catch (err) {
        console.error("DELETE /api/coverletters/:id Error:", err);
        res.status(500).json({ message: "자기소개서 삭제 중 오류" });
    }
});

// 6) 공개 전환
//    PATCH /api/coverletters/:id/public
router.patch("/:id/public", requireLogin, async (req, res) => {
    try {
        const clId = req.params.id;
        const userId = req.user.id;

        const [rows] = await pool.query(
            "SELECT * FROM cover_letters WHERE id = ? AND user_id = ?",
            [clId, userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "자기소개서를 찾을 수 없습니다." });
        }

        let token = rows[0].shared_token;
        if (!token) token = uuidv4();

        await pool.query(
            `
            UPDATE cover_letters
            SET is_public = 1,
                shared_token = ?
            WHERE id = ? AND user_id = ?
        `,
            [token, clId, userId]
        );

        res.json({
            message: "자기소개서가 공개되었습니다.",
            share_url: `${req.protocol}://${req.get("host")}/coverletter/public?token=${token}`,

        });
    } catch (err) {
        console.error("PATCH /api/coverletters/:id/public Error:", err);
        res.status(500).json({ message: "공개 전환 중 오류" });
    }
});

// 7) 비공개 전환
//    PATCH /api/coverletters/:id/private
router.patch("/:id/private", requireLogin, async (req, res) => {
    try {
        const clId = req.params.id;
        const userId = req.user.id;

        await pool.query(
            `
            UPDATE cover_letters
            SET is_public = 0,
                shared_token = NULL
            WHERE id = ? AND user_id = ?
        `,
            [clId, userId]
        );

        res.json({ message: "비공개 처리되었습니다." });
    } catch (err) {
        console.error("PATCH /api/coverletters/:id/private Error:", err);
        res.status(500).json({ message: "비공개 전환 중 오류" });
    }
});

// 8) 공개 자기소개서 조회 (로그인 필요 없음)
//    GET /api/coverletters/public/:token
router.get("/public/:token", async (req, res) => {
    try {
        const token = req.params.token;

        const [rows] = await pool.query(
            `
            SELECT
                id,
                user_id,
                title,
                is_public,
                shared_token,
                created_at,
                updated_at
            FROM cover_letters
            WHERE shared_token = ? AND is_public = 1
        `,
            [token]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "공개된 자기소개서를 찾을 수 없습니다." });
        }

        const coverLetter = rows[0];

        const [sections] = await pool.query(
            `
            SELECT
                section_type,
                content,
                sort_order
            FROM cover_letter_sections
            WHERE cover_letter_id = ?
            ORDER BY sort_order, id
        `,
            [coverLetter.id]
        );

        res.json({ coverLetter, sections });
    } catch (err) {
        console.error("GET /api/coverletters/public/:token Error:", err);
        res.status(500).json({ message: "공개 자기소개서 조회 중 오류" });
    }
});


// ==========================
//  자기소개서 목록 로드
// ==========================
async function loadCoverLetters() {
    const box = document.getElementById("clList");
    const newBtn = document.getElementById("newCLBtn");

    newBtn.href = "/coverletter/new";
    newBtn.style.background = "#1664d9";
    newBtn.style.pointerEvents = "auto";
    newBtn.innerText = "새 자기소개서 만들기";

    const res = await fetch("/api/coverletters/my");
    if (!res.ok) {
        box.innerHTML = "<p>자기소개서를 불러오는 중 오류가 발생했습니다.</p>";
        return;
    }

    const list = await res.json();
    box.innerHTML = "";

    if (list.length === 0) {
        box.innerHTML = "<p>아직 자기소개서가 없습니다.</p>";
        return;
    }

    list.forEach(c => {
        const dateStr = c.updated_at
            ? c.updated_at.split("T")[0]
            : (c.created_at ? c.created_at.split("T")[0] : "-");

        const viewLink = `/coverletter/view/${c.id}`;

        box.innerHTML += `
            <div class="resume-box">
                <a href="${viewLink}">
                    <strong>${c.title}</strong>
                </a>
                ${
            c.is_public
                ? '<span class="tag">공개중</span>'
                : '<span class="tag" style="background:#aaa;">비공개</span>'
        }
                <br>수정일: ${dateStr}
                <br><br>

                <a class="btn" href="/coverletter/edit/${c.id}">수정</a>

                <button class="btn" onclick="downloadCLPDF(${c.id})" style="background:#34495e;">
                    📄 PDF
                </button>

                ${
            c.is_public
                ? `<button class="btn" style="background:#e67e22;" onclick="setCLPrivate(${c.id})">비공개 전환</button>`
                : `<button class="btn" style="background:#27ae60;" onclick="setCLPublic(${c.id})">공개 전환</button>`
        }

                <button class="btn"
                    id="cl-copy-btn-${c.id}"
                    style="background:#2ecc71;"
                    onclick="copyCLShareURL(${c.id})"
                    ${c.is_public ? "" : "disabled"}>
                    🔗 URL 복사
                </button>

                <button class="btn" onclick="deleteCoverLetter(${c.id})" style="background:#e74c3c;">
                    삭제
                </button>
            </div>
        `;
    });
}

// PDF
function downloadCLPDF(id) {
    window.open(`/coverletter/pdf/${id}`, "_blank");
}

// 공개/비공개 토글
async function setCLPublic(id) {
    const res = await fetch(`/api/coverletters/${id}/public`, { method: "PATCH" });
    const data = await res.json();
    if (res.ok) {
        alert("자기소개서가 공개되었습니다!");
        loadCoverLetters();
    } else {
        alert(data.message || "공개 전환 실패");
    }
}

async function setCLPrivate(id) {
    const res = await fetch(`/api/coverletters/${id}/private`, { method: "PATCH" });
    const data = await res.json();
    if (res.ok) {
        alert("자기소개서가 비공개로 전환되었습니다.");
        loadCoverLetters();
    } else {
        alert(data.message || "비공개 전환 실패");
    }
}

// URL 복사
async function copyCLShareURL(id) {
    try {
        const res = await fetch(`/api/coverletters/${id}/public`, {
            method: "PATCH"
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "URL 생성 실패");
            return;
        }

        const shareURL = data.share_url;

        await navigator.clipboard.writeText(shareURL);
        alert("자기소개서 공개용 URL이 복사되었습니다!\n" + shareURL);

        loadCoverLetters();
    } catch (err) {
        console.error(err);
        alert("URL 복사 중 오류 발생");
    }
}



// 삭제
async function deleteCoverLetter(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const res = await fetch(`/api/coverletters/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
        alert("자기소개서가 삭제되었습니다.");
        loadCoverLetters();
    } else {
        alert(data.message || "삭제 실패");
    }
}

module.exports = router;
