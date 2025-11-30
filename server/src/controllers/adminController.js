// server/src/controllers/adminController.js
const pool = require('../config/database');

exports.getPendingPets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.email 
       FROM pets p 
       LEFT JOIN users u ON p.owner_id = u.id 
       WHERE p.status = $1 
       ORDER BY p.created_at DESC`,
      ['pending']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending pets:', error);
    res.status(500).json({ error: 'Failed to fetch pending pets' });
  }
};

exports.approvePet = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE pets SET status = $1 WHERE id = $2 RETURNING *',
      ['available', req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving pet:', error);
    res.status(500).json({ error: 'Failed to approve pet' });
  }
};

exports.rejectPet = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE pets SET status = $1 WHERE id = $2 RETURNING *',
      ['rejected', req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting pet:', error);
    res.status(500).json({ error: 'Failed to reject pet' });
  }
};

exports.getAdoptionApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        aa.*, 
        p.name as pet_name, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.phone, 
        s.name as shelter_name 
       FROM adoption_applications aa 
       LEFT JOIN pets p ON aa.pet_id = p.id 
       LEFT JOIN users u ON aa.user_id = u.id 
       LEFT JOIN shelters s ON aa.shelter_id = s.id 
       ORDER BY aa.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching adoption applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

exports.updateAdoptionStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { status, admin_notes } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Невалідний статус' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE adoption_applications 
       SET status = $1, admin_notes = $2 
       WHERE id = $3 
       RETURNING *`,
      [status, admin_notes || null, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Заявку не знайдено' });
    }

    const application = result.rows[0];

    if (status === 'approved') {
      await client.query(
        `UPDATE pets 
         SET status = $1, 
             owner_id = $2,
             is_for_adoption = false
         WHERE id = $3`,
        ['adopted', application.user_id, application.pet_id]
      );

      await client.query(
        `UPDATE adoption_applications 
         SET status = 'rejected', 
             admin_notes = 'Тварину вже всиновлено іншим користувачем'
         WHERE pet_id = $1 AND id != $2 AND status = 'pending'`,
        [application.pet_id, id]
      );      
    }

    if (status === 'rejected') {
      const otherPendingApps = await client.query(
        `SELECT COUNT(*) as count 
         FROM adoption_applications 
         WHERE pet_id = $1 AND status = 'pending' AND id != $2`,
        [application.pet_id, id]
      );

      if (otherPendingApps.rows[0].count === '0') {
        await client.query(
          `UPDATE pets 
           SET status = 'available' 
           WHERE id = $1 AND status != 'adopted'`,
          [application.pet_id]
        );
      }
    }

    await client.query('COMMIT');

    const updatedApplication = await pool.query(
      `SELECT 
        aa.*, 
        p.name as pet_name,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email
       FROM adoption_applications aa
       LEFT JOIN pets p ON aa.pet_id = p.id
       LEFT JOIN users u ON aa.user_id = u.id
       WHERE aa.id = $1`,
      [id]
    );

    res.json(updatedApplication.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating adoption status:', error);
    res.status(500).json({ error: 'Помилка оновлення статусу' });
  } finally {
    client.release();
  }
};

exports.verifyBreeder = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE breeders SET license_verified = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breeder not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying breeder:', error);
    res.status(500).json({ error: 'Failed to verify breeder' });
  }
};