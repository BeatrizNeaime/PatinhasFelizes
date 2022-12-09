const express = require('express');
const expressHandlebars = require('express-handlebars');

const path = require('path');
const mysql = require('mysql2/promise');
const PORT = process.env.PORT || 3000;
const sessions = require("express-session");
const cookieParser = require("cookie-parser");
const uuidv4 = require('uuid').v4;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.engine('handlebars', expressHandlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
console.log(path.join(__dirname, 'public'));
app.use(express.json());
app.use(cookieParser());
app.use(sessions({
    secret: "thisIsMySecretKey",
    saveUninitialized: true,
    resave: false,
    name: 'Cookie de Sessao',
    cookie: { maxAge: 1000 * 60 * 15 } // 15 minutos
}));

async function getConnection() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'AleBiaGi@1990',
        database: 'Patinhas'
    });
    return connection;
}

async function query(sql = '', values = []) {
    const conn = await getConnection();
    const result = await conn.query(sql, values);
    conn.end();

    return result[0];
}

/* --- LOGIN --- */
app.use("*", async function (req, res, next) {
    if (!req.session.usuario && req.cookies.token) {
        const resultado = await query("SELECT * FROM loginFuncionarios WHERE token = ?", [req.cookies.token]);
        if (resultado.length) {
            req.session.usuario = resultado[0];
        }
    }
    next();
});

/* --- MÉTODOS GET --- */
app.get("/", async function (req, res) {
    if (!req.session.usuario) {
        res.redirect("/login")
        return
    } else {

        const sql = "SELECT nome FROM Funcionario WHERE email LIKE ? "
        const mail = [req.session.usuario.emailF]
        const r = await query(sql, mail)

        const sqlAdopt = "SELECT * FROM Animal WHERE adotado = ?"
        const num0 = 0, num1 = 1
        const r1 = await query(sqlAdopt, num0)
        const r2 = await query(sqlAdopt, num1)

        const sqlDonation = "SELECT * FROM Doacao WHERE Tipo = ?"
        const tipo = "Dinheiro"
        const rD = await query(sqlDonation, tipo)
        var total = 0
        for (let i = 0; i < rD.length; i++) {
            total = total + parseFloat(rD[i].Valor)
        }
        const adotantes = await query("SELECT * from Adotante")
        res.render('home', {
            nome: r[0].nome,
            adocao: r1.length,
            adotados: r2.length,
            doacoes: total,
            adotantes: adotantes.length
        })
    }
})

app.get('/login', function (req, res) {
    res.render('login', {
        titulo: "Faça login em sua conta"
    })
})

app.get('/sobre', function (req, res) {
    res.render('sobre')
})

app.get('/contato', async function (req, res) {
    const contatos = await query('SELECT * FROM contatos')

    let nome = contatos[0].nome
    let email = contatos[0].email
    let mensagem = contatos[0].mensagem

    res.render('contato', {
        contatos: contatos,
        nome: nome,
        email: email,
        mensagem: mensagem
    })
})

app.get("/delete/produto/:id", async function (req, res) {
    const id = parseInt(req.params.id)
    if (!isNaN(id) && id > 0) {
        await query("DELETE FROM lancamentos WHERE id=?", [id])
    }

    res.redirect("/")
})

app.get('/editar', async function (req, res) {
    const id = parseInt(req.query.id)
    const dadosItem = await query("SELECT * FROM lancamentos WHERE id=?", [id])

    if (dadosItem.length === 0) {
        res.redirect('/')
    }

    res.render('editar', {
        id: dadosItem[0].id,
        descricao: dadosItem[0].descricao,
        dia: dadosItem[0].dia,
        hora: dadosItem[0].hora,
        tipo: dadosItem[0].tipo,
        valor: dadosItem[0].valor,
        categoria: dadosItem[0].categoria
    })
})

app.get('/adicionar', function (req, res) {
    res.render('adicionar')
})

app.get('/cadastro', function (req, res) {
    res.render('cadastro', {
        titulo: "Cadastro"
    })
})

app.get('/logout', function (req, res) {
    res.cookie('token', "")
    req.session.destroy()
    res.redirect('/login')
})

app.get('/animais', async function (req,res){
    const animais = await query("SELECT * FROM Animal ORDER BY adotado ASC")
    res.render('animais',{
        animais,
        foto: animais[0].foto,
        nome: animais[0].Nome,
        idade: animais[0].idade,
        tipo: animais[0].tipo,
        raca: animais[0].raca,
        sexo: animais[0].Sexo
    })
})

app.get('/funcionarios', async function(req,res){
    const func = await query("SELECT * FROM Funcionario")
    res.render('funcionarios',{
        func
    })
}) 

