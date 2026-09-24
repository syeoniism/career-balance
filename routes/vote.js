// routes/vote.js

const express = require('express');
const { isLoggedIn } = require('../middlewares');
const Vote = require('../models/voteModel');

const router = express.Router();

// POST /vote/:postId
router.post('/:postId', isLoggedIn, async (req, res, next) => {
    try {
        const postId = parseInt(req.params.postId, 10);
        const { optionId } = req.body;
        const userId = req.user.id;

        if (!optionId) {
            return res.status(400).send('옵션을 선택해주세요.');
        }

        // 한 번만 투표 허용 (VoteModel.upsert에서 중복 체크)
        const ok = await Vote.upsert({ postId, optionId, userId });
        console.log('투표 처리:', { ok, postId, optionId, userId });

        // 끝나면 다시 해당 게시글 상세로
        return res.redirect(`/post/${postId}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
