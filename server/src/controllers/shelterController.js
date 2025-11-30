// server/src/controllers/shelterController.js
const pool = require('../config/database');

exports.getAllShelters = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shelters ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shelters:', error);
    res.status(500).json({ error: 'Failed to fetch shelters' });
  }
};

exports.getShelterById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, COUNT(p.id) as pet_count FROM shelters s LEFT JOIN pets p ON s.id = p.shelter_id WHERE s.id = $1 GROUP BY s.id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching shelter:', error);
    res.status(500).json({ error: 'Failed to fetch shelter' });
  }
};

exports.createShelter = async (req, res) => {
  try {
    const { name, registration_number, description, address, phone, email, website } = req.body;
    
    const result = await pool.query(
      'INSERT INTO shelters (user_id, name, registration_number, description, address, phone, email, website) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, name, registration_number, description, address, phone, email, website]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating shelter:', error);
    res.status(500).json({ error: 'Failed to create shelter' });
  }
};

exports.updateShelter = async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE shelters SET ${setClause} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
      [...values, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shelter not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating shelter:', error);
    res.status(500).json({ error: 'Failed to update shelter' });
  }
};