app.get("/excluir", async function(req, res){
    const id = parseInt(req.query.id);
    const f = await query("SELECT * FROM Funcionario WHERE CPF = ?", [id])
    res.render('excluir',{f})
});

app.get('/deletar', async function(req,res){
    const id = parseInt(req.query.id)
    if(!isNaN(id) && id >0){
        await query("DELETE FROM Funcionario WHERE CPF = ?", [id])
    }
    res.redirect('/funcionarios')
})

app.get('/add-func', async function(req,res){
    res.render('add-func',{
        titulo: "Adicionar novo funcionário"
    })
})

/* --- MÉTODOS POST ---*/

app.post('/editar', async function (req, res) {
    let { id, descricao, dia, hora, tipo, valor, categoria } = req.body
    const dados = {
        alerta: '',
        descricao,
        valor,
        tipo,
        categoria,
        dia,
        hora
    }

    console.log(`---> ${req.body.descricao}`)

    let sql = 'UPDATE lancamentos set valor=?, descricao=?, tipo=?, categoria=?, dia=?, hora=? WHERE id=?';
    let valores = [valor, descricao, tipo, categoria, dia, hora, id]

    try {
        if (!descricao) throw new Error('Título inválido!')
        if (!categoria) throw new Error('Categoria inválida!')
        if (!valor) throw new Error('Valor inválido!')
        await query(sql, valores)
        dados.alerta = 'Transação atualizada com sucesso!'
        dados.cor = "#33cc95"
    } catch (e) {
        dados.alerta = e.message
        dados.cor = 'red'
    }
    res.render('editar', dados)
})

app.post('/contato', async function (req, res) {
    let mensagem = req.body.mensagem
    let email = req.body.email
    let nome = req.body.nome

    const dadosPagina = {
        mensagem,
        email,
        nome
    }

    const sql = "INSERT INTO contatos (email, nome, mensagem) VALUES (?,?,?);"
    const valores = [email, nome, mensagem]

    await query(sql, valores)
    res.render('contato', dadosPagina)
    res.redirect('/contato')
})

app.post('/adicionar', async function (req, res) {
    let descricao = req.body.titulo
    let dia = req.body.dia
    let hora = req.body.hora
    let valor = req.body.valor
    let tipo = req.body.tipo ? 0 : 1
    let categoria = req.body.categoria

    if (tipo == 0) {
        valor *= -1
    }

    const dadosPagina = {
        descricao,
        valor,
        tipo,
        categoria,
        dia,
        hora,
    }

    const sql = "INSERT INTO lancamentos (descricao, valor, tipo, categoria, dia, hora) VALUES (?,?,?,?,?,?);"
    const valores = [descricao, valor, tipo, categoria, dia, hora]

    await query(sql, valores)

    dadosPagina.mensagem = "Produto cadastrado com sucesso"

    res.render('adicionar', dadosPagina)
    res.redirect('/')
})

app.post('/login', async function (req, res) {
    const { email, senha, keep_logged } = req.body;
    const sql = "SELECT * FROM loginFuncionarios WHERE emailF= ? AND senha=?"
    const itens = [email, senha]
    const resultado = await query(sql, itens)
    if (resultado.length <= 0) {
        res.render("login", {
            titulo: "Faça login em sua conta",
            alerta: "E-mail ou senha inválidos!"
        })
    } else {
        if (keep_logged) {
            const token = uuidv4()
            const isOk = await query("UPDATE loginFuncionarios SET token = ? WHERE emailF = ?", [token, resultado[0].emailF]);
            res.cookie("token", token)
        }

        req.session.usuario = resultado[0]
        res.redirect("/")
        return
    }
})

app.post('/add-func', async function(req,res){
    const {Nome, Salario, Setor, Tipo_Colab, email, foto} = req.body
    const dados={
        alerta:'',
        Nome, 
        Salario,
        Setor,
        Tipo_Colab,
        email,
        foto
    }

    try {
        if(!Nome) throw new Error('Nome é um campo obrigatório!')
        if(!Salario) throw new Error('Salário é um campo obrigatório!')
        if(!Setor) throw new Error('Cargo é um campo obrigatório!')
        if(!Tipo_Colab) throw new Error('Tipo de Colaborador é um campo obrigatório!')
        if(!email) throw new Error('Contato é um campo obrigatório!')

        const sql = 'INSERT INTO Funcionario(Nome, Salario, Setor, Tipo_Colab, email, foto) VALUES (?,?,?,?,?,?)'
        const valores = [Nome, Salario, Setor, Tipo_Colab, email, foto]
        await query(sql, valores)

    } catch (e) {
        dados.alerta = e.message
    }
    //res.render('add-func', dados)
    res.redirect('/funcionarios')
})

/* --- LISTEN --- */

app.listen(PORT, function () {
    console.log(`Server is running at port ${PORT}`)
})  