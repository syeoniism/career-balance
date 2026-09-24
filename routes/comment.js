// routes/comment.js

const express = require('express');
const { isLoggedIn } = require('../middlewares');
const Comment = require('../models/commentModel');

const router = express.Router();

// POST /comment/:postId
router.post('/:postId', isLoggedIn, async (req, res, next) => {
    try {
        const postId = req.params.postId; // 게시글 id
        const { content, parentId } = req.body; // 내용 / 부모 댓글 ID

        console.log('댓글 요청 들어옴:', { postId, content, parentId, user: req.user });

        // 내용 확인 (빈 댓글 방지)
        if (!content || !content.trim()) {
            return res.status(400).send('댓글 내용을 입력하세요.');
        }

        // 모델 호출 (DB 저장)
        await Comment.create({
            postId,
            userId: req.user.id,
            content: content.trim(),
            parentId: parentId || null,
        });
        
        // 완료 후 새로고침
        return res.redirect(`/post/${postId}`);
    } catch (err) {
        console.error('댓글 작성 중 에러:', err);
        next(err);
    }
});

// POST /comment/:commentId/delete : 댓글 삭제
router.post('/:commentId/delete', isLoggedIn, async (req, res, next) => {
    try {
        const commentId = req.params.commentId;

        // 댓글 조회
        const comment = await Comment.getById(commentId);
        if (!comment) {
            return res.status(404).send('존재하지 않는 댓글입니다.');
        }

        // 내 댓글인지 확인
        if (comment.user_id !== req.user.id) {
            return res.status(403).send('삭제 권한이 없습니다.');
        }

        // 삭제
        const affected = await Comment.delete({
            id: commentId,
            userId: req.user.id,
        });

        if (affected === 0) {
            return res.status(403).send('삭제 권한이 없거나 이미 삭제된 댓글입니다.');
        }
        
        return res.redirect(`/post/${comment.post_id}`);
    } catch (err) {
        console.error('댓글 삭제 중 에러:', err);
        next(err);
    }
});


module.exports = router;