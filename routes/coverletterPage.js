// routes/coverletterPage.js
const express = require("express");
const router = express.Router();

// 새 작성
router.get("/new", (req, res) => {
    res.render("coverletter/coverletter_new");
});

// 상세보기
router.get("/view/:id", (req, res) => {
    res.render("coverletter/coverletter_view");
});

// 수정
router.get("/edit/:id", (req, res) => {
    res.render("coverletter/coverletter_edit");
});

// 공개 보기
router.get("/public", (req, res) => {
    res.render("coverletter/public_coverletter", {
        token: req.query.token || null
    });
});


// PDF HTML 페이지 (미리보기 용)
router.get("/:id/pdf", (req, res) => {
    res.render("coverletter/pdf_coverletter.html", {
        coverLetterId: req.params.id
    });
});

// routes/coverletterPage.js
router.get("/auto-draft", (req, res) => {
    res.render("coverletter/auto_draft");
});



module.exports = router;
