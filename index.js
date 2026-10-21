const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Подключение к базе (ONREZA сам подставит DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 1. Получить все приёмы
app.get('/techniques', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM techniques ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Добавить приём (сразу с нулевым рейтингом)
app.post('/techniques', async (req, res) => {
    const { id, name, category, description, details, link, base } = req.body;
    try {
        await pool.query(
            'INSERT INTO techniques (id, name, category, description, details, link, base, rating, votes) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)',
            [id, name, category, description, details, link, base]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Удалить приём
app.delete('/techniques/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM techniques WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Обновить рейтинг приёма
app.put('/techniques/:id/rate', async (req, res) => {
    const { id } = req.params;
    const { newRating, newVotes } = req.body;
    try {
        await pool.query(
            'UPDATE techniques SET rating = $1, votes = $2 WHERE id = $3',
            [newRating, newVotes, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));