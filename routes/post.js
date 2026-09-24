// routes/post.js

const express = require('express');
const { isLoggedIn } = require('../middlewares');
const Post = require('../models/postModel');
const Vote = require('../models/voteModel');
const Comment = require('../models/commentModel');

const router = express.Router();

// 게시글 목록 페이지 GET /post
router.get('/', async (req, res, next) => {
    try {
        const filter = req.query.filter;
        let posts = await Post.getAll();

        if (filter === "normal") {
            posts = posts.filter(p => p.type === "normal");
        }
        else if (filter === "balance") {
            posts = posts.filter(p => p.type === "balance");
        }

        res.render('post/post_list', {
            posts,
            filter
        });

    } catch (err) {
        next(err);
    }
});


// 새 글 작성 페이지 GET /post/new
router.get('/new', isLoggedIn, (req, res) => {
    res.render('post/post_new');
});

// 글 작성 처리 POST /post
router.post('/', isLoggedIn, async (req, res, next) => {
    try {
        const { type, title, content } = req.body;
        // 밸런스 옵션들 (form에서 name="options" 여러 개로 보낼 예정)
        let options = req.body.options || [];

        if (!title || !content) {
            return res.status(400).send('제목과 내용을 입력해주세요.');
        }

        let postId;
        if (type === 'balance') {
            if (!Array.isArray(options)) {
                options = [options];
            }
            postId = await Post.createBalance({
                userId: req.user.id,
                title,
                content,
                options,
            });
        } else {
            postId = await Post.createNormal({
                userId: req.user.id,
                title,
                content,
            });
        }

        return res.redirect(`/post/${postId}`);
    } catch (err) {
        next(err);
    }
});

// 게시글 상세 페이지 GET /post/:id
router.get('/:id', async (req, res, next) => {
    try {
        const postId = req.params.id;
        const { post, options } = await Post.getByIdWithOptions(postId);

        if (!post) {
            return res.status(404).send('존재하지 않는 게시글입니다.');
        }

        // ----- 밸런스 투표 정보 -----
        let optionsWithVotes = options;
        let totalVotes = 0;
        let userVoteOptionId = null;

        // 닉네임 색 지정용: user_id -> option_index
        let voteColorMap = {};

        if (post.type === 'balance') {
            const summaryRows = await Vote.getSummary(postId);
            const countsMap = {};
            let total = 0;

            summaryRows.forEach((row) => {
                countsMap[row.option_id] = row.count;
                total += row.count;
            });

            totalVotes = total;

            optionsWithVotes = options.map((opt) => {
                const count = countsMap[opt.id] || 0;
                const percent = total > 0 ? Math.round((count * 100) / total) : 0;
                return {
                    ...opt,
                    count,
                    percent,
                };
            });

            if (req.user) {
                const userVote = await Vote.getUserVote(postId, req.user.id);
                userVoteOptionId = userVote ? userVote.option_id : null;
            }

            // 이 글에서 모든 유저의 투표 정보 가져와서 맵으로 만들기
            const userVotes = await Vote.getUserVotesByPost(postId);
            userVotes.forEach((v) => {
                // 예: { user_id: 3, option_index: 2 } -> voteColorMap[3] = 2
                voteColorMap[v.user_id] = v.option_index;
            });
        }

        // ----- 댓글 -----
        const comments = await Comment.getByPostId(postId);

        res.render('post/post_detail', {
            post,
            options: optionsWithVotes,
            totalVotes,
            userVoteOptionId,
            comments,
            voteColorMap,
        });
    } catch (err) {
        next(err);
    }
});

// 게시글 수정 페이지 GET /post/:id/edit
router.get('/:id/edit', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.id;
        const { post, options } = await Post.getByIdWithOptions(postId);
        if (!post) {
            return res.status(404).send('존재하지 않는 게시글입니다.');
        }
        if (post.user_id !== req.user.id) {
            return res.status(403).send('수정 권한이 없습니다.');
        }
        res.render('post/post_edit', { post, options });
    } catch (err) {
        next(err);
    }
});

// 게시글 수정 처리 POST /post/:id/edit
router.post('/:id/edit', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.id;
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).send('제목과 내용을 입력해주세요.');
        }

        const affected = await Post.update({
            id: postId,
            userId: req.user.id,
            title,
            content,
        });

        if (affected === 0) {
            // 글이 없거나 내 글이 아님
            return res.status(403).send('수정 권한이 없거나 존재하지 않는 글입니다.');
        }

        return res.redirect(`/post/${postId}`);
    } catch (err) {
        next(err);
    }
});

// 게시글 삭제 POST /post/:id/delete
router.post('/:id/delete', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.id;

        const affected = await Post.delete({
            id: postId,
            userId: req.user.id,
        });

        if (affected === 0) {
            return res.status(403).send('삭제 권한이 없거나 존재하지 않는 글입니다.');
        }

        return res.redirect('/post');
    } catch (err) {
        next(err);
    }
});

module.exports = router;