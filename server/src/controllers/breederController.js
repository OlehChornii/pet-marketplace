// server/src/controllers/breederController.js
const pool = require('../config/database');

exports.getAllBreeders = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM breeders WHERE license_verified = true ORDER BY business_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching breeders:', error);
    res.status(500).json({ error: 'Failed to fetch breeders' });
  }
};

exports.getBreederById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, u.email, u.phone, COUNT(p.id) as pet_count FROM breeders b LEFT JOIN users u ON b.user_id = u.id LEFT JOIN pets p ON b.id = p.breeder_id WHERE b.id = $1 GROUP BY b.id, u.email, u.phone',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breeder not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching breeder:', error);
    res.status(500).json({ error: 'Failed to fetch breeder' });
  }
};

exports.createBreeder = async (req, res) => {
  try {
    const { business_name, license_number, description, address, website } = req.body;
    
    const result = await pool.query(
      'INSERT INTO breeders (user_id, business_name, license_number, description, address, website) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, business_name, license_number, description, address, website]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating breeder:', error);
    res.status(500).json({ error: 'Failed to create breeder' });
  }
};

exports.updateBreeder = async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE breeders SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
      [...values, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breeder not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating breeder:', error);
    res.status(500).json({ error: 'Failed to update breeder' });
  }
};