// routes/user.js

const express = require('express');
const { isLoggedIn } = require('../middlewares');
const Post = require('../models/postModel');

const router = express.Router();

// JSON으로 현재 로그인 정보 확인 (디버그용)
router.get('/me', (req, res) => {
    if (!req.user) {
        return res.json({ user: null });
    }
    return res.json({ user: req.user });
});

// 마이페이지: 내가 쓴 글 / 내가 투표한 밸런스 글
router.get('/mypage', isLoggedIn, async (req, res, next) => {
    try {
        const userId = req.user.id;

        const myPosts = await Post.getByUserId(userId);
        const votedBalancePosts = await Post.getBalancePostsVotedByUser(userId);

        res.render('mypage', {
            user: req.user,
            myPosts,
            votedBalancePosts,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
