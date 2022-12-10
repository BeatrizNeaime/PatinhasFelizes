const express = require('express');
const expressHandlebars = require('express-handlebars');

const path = require('path');
const mysql = require('mysql2/promise');
const PORT = process.env.PORT || 3000;
const sessions = require("express-session");
const cookieParser = require("cookie-parser");
const { off } = require('process');
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

        const sqlDonation = "SELECT * FROM Funcionario WHERE Tipo_Colab = ?"
        const tipo = "Voluntário"
        const rD = await query(sqlDonation, tipo)

        const adotantes = await query("SELECT * from Adotante")
        res.render('home', {
            nome: r[0].nome,
            adocao: r1.length,
            adotados: r2.length,
            doacoes: rD.length,
            adotantes: adotantes.length
        })
    }
})

app.get('/login', function (req, res) {
    res.render('login', {
        titulo: "Faça login em sua conta"
    })
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

app.get('/logout', function (req, res) {
    res.cookie('token', "")
    req.session.destroy()
    res.redirect('/login')
})

app.get('/animais', async function (req, res) {
    const animais = await query("SELECT * FROM Animal ORDER BY adotado ASC")
    res.render('animais', {
        animais,
        foto: animais[0].foto,
        nome: animais[0].Nome,
        idade: animais[0].idade,
        tipo: animais[0].tipo,
        raca: animais[0].raca,
        sexo: animais[0].Sexo,
        IDAnimal: animais[0].IDAnimal,
        alerta: ""
    })
})

app.get('/funcionarios', async function (req, res) {
    const func = await query("SELECT * FROM Funcionario")
    res.render('funcionarios', {
        func
    })
})

app.get("/excluir", async function (req, res) {
    const id = parseInt(req.query.id);
    const f = await query("SELECT * FROM Funcionario WHERE CPF = ?", [id])
    res.render('excluir', { f })
});

app.get('/deletar', async function (req, res) {
    const id = parseInt(req.query.id)
    if (!isNaN(id) && id > 0) {
        await query("DELETE FROM loginFuncionarios WHERE CPF = ?", [id])
        await query("DELETE FROM Funcionario WHERE CPF = ?", [id])
    }
    res.redirect('/funcionarios')
})

app.get('/add-func', async function (req, res) {
    res.render('add-func')
})

app.get("/excluir-animal", async function (req, res) {
    const id = parseInt(req.query.id);
    const f = await query("SELECT * FROM Animal WHERE IDAnimal = ?", [id])
    res.render('excluir-animal', { f })
});

app.get('/deletar-animal', async function (req, res) {
    const id = parseInt(req.query.id)
    if (!isNaN(id) && id > 0) {
        //await query("DELETE FROM loginFuncionarios WHERE CPF = ?", [id])
        await query("DELETE FROM Animal WHERE IDAnimal = ?", [id])
    }
    res.redirect('/animais')
})

app.get('/add-animal', async function (erq, res) {
    res.render('add-animal')
})

app.get('/adotantes', async function (req, res) {
    const func = await query('SELECT * FROM Adotante ORDER BY Nome ASC')
    res.render('adotantes', { func })
})

app.get('/add-ado', async function (req, res) {
    res.render('add-ado', {
        novo: "adotante"
    })
})

/* --- MÉTODOS POST ---*/

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

app.post('/add-func', async function (req, res) {
    const { Nome, Salario, Setor, Tipo_Colab, email, foto, senha } = req.body
    const dados = {
        alerta: '',
        Nome,
        Salario,
        Setor,
        Tipo_Colab,
        email,
        foto
    }

    try {
        if (!Nome) throw new Error('Nome é um campo obrigatório!')
        if (!Salario) throw new Error('Salário é um campo obrigatório!')
        if (!Setor) throw new Error('Cargo é um campo obrigatório!')
        if (!Tipo_Colab) throw new Error('Tipo de Colaborador é um campo obrigatório!')
        if (!email) throw new Error('Contato é um campo obrigatório!')

        const sql = 'INSERT INTO Funcionario(Nome, Salario, Setor, Tipo_Colab, email, foto) VALUES (?,?,?,?,?,?)'
        const valores = [Nome, Salario, Setor, Tipo_Colab, email, foto]
        await query(sql, valores)

        const busca = 'SELECT * FROM Funcionario WHERE email LIKE ?'
        const r = await query(busca, email)
        const adiciona = 'INSERT INTO loginFuncionarios(nome, emailF,senha,CPF) VALUES (?,?,?,?)'
        const val = [r[0].Nome, r[0].email, senha, r[0].CPF]
        await query(adiciona, val)
        res.redirect('/funcionarios')
    } catch (e) {
        dados.alerta = e.message
        console.log(dados)
        res.render('add-func', { dados, titulo: "Adicionar novo funcionário" })
    }
})

app.post('/add-animal', async function (req, res) {
    const { nome, tipo, idade, raca, sexo, foto, adotado } = req.body
    const dados = {
        nome,
        tipo,
        idade,
        raca,
        sexo,
        foto,
        adotado,
        alerta: ''
    }
    try {
        const sql = "INSERT INTO Animal(nome, tipo, sexo, raca, idade, foto, adotado) VALUES (?,?,?,?,?,?,?)"
        const valores = [nome, tipo, sexo, raca, idade, foto, adotado]
        if (!nome) throw new Error('Nome é obrigatório!')
        if (!tipo) throw new Error('Tipo de animal é obrigatório!')
        if (!idade) throw new Error('Idade é obrigatório!')
        if (!raca) throw new Error('Raça é obrigatório!')
        if (!sexo) throw new Error('Sexo do animal é obrigatório!')
        if (!adotado) throw new Error('A situação do animal é obrigatória')
        await query(sql, valores)
        res.redirect('/animais')
    } catch (e) {
        dados.alerta = e.message
        res.render('add-animal', { dados })
    }
})

app.post('/add-ado', async function (req, res) {
    const { Nome, Telefone, Endereco, Historico } = req.body
    const dados = {
        alerta: '', Nome,
        Telefone,
        Endereco,
        Historico
    }
    console.log(dados)
    try {
        if (!Nome) throw new Error("Nome é obrigatório!")
        if (!Telefone) throw new Error("Telefone é obrigatório!")
        if (!Endereco) throw new Error("Endereço é obrigatório!")
        if (!Historico) throw new Error("Histórico de Adoções é obrigatório")

        const sql = "INSERT INTO Adotante(Nome,Endereco, Telefone, Historico) VALUES (?,?,?,?)"
        valores = [Nome, Endereco, Telefone, Historico]
        await query(sql, valores)
        res.redirect('/adotantes')
    } catch (e) {
        dados.alerta = e.message
        console.log(dados.alerta)
        res.render('add-ado', { dados })
    }
})

/* --- LISTEN --- */

app.listen(PORT, function () {
    console.log(`Server is running at port ${PORT}`)
})   