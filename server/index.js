const db = require('./database');
const express = require('express');
const cors = require('cors'); // Importa o pacote cors
const app = express();
const port = 3000;

app.use(cors()); // Habilita o CORS para todas as rotas
app.use(express.json());
app.use(express.static('public'));

app.get('/earnings', (req, res) => {
    db.query(
        'SELECT totalEarnings, monthlyEarnings, totalExpenses, monthlyExpenses FROM earnings WHERE id = 1',
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar os totais.' });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({ error: 'Nenhum registro encontrado na tabela earnings.' });
            }

            const totals = results[0];
            res.json({
                totalEarnings: parseFloat(totals.totalEarnings).toFixed(2),
                monthlyEarnings: parseFloat(totals.monthlyEarnings).toFixed(2),
                totalExpenses: parseFloat(totals.totalExpenses).toFixed(2),
                monthlyExpenses: parseFloat(totals.monthlyExpenses).toFixed(2),
                netTotal: (totals.totalEarnings - totals.totalExpenses).toFixed(2),
                netMonthly: (totals.monthlyEarnings - totals.monthlyExpenses).toFixed(2),
            });
        }
    );
});


app.post('/tasks', (req, res) => {
    const { text, dueDate, value } = req.body;

    if (!text || value === undefined || dueDate === undefined) {
        return res.status(400).json({ error: "Os campos 'text', 'dueDate' e 'value' são obrigatórios." });
    }

    // Inserir a tarefa no banco
    db.query(
        'INSERT INTO tasks (text, dueDate, value) VALUES (?, ?, ?)',
        [text, dueDate, value],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao adicionar a tarefa.' });
            }
            res.status(201).json({ id: results.insertId, text, dueDate, value });
        }
    );
});


app.put('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const { text, dueDate, value } = req.body;

    if (!text || value === undefined || dueDate === undefined) {
        return res.status(400).json({ error: "Os campos 'text', 'dueDate' e 'value' são obrigatórios." });
    }

    // Atualizar a tarefa no banco
    db.query(
        'UPDATE tasks SET text = ?, dueDate = ?, value = ? WHERE id = ?',
        [text, dueDate, value, taskId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar a tarefa.' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Tarefa não encontrada.' });
            }

            res.status(200).json({ message: 'Tarefa atualizada com sucesso.' });
        }
    );
});


// Endpoint para listar todas as tarefas
app.get('/tasks', (req, res) => {
    db.query('SELECT * FROM tasks WHERE status = ?', ['pending'], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar as tarefas pendentes.' });
        }

        res.json(results);
    });
});

app.get('/tasks/completed', (req, res) => {
    db.query('SELECT * FROM tasks WHERE status = ?', ['completed'], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar as tarefas concluídas.' });
        }

        res.json(results);
    });
});


app.get('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);

    // Buscar a tarefa pelo ID no banco de dados
    db.query('SELECT * FROM tasks WHERE id = ?', [taskId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar a tarefa.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        const task = results[0];
        res.status(200).json(task);
    });
});

app.post('/tasks/:id/complete', (req, res) => {
    const taskId = parseInt(req.params.id);

    // Buscar a tarefa
    db.query('SELECT * FROM tasks WHERE id = ?', [taskId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar a tarefa.' });
        }

        const task = results[0];
        if (!task) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        const taskValue = parseFloat(task.value);

        // Atualizar o status da tarefa para "concluída"
        db.query('UPDATE tasks SET status = ? WHERE id = ?', ['completed', taskId], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: 'Erro ao atualizar o status da tarefa.' });
            }

            // Atualizar os totais corretamente
            const query = taskValue >= 0
                ? 'UPDATE earnings SET totalEarnings = totalEarnings + ?, monthlyEarnings = monthlyEarnings + ? WHERE id = 1'
                : 'UPDATE earnings SET totalExpenses = totalExpenses + ?, monthlyExpenses = monthlyExpenses + ? WHERE id = 1';

            db.query(query, [Math.abs(taskValue), Math.abs(taskValue)], (updateTotalsErr) => {
                if (updateTotalsErr) {
                    return res.status(500).json({ error: 'Erro ao atualizar os totais.' });
                }
                res.status(200).json({ message: 'Tarefa marcada como concluída e totais atualizados com sucesso.' });
            });
        });
    });
});



// Endpoint para deletar uma tarefa
app.delete('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);

    // Buscar a tarefa
    db.query('SELECT * FROM tasks WHERE id = ?', [taskId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar a tarefa.' });
        }

        const task = results[0];
        if (!task) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        const taskValue = parseFloat(task.value);

        // Remover a tarefa e ajustar os totais
        db.query('DELETE FROM tasks WHERE id = ?', [taskId], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ error: 'Erro ao remover a tarefa.' });
            }

            const query = taskValue >= 0
                ? 'UPDATE earnings SET totalEarnings = totalEarnings - ?, monthlyEarnings = monthlyEarnings - ? WHERE id = 1'
                : 'UPDATE earnings SET totalExpenses = totalExpenses - ?, monthlyExpenses = monthlyExpenses - ? WHERE id = 1';

            db.query(query, [Math.abs(taskValue), Math.abs(taskValue)], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ error: 'Erro ao atualizar os totais.' });
                }
                res.status(204).end();
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
