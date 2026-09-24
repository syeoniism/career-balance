// routes/page.js

const express = require('express');
const { isLoggedIn, isNotLoggedIn, preventCache } = require('../middlewares');

const router = express.Router();

// 메인 페이지 (로그인)
router.get('/', (req, res) => {
    res.render('main');
});

// 회원가입 페이지
router.get('/join', isNotLoggedIn, (req, res) => {
    // views/join.html 렌더
    res.render('join');
});

// 홈페이지
router.get('/home', isLoggedIn, preventCache, (req, res) => {
    res.render('home');
});

// 마이페이지
router.get('/mypage', isLoggedIn, (req, res) => {
    res.render('mypage');
});

// 이력서 상세
router.get('/resume/:id', isLoggedIn, (req, res) => {
    res.render('resume/resume_view', { resumeId: req.params.id });
});

// 이력서 수정
router.get('/resume/:id/edit', isLoggedIn, (req, res) => {
    res.render('resume/resume_edit', { resumeId: req.params.id });
});



module.exports = router;
