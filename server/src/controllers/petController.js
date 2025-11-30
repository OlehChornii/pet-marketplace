// controllers/petController.js
const pool = require('../config/database');

exports.getAllPets = async (req, res) => {
  try {
    const {
      category,
      breed,
      minPrice,
      maxPrice,
      forAdoption,
      search,
      q,
      breeder_id,
      shelter_id,
      min_age_months,
      max_age_months,
      gender,
      sort = 'recent',
      page = 1,
      page_size = 12
    } = req.query;

    let query = 'SELECT * FROM pets WHERE status = $1';
    const params = ['available'];
    let paramCount = 2;

    if (category && category !== 'all') {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (breed) {
      query += ` AND breed = $${paramCount}`;
      params.push(breed);
      paramCount++;
    }

    if (minPrice) {
      query += ` AND price >= $${paramCount}`;
      params.push(minPrice);
      paramCount++;
    }

    if (maxPrice) {
      query += ` AND price <= $${paramCount}`;
      params.push(maxPrice);
      paramCount++;
    }

    if (min_age_months) {
      query += ` AND age_months >= $${paramCount}`;
      params.push(min_age_months);
      paramCount++;
    }

    if (max_age_months) {
      query += ` AND age_months <= $${paramCount}`;
      params.push(max_age_months);
      paramCount++;
    }

    if (gender) {
      query += ` AND gender = $${paramCount}`;
      params.push(gender);
      paramCount++;
    }

    if (forAdoption !== undefined) {
      query += ` AND is_for_adoption = $${paramCount}`;
      params.push(forAdoption === 'true');
      paramCount++;
    }

    const searchTerm = q || search;
    if (searchTerm) {
      query += ` AND (
        name ILIKE $${paramCount} OR 
        description ILIKE $${paramCount} OR 
        breed ILIKE $${paramCount}
      )`;
      params.push(`%${searchTerm}%`);
      paramCount++;
    }

    if (breeder_id) {
      query += ` AND breeder_id = $${paramCount}`;
      params.push(breeder_id);
      paramCount++;
    }

    if (shelter_id) {
      query += ` AND shelter_id = $${paramCount}`;
      params.push(shelter_id);
      paramCount++;
    }

    let orderClause = 'ORDER BY created_at DESC'; // default
    switch (sort) {
      case 'oldest':
        orderClause = 'ORDER BY created_at ASC';
        break;
      case 'price_asc':
        orderClause = 'ORDER BY price ASC NULLS LAST';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY price DESC NULLS LAST';
        break;
      case 'age_asc':
        orderClause = 'ORDER BY age_months ASC NULLS LAST';
        break;
      case 'age_desc':
        orderClause = 'ORDER BY age_months DESC NULLS LAST';
        break;
      case 'name':
        orderClause = 'ORDER BY name ASC';
        break;
      case 'recent':
      default:
        orderClause = 'ORDER BY created_at DESC';
    }

    query += ` ${orderClause}`;

    const limit = parseInt(page_size) || 12;
    const offset = (parseInt(page) - 1) * limit;

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM pets WHERE status = $1';
    const countParams = ['available'];
    let countParamNum = 2;

    if (category && category !== 'all') {
      countQuery += ` AND category = $${countParamNum}`;
      countParams.push(category);
      countParamNum++;
    }
    if (breed) {
      countQuery += ` AND breed = $${countParamNum}`;
      countParams.push(breed);
      countParamNum++;
    }
    if (minPrice) {
      countQuery += ` AND price >= $${countParamNum}`;
      countParams.push(minPrice);
      countParamNum++;
    }
    if (maxPrice) {
      countQuery += ` AND price <= $${countParamNum}`;
      countParams.push(maxPrice);
      countParamNum++;
    }
    if (min_age_months) {
      countQuery += ` AND age_months >= $${countParamNum}`;
      countParams.push(min_age_months);
      countParamNum++;
    }
    if (max_age_months) {
      countQuery += ` AND age_months <= $${countParamNum}`;
      countParams.push(max_age_months);
      countParamNum++;
    }
    if (gender) {
      countQuery += ` AND gender = $${countParamNum}`;
      countParams.push(gender);
      countParamNum++;
    }
    if (forAdoption !== undefined) {
      countQuery += ` AND is_for_adoption = $${countParamNum}`;
      countParams.push(forAdoption === 'true');
      countParamNum++;
    }
    if (searchTerm) {
      countQuery += ` AND (name ILIKE $${countParamNum} OR description ILIKE $${countParamNum} OR breed ILIKE $${countParamNum})`;
      countParams.push(`%${searchTerm}%`);
      countParamNum++;
    }
    if (breeder_id) {
      countQuery += ` AND breeder_id = $${countParamNum}`;
      countParams.push(breeder_id);
      countParamNum++;
    }
    if (shelter_id) {
      countQuery += ` AND shelter_id = $${countParamNum}`;
      countParams.push(shelter_id);
      countParamNum++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      data: result.rows,
      meta: {
        page: parseInt(page),
        page_size: limit,
        total_count: totalCount,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
};

exports.getPetsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const {
      breed,
      minPrice,
      maxPrice,
      min_age_months,
      max_age_months,
      gender,
      search,
      sort = 'recent'
    } = req.query;

    let query = 'SELECT * FROM pets WHERE category = $1 AND status = $2';
    const params = [category, 'available'];
    let paramCount = 3;

    if (breed) {
      query += ` AND breed = $${paramCount}`;
      params.push(breed);
      paramCount++;
    }

    if (minPrice) {
      query += ` AND price >= $${paramCount}`;
      params.push(minPrice);
      paramCount++;
    }

    if (maxPrice) {
      query += ` AND price <= $${paramCount}`;
      params.push(maxPrice);
      paramCount++;
    }

    if (min_age_months) {
      query += ` AND age_months >= $${paramCount}`;
      params.push(min_age_months);
      paramCount++;
    }

    if (max_age_months) {
      query += ` AND age_months <= $${paramCount}`;
      params.push(max_age_months);
      paramCount++;
    }

    if (gender) {
      query += ` AND gender = $${paramCount}`;
      params.push(gender);
      paramCount++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR breed ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    let orderClause = 'ORDER BY created_at DESC';
    switch (sort) {
      case 'oldest':
        orderClause = 'ORDER BY created_at ASC';
        break;
      case 'price_asc':
        orderClause = 'ORDER BY price ASC NULLS LAST';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY price DESC NULLS LAST';
        break;
      case 'age_asc':
        orderClause = 'ORDER BY age_months ASC NULLS LAST';
        break;
      case 'age_desc':
        orderClause = 'ORDER BY age_months DESC NULLS LAST';
        break;
      case 'name':
        orderClause = 'ORDER BY name ASC';
        break;
    }

    query += ` ${orderClause}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pets by category:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
};

exports.getPetById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT p.*, u.first_name, u.last_name, u.email, b.business_name, s.name as shelter_name FROM pets p LEFT JOIN users u ON p.owner_id = u.id LEFT JOIN breeders b ON p.breeder_id = b.id LEFT JOIN shelters s ON p.shelter_id = s.id WHERE p.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
};

exports.getBreeds = async (req, res) => {
  try {
    const { category } = req.params;
    const result = await pool.query(
      'SELECT * FROM breeds WHERE category = $1 ORDER BY name',
      [category]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching breeds:', error);
    res.status(500).json({ error: 'Failed to fetch breeds' });
  }
};

exports.createPet = async (req, res) => {
  try {
    const {
      name,
      category,
      breed,
      age_months,
      gender,
      description,
      price,
      is_for_adoption,
      image_url
    } = req.body;

    const result = await pool.query(
      'INSERT INTO pets (name, category, breed, age_months, gender, description, price, is_for_adoption, owner_id, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, category, breed, age_months, gender, description, price, is_for_adoption, req.user.id, image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating pet:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
};

exports.updatePet = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE pets SET ${setClause} WHERE id = $${fields.length + 1} AND owner_id = $${fields.length + 2} RETURNING *`,
      [...values, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Failed to update pet' });
  }
};

exports.deletePet = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM pets WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found or unauthorized' });
    }

    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
};