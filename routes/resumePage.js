// routes/resumePage.js

const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares");

// 새 이력서 작성 페이지
router.get("/new", isLoggedIn, (req, res) => {
    res.render("resume/resume_new.html");
});

// 이력서 뷰 페이지
router.get("/:id/view", isLoggedIn, (req, res) => {
    res.render("resume/resume_view.html", {
        resumeId: req.params.id
    });
});

// 이력서 수정 페이지
router.get("/:id/edit", isLoggedIn, (req, res) => {
    res.render("resume/resume_edit.html", {
        resumeId: req.params.id
    });
});

// PDF 페이지
router.get("/:id/pdf", isLoggedIn, (req, res) => {
    res.render("resume/pdf_resume.html", {
        id: req.params.id
    });
});

// 공개 이력서
router.get("/public", (req, res) => {
    res.render("resume/public_resume", {
        token: req.query.token || null
    });
});

module.exports = router;
