create database Patinhas;

use Patinhas;

create table loginFuncionarios(
	nome varchar(50) NOT NULL,
	emailF varchar(100),
	senha varchar(100) NOT NULL,
	token varchar(60) DEFAULT NULL,
    CPF int primary key,
    foreign key (CPF, emailF) references Funcionario(CPF, email)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

create table Funcionario(
	CPF int auto_increment, 
    Nome varchar(50), 
    Salario decimal, 
    Setor varchar(50), 
    Tipo_Colab varchar(50), 
    email varchar(100) not null,
    foto varchar(1000),
    primary key(CPF, email)
);
create table Doacao(
	NDoacao int not null auto_increment, 
    Nome varchar(50), 
    Valor decimal, 
    Tipo int, /*0-> dinheiro, 1-> ração*/ 
    Dia varchar(10),
    CPF int,
    primary key(NDoacao),
    foreign key(CPF) references Funcionario(CPF)
);
create table Recebe (
	NDoacao int not null auto_increment, 
    CPFFuncionario int, 
    foreign key(CPFFuncionario) references Funcionario(CPF), 
    foreign key(NDoacao) references Doacao(NDoacao)
);
create table Adotante(
	CPF int auto_increment, 
    Nome varchar(50), 
    Endereco varchar(50), 
    Telefone varchar(50), 
    Historico int, /* 0-> não adotou, 1-> adotou*/
    primary key(CPF)
);
create table Adocao(
	IDAdocao int not null auto_increment, 
    dia varchar(10), 
    CPFAdotante int, 
    IDAnimal int,
    CPFFunc int,
    primary key(IDAdocao), 
    foreign key(CPFAdotante) references Adotante(CPF),
    foreign key(IDAnimal) references Animal(IDAnimal),
    foreign key(CPFFunc) references Funcionario(CPF)
);
create table Animal(
	IDAnimal int not null auto_increment, 
    nome varchar(50), 
    tipo varchar(50), 
    sexo int, /* 0-> Macho, 1-> Fêmea*/
    raca varchar(50), 
    idade varchar(50), 
    foto varchar(1000),
    adotado int, /* 0 -> não, 1-> adotado */ 
    primary key(IDAnimal)
);
create table MediaAdocao(
	IDAdocao int not null auto_increment, 
    CPFFuncionario int,
    foreign key(IDAdocao) references Adocao(IDAdocao), 
    foreign key(CPFFuncionario) references Funcionario(CPF)
);

show tables;
select * from loginFuncionarios;
select * from Funcionario;
select * from Animal;
select * from Adotante;
select * from Doacao;
select * from Adocao;

SELECT *, Funcionario.Nome as FuncNome, Adotante.Nome as AdoNome  FROM Adocao, Animal, Adotante, Funcionario where Adocao.IDAnimal = Animal.IDAnimal and Adocao.CPFAdotante = Adotante.CPF and  Adocao.CPFFunc = Funcionario.CPF;

select * from Adotante, Adocao where Adotante.CPF = Adocao.CPFAdotante;




drop table Adocao;
drop table MediaAdocao;

select Nome from Funcionario where CPF = 19;