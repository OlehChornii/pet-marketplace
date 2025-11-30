// server/src/routes/articles.js
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const auth = require('../middleware/auth');

router.get('/', articleController.getArticles);
router.get('/:id', articleController.getArticleById);
router.post('/', auth.verifyToken, articleController.createArticle);
router.put('/:id', auth.verifyToken, articleController.updateArticle);
router.delete('/:id', auth.verifyToken, articleController.deleteArticle);

module.exports = router;