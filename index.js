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
        host: 'localhost',
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
        alerta: ''
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

app.get('/excluir-ado', async function (req, res) {
    const id = parseInt(req.query.id);
    const f = await query("SELECT * FROM Adotante WHERE CPF = ?", [id])
    res.render('excluir-ado', { f })
})

app.get('/deletar-adotante', async function (req, res) {
    const id = parseInt(req.query.id)
    if (!isNaN(id) && id > 0) {
        await query("DELETE FROM Adotante WHERE CPF = ?", [id])
    }
    res.redirect('/adotantes')
})

app.get('/financas', async function (req, res) {
    const d = await query("SELECT * FROM Doacao")
    const dinheiro = await query('SELECT * FROM Doacao WHERE Tipo= 0')
    const racao = await query('SELECT * FROM Doacao WHERE Tipo=1')
    var dDinheiro=0, dRacao=0
    for (let i = 0; i < dinheiro.length; i++) {
        dDinheiro += parseInt(dinheiro[i].Valor)
    }

    for (let i = 0; i < racao.length; i++) {
        dRacao += parseInt(racao[i].Valor)
        console.log(racao)
    }
    res.render('financas', {
        d,
        dDinheiro,
        dRacao
    })
})

app.get('/add-doacao', async function (req, res) {
    const mail = [req.session.usuario.emailF]
    const nome = await query("SELECT * FROM Funcionario WHERE email LIKE ?", mail)
    res.render('add-doacao', {
        nomeFunc: nome[0].Nome
    })
})

app.get('/excluir-doacao', async function (req, res) {
    const id = parseInt(req.query.id)
    const f = await query("SELECT * FROM Doacao where NDoacao=?", [id])

    res.render('excluir-doacao', { f })
})

app.get('/deletar-doacao', async function (req, res) {
    const id = parseInt(req.query.id)
    console.log(id)
    if (!isNaN(id) && id > 0) {
        await query('DELETE from Recebe WHERE NDoacao=?', [id])
        await query("DELETE FROM Doacao WHERE NDoacao = ?", [id])
    }
    res.redirect('/financas')
})

app.get('/adocao', async function (req, res) {
    const d = await query("SELECT *, Funcionario.Nome as FuncNome, Adotante.Nome as AdoNome  FROM Adocao, Animal, Adotante, Funcionario where Adocao.IDAnimal = Animal.IDAnimal and Adocao.CPFAdotante = Adotante.CPF and  Adocao.CPFFunc = Funcionario.CPF")
    const aguar = await query('SELECT * FROM Animal WHERE adotado=0')
    const adotados = await query('SELECT * FROM Animal WHERE adotado=1')

    const adotante = await query('SELECT * FROM Adotante ')

    res.render('adocao', {
        d,
        adotante,
        agua: aguar.length,
        adotados: adotados.length
    })
})

app.get("/excluir-adocao", async function (req, res) {
    const id = parseInt(req.query.id);
    const f = await query("SELECT * FROM Adocao WHERE IDAdocao = ?", [id])
    res.render('excluir-adocao', { f })
});

app.get('/deletar-adocao', async function (req, res) {
    const id = parseInt(req.query.id)

    if (!isNaN(id) && id > 0) {
        let sql = 'UPDATE Patinhas.Animal, Adocao SET Animal.adotado = ?  WHERE Animal.IDAnimal = Adocao.IDAnimal and Adocao.IDAdocao = ?'
        const val = [0, id]
        await query(sql, val)
    }


    if (!isNaN(id) && id > 0) {
        //await query("DELETE FROM loginFuncionarios WHERE CPF = ?", [id])
        await query("DELETE FROM Adocao WHERE IDAdocao = ?", [id])

    }

    res.redirect('/adocao')
})

app.get('/edit-animal/:id', async function (request, response) {
    const id = parseInt(request.params.id);
    const dadosAnimal = await query("SELECT * FROM Animal WHERE IDAnimal = ?", [id]);
    console.log(dadosAnimal);

    if (dadosAnimal.length === 0) {
        response.redirect("/");
        return;
    }
    const objConta = dadosAnimal[0];
    response.render('edit-animal', {
        objConta
    });
});

app.get('/edit-ado/:id', async function (request, response) {
    const id = parseInt(request.params.id);
    const dadosAdo = await query("SELECT * FROM Adotante WHERE CPF = ?", [id]);
    console.log(dadosAdo);
    if (dadosAdo.length === 0) {
        response.redirect("/");
        return;
    }
    const objConta = dadosAdo[0];
    response.render('edit-ado', {
        objConta
    });
});

app.get('/edit-doacao/:id', async function (request, response) {
    const id = parseInt(request.params.id);
    const dadosConta = await query("SELECT * FROM Doacao WHERE NDoacao = ?", [id]);
    console.log(dadosConta);
    if (dadosConta.length === 0) {
        response.redirect("/");
        return;
    }
    const objConta = dadosConta[0];
    response.render('edit-doacao', {
        objConta
    });
});

app.get('/edit-func/:CPF', async function (request, response) {
    const CPF = parseInt(request.params.CPF);
    const dadosConta = await query("SELECT * FROM Patinhas.Funcionario WHERE CPF = ?", [CPF]);
    console.log(dadosConta);
    if (dadosConta.length === 0) {
        response.redirect("/");
        return;
    }
    const objConta = dadosConta[0];
    response.render('edit-func', {
        objConta
    });
});

app.get('/add-adocao/:id', async function (req, res) {
    const id = parseInt(req.params.id)
    const mail = [req.session.usuario.emailF]
    const nome = await query("SELECT * FROM Funcionario WHERE email LIKE ?", mail)
    const adot = await query('SELECT * FROM Adotante')
    const aguar = await query('SELECT * FROM Animal WHERE adotado=0')
    if (id > 0) {
        const animal = await query("SELECT * FROM Animal WHERE IDAnimal = ?", [id])
        res.render('add-adocao', {
            nome: animal[0].nome,
            nomeFunc: nome[0].Nome,
            adot,
            aguar: animal,
            voltar: 0
        })
    } else {
        res.render('add-adocao', {
            adot: adot,
            aguar: aguar,
            nomeFunc: nome[0].Nome,
            voltar: 1
        })
    }
})

app.get('/add-adocao/:cp', async function (req, res) {
    const cp = parseInt(req.params.cp);
    const mail = [req.session.usuario.emailF]
    const nome = await query("SELECT * FROM Funcionario WHERE email LIKE ?", mail)
    const adot = await query('SELECT * FROM Adotante')
    const aguar = await query('SELECT * FROM Animal WHERE adotado=0')
    if (cp > 0) {
        const animal = await query("SELECT * FROM Adotante WHERE CPF = ?", [cp])
        console.log(animal[0].nome)
        res.render('add-adocao', {
            nome: animal[0].nome,
            nomeFunc: nome[0].Nome,
            adot,
            aguar: animal,
            voltar: 0
        })
    } else {
        res.render('add-adocao', {
            adot: adot,
            aguar: aguar,
            nomeFunc: nome[0].Nome,
            voltar: 1
        })
    }
})

app.get('/edit-adocao/:id', async function (request, response) {
    const id = parseInt(request.params.id);
    const dadosConta = await query("SELECT * FROM Adocao WHERE IDAdocao = ?", [id]);
    const adotante = await query('SELECT * FROM Adotante ')
    const aguar = await query('SELECT * FROM Animal WHERE Animal.adotado=0 ')
    const sel = await query('SELECT * FROM Animal, Adocao WHERE Animal.IDAnimal = Adocao.IDAnimal AND Adocao.IDAdocao = ?', [id])

    console.log(dadosConta);
    if (dadosConta.length === 0) {
        response.redirect("/");
        return;
    }
    const objConta = dadosConta[0];
    response.render('edit-adocao', {
        objConta,
        aguar: aguar,
        sel: sel,
        adotante: adotante
    });
});


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
        res.render('add-ado', { dados })
    }
})

app.post('/add-doacao', async function (req, res) {
    const mail = [req.session.usuario.emailF]
    const func = await query("SELECT * FROM Funcionario WHERE email LIKE ?", mail)
    const { Nome, Valor, Tipo, Dia } = req.body
    dados = {
        Nome,
        Valor,
        Tipo,
        Dia,
        alerta: ''
    }
    try {
        if (!Valor) throw new Error("Valor é um campo obrigatório!")
        if (!Tipo) throw new Error('Tipo de doação é um campo obrigatório')
        if (!Valor) throw new Error('Valor/Quantidade é um campo obrigatório!')
        if (!Dia) throw new Error('Por favor, selecione uma data!')

        const doacao = 'INSERT INTO Doacao(Nome,Valor, Tipo, Dia, CPF) VALUES (?,?,?,?,?)'
        const valores = [Nome, Valor, Tipo, Dia, func[0].CPF]
        await query(doacao, valores)

        const enviei = 'SELECT NDoacao FROM Doacao WHERE Nome LIKE ? and Valor LIKE ? and Tipo LIKE ? and Dia LIKE ?'
        const aa = [Nome, Valor, Tipo, Dia]

        const aqui = await query(enviei, aa)

        const recebe = 'INSERT INTO Recebe(NDoacao, CPFFuncionario) VALUES (?,?)'
        const sim = [aqui[0], func[0].CPF]
        await query(recebe, sim)


        res.redirect('financas')
    } catch (e) {
        dados.alerta = e.message
        console.log(e.message)
        res.render('add-doacao', { dados })
    }
})

app.post('/edit-animal', async (request, response) => {

    let { id, nome, tipo, sexo, raca, idade, foto, adotado } = request.body;

    const dadosPagina = {
        mensagem: '',
        objConta: { IDAnimal: id, nome: nome, tipo: tipo, sexo: sexo, raca: raca, idade: idade, foto: foto, adotado: adotado }
    }

    try {
        //console.log(request.body);
        if (!nome)
            throw new Error('Nome é obrigatório!');
        if (!tipo)
            throw new Error('Tipo é obrigatório!');

        if (!sexo)
            throw new Error('Sexo é obrigatório!');

        if (!raca)
            throw new Error('Raca é obrigatório!');
        if (!idade)
            throw new Error('Idade é obrigatório!');

        if (!adotado)
            throw new Error('Adotado é obrigatório!');


        let sql = "UPDATE Patinhas.Animal SET nome = ?, tipo = ?, sexo = ?, raca = ?, idade = ?, foto = ?, adotado = ?  WHERE IDAnimal = ? ";
        let valores = [nome, tipo, sexo, raca, idade, foto, adotado, id];
        if (adotado == 0) {
            await query("DELETE FROM Adocao WHERE IDAnimal = ?", id)
        }
        // atualiza os dados na base de dados
        await query(sql, valores);
    }
    catch (e) {
        dadosPagina.mensagem = e.message;
    }
    response.render('edit-animal', dadosPagina);

});

app.post('/edit-ado', async (request, response) => {

    let { id, Nome, Telefone, Endereco, Historico } = request.body;

    const dadosPagina = {
        mensagem: '',
        objConta: { CPF: id, Nome: Nome, Telefone: Telefone, Endereco: Endereco, Historico: Historico }
    }

    try {
        //console.log(request.body);
        if (!Nome)
            throw new Error('Nome é obrigatório!');
        if (!Telefone)
            throw new Error('Telefone é obrigatório!');
        if (!Endereco)
            throw new Error('Endereco é obrigatório!');
        if (!Historico)
            throw new Error('Historico é obrigatório!');


        let sql = "UPDATE Patinhas.Adotante SET Nome = ?, Telefone = ?, Endereco = ?, Historico = ? WHERE CPF = ?";
        let valores = [Nome, Telefone, Endereco, Historico, id];
        // atualiza os dados na base de dados
        await query(sql, valores);
        res.redirect('/adotante')
    }
    catch (e) {
        dadosPagina.mensagem = e.message;
    }
    response.render('edit-ado', dadosPagina);

});

app.post('/edit-doacao', async (request, response) => {
    let { id, Nome, Valor, Tipo, Dia } = request.body;

    const dadosPagina = {
        mensagem: '',
        objConta: { NDoacao: id, Nome: Nome, Valor: Valor, Tipo: Tipo, Dia: Dia }
    }

    try {
        //console.log(request.body);
        if (!Nome)
            throw new Error('Nome é obrigatório!');
        if (!Valor)
            throw new Error('Valor é obrigatório!');
        if (!Tipo)
            throw new Error('Tipo é obrigatório!');
        if (!Dia)
            throw new Error('Dia é obrigatório!');

        let sql = "UPDATE Patinhas.Doacao SET Nome = ?, Valor = ?, Tipo = ?, Dia = ? WHERE NDoacao = ?";
        let valores = [Nome, Valor, Tipo, Dia, id];
        // atualiza os dados na base de dados
        await query(sql, valores);
        res.redirect('/financas')
    }
    catch (e) {
        dadosPagina.mensagem = e.message;
    }
    response.render('edit-doacao', dadosPagina);

});

app.post('/edit-func', async (request, response) => {

    let { CPF, Nome, Salario, Setor, Tipo_Colab, foto } = request.body;

    const dadosPagina = {
        mensagem: '',
        objConta: { CPF: CPF, Nome: Nome, Salario: Salario, Setor: Setor, Tipo_Colab: Tipo_Colab, foto: foto }
    }

    try {
        //console.log(request.body);
        if (!Nome)
            throw new Error('Nome é obrigatório!');
        if (!Salario)
            throw new Error('Salario é obrigatório!');
        if (!Setor)
            throw new Error('Setor é obrigatório!');
        if (!Tipo_Colab)
            throw new Error('Tipo_Colab é obrigatório!');


        let sql = "UPDATE Patinhas.Funcionario SET Nome = ?, Salario = ?, Setor = ?, Tipo_Colab = ?, foto = ?  WHERE CPF = ? ";
        let valores = [Nome, Salario, Setor, Tipo_Colab, foto, CPF];
        // atualiza os dados na base de dados
        await query(sql, valores);
        response.redirect('/funcionarios')
    }
    catch (e) {
        dadosPagina.mensagem = e.message;
    }
    response.render('edit-func', dadosPagina);

});

app.post('/add-adocao', async function (req, res) {
    const mail = [req.session.usuario.emailF]
    const func = await query("SELECT * FROM Funcionario WHERE email LIKE ?", mail)
    const { IDAnimal, dia, CPF } = req.body

    dados = {
        IDAnimal,
        dia,
        CPF,
        alerta: ''
    }
    try {
        if (!IDAnimal) throw new Error("Animal é um campo obrigatório!")
        if (!CPF) throw new Error('Selecione um Adotante')
        if (!dia) throw new Error('Por favor, selecione uma data!')

        const doacao = 'INSERT INTO Adocao(IDAnimal, dia, CPFAdotante, CPFFunc) VALUES (?,?,?,?)'

        const valores = [IDAnimal, dia, CPF, func[0].CPF]

        let sql = 'UPDATE Patinhas.Animal SET Animal.adotado = ?  WHERE Animal.IDAnimal = ? '
        const val = [1, IDAnimal]

        let sql1 = "UPDATE Patinhas.Adotante SET  Historico = ? WHERE CPF = ?";
        let val1 = [1, CPF];

        await query(doacao, valores)
        await query(sql, val)
        await query(sql1, val1)

        res.redirect('adocao')
    } catch (e) {
        dados.alerta = e.message
        console.log(e.message)
        res.render('add-adocao', { dados })
    }
})

app.post('/edit-adocao', async (req, response) => {

    let { IDAnimal, dia, CPF, id } = req.body;

    const dadosPagina = {
        mensagem: '',
        objConta: { IDAnimal: IDAnimal, dia: dia, CPF: CPF, id: id }
    }

    try {
        if (!IDAnimal) throw new Error("Animal é um campo obrigatório!")
        if (!CPF) throw new Error('Selecione um Adotante')
        if (!dia) throw new Error('Por favor, selecione uma data!')

        let sql = "UPDATE Patinhas.Adocao SET IDAnimal = ?, dia = ?, CPFAdotante = ? WHERE IDAdocao = ?";
        let valores = [IDAnimal, dia, CPF, id];
        // atualiza os dados na base de dados
        await query(sql, valores);
        res.redirect('/adocao')
    }
    catch (e) {
        dadosPagina.mensagem = e.message;
    }
    response.render('edit-adocao', dadosPagina);

});

/* --- LISTEN --- */

app.listen(PORT, function () {
    console.log(`Server is running at port ${PORT}`)
})

