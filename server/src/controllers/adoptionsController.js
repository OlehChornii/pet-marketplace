// server/src/controllers/adoptionsController.js
const pool = require('../config/database');

exports.createApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { pet_id, shelter_id, message } = req.body;

    if (!userId || !pet_id) {
      return res.status(400).json({ error: 'Відсутні обов\'язкові поля' });
    }

    const petCheck = await pool.query(
      'SELECT status, is_for_adoption FROM pets WHERE id = $1',
      [pet_id]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тварину не знайдено' });
    }

    if (!petCheck.rows[0].is_for_adoption || petCheck.rows[0].status !== 'available') {
      return res.status(400).json({ error: 'Ця тварина недоступна для всиновлення' });
    }

    const existingApp = await pool.query(
      `SELECT id FROM adoption_applications 
       WHERE user_id = $1 AND pet_id = $2 AND status IN ('pending', 'approved')`,
      [userId, pet_id]
    );

    if (existingApp.rows.length > 0) {
      return res.status(400).json({ error: 'Ви вже подали заявку на цю тварину' });
    }

    const result = await pool.query(
      `INSERT INTO adoption_applications 
       (user_id, pet_id, shelter_id, message, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [userId, pet_id, shelter_id || null, message || null, 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating adoption application:', error);
    res.status(500).json({ error: 'Помилка створення заявки' });
  }
};

exports.getUserApplications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Не авторизовано' });

    const result = await pool.query(
      `SELECT 
        aa.*,
        p.name as pet_name,
        p.breed as pet_breed,
        p.age_months as pet_age_months,
        p.gender as pet_gender,
        p.description as pet_description,
        p.image_url as pet_image_url,
        s.name as shelter_name,
        s.phone as shelter_phone,
        s.email as shelter_email
       FROM adoption_applications aa
       LEFT JOIN pets p ON aa.pet_id = p.id
       LEFT JOIN shelters s ON aa.shelter_id = s.id
       WHERE aa.user_id = $1
       ORDER BY aa.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({ error: 'Помилка отримання заявок' });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Не авторизовано' });

    const result = await pool.query(
      `SELECT 
        aa.*,
        p.id as pet_id,
        p.name as pet_name,
        p.breed as pet_breed,
        p.age_months as pet_age_months,
        p.gender as pet_gender,
        p.description as pet_description,
        p.image_url as pet_image_url,
        s.id as shelter_id,
        s.name as shelter_name,
        s.phone as shelter_phone,
        s.email as shelter_email,
        s.address as shelter_address
       FROM adoption_applications aa
       LEFT JOIN pets p ON aa.pet_id = p.id
       LEFT JOIN shelters s ON aa.shelter_id = s.id
       WHERE aa.id = $1 AND aa.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявку не знайдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Помилка отримання заявки' });
  }
};

exports.checkExistingApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { petId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Не авторизовано' });

    const result = await pool.query(
      `SELECT id, status, created_at 
       FROM adoption_applications 
       WHERE user_id = $1 AND pet_id = $2 AND status IN ('pending', 'approved')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, petId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error checking application:', error);
    res.status(500).json({ error: 'Помилка перевірки заявки' });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Не авторизовано' });

    const checkResult = await pool.query(
      'SELECT status FROM adoption_applications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Заявку не знайдено' });
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Можна скасувати тільки заявки зі статусом "очікує розгляду"' });
    }

    const result = await pool.query(
      'UPDATE adoption_applications SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cancelling application:', error);
    res.status(500).json({ error: 'Помилка скасування заявки' });
  }
};