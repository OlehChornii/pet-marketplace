// server/src/controllers/articleController.js
const pool = require('../config/database');

exports.getArticles = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT a.*, u.first_name, u.last_name FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE published = true';
    const params = [];
    
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
};

exports.getArticleById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT a.*, u.first_name, u.last_name FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const { title, category, content, image_url } = req.body;
    
    const result = await pool.query(
      'INSERT INTO articles (title, category, content, author_id, image_url, published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, category, content, req.user.id, image_url, false]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE articles SET ${setClause} WHERE id = $${fields.length + 1} AND author_id = $${fields.length + 2} RETURNING *`,
      [...values, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM articles WHERE id = $1 AND author_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }
    
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
};