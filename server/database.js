const mysql = require('mysql2');

// Configuração da conexão com o banco
const db = mysql.createPool({
    host: 'localhost', // Altere para o endereço do seu servidor MySQL
    user: 'root',      // Substitua pelo usuário do seu banco
    password: '',      // Substitua pela senha do seu banco
    database: 'to_do_app' // Substitua pelo nome do banco que você criou
});

module.exports = db;
