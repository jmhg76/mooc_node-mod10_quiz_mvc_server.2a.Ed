
const express = require('express');
const app = express();

   // Import MW for parsing POST params in BODY

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

   // Import MW supporting Method Override with express

var methodOverride = require('method-override');
app.use(methodOverride('_method'));


   // MODEL

const Sequelize = require('sequelize');

const options = { logging: false, operatorsAliases: false};
const sequelize = new Sequelize("sqlite:db.sqlite", options);

const quizzes = sequelize.define(  // define table quizzes
    'quizzes',
    {   question: Sequelize.STRING,
        answer: Sequelize.STRING
    }
);

sequelize.sync() // Syncronize DB and seed if needed
.then(() => quizzes.count())
.then((count) => {
    if (count===0) {
        return (
            quizzes.bulkCreate([
                { id: 1, question: "Capital of Italy",    answer: "Rome" },
                { id: 2, question: "Capital of France",   answer: "Paris" },
                { id: 3, question: "Capital of Spain",    answer: "Madrid" },
                { id: 4, question: "Capital of Portugal", answer: "Lisbon" }
            ])
            .then( c => console.log(`  DB created with ${c.length} elems`))
        )
    } else {
        return console.log(`  DB exists & has ${count} elems`);
    }
})
.catch( err => console.log(`   ${err}`));


   // VIEWs


/*
<!-- Sustituido por el form ...
<a href="/quizzes/${quiz.id}?_method=DELETE" onClick="return confirm('Delete: ${quiz.question}')">
   <button>Delete</button>
</a>
... para que funcione correctamente el método DELETE sin especificar app.use(methodOverride('_method', { methods: ['POST', 'GET'] });
debido a las explicaciones de https://philipm.at/2017/method-override_in_expressjs.html, en resumen ...
... DELETE así va vía POST que no permite URLs vía GET que puedan realizar eliminaciones 
//-->
*/
const index = (quizzes) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8"></head>
    <body>
        <h1>MVC: Quizzes</h1>`
+ quizzes.reduce(
    (ac, quiz) => ac +=
`       <a href="/quizzes/${quiz.id}/play">${quiz.question}</a>
        <a href="/quizzes/${quiz.id}/edit"><button>Edit</button></a>
        <form style="display: inline" method="post" action="/quizzes/${quiz.id}?_method=DELETE" onSubmit="return confirm('Delete: ${quiz.question}')">
           <input type="submit" value="Delete">
        </form>
        <br>\n`,
    ""
)
+ `     <p/>
        <a href="/quizzes/new"><button>New Quiz</button></a>
    </body>
</html>`;

const play = (id, question, response) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8"></head>
    <body>
        <h1>MVC: Quizzes</h1>
        <form   method="get"   action="/quizzes/${id}/check">
            ${question}: <p>
            <input type="text" name="response" value="${response}" placeholder="Answer" />
            <input type="submit" value="Check"/> <br>
        </form>
        </p>
        <a href="/quizzes"><button>Go back</button></a>
    </body>
</html>`;

const check = (id, msg, response) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8"></head>
    <body>
        <h1>MVC: Quizzes</h1>
        <strong><div id="msg">${msg}</div></strong>
        <p>
        <a href="/quizzes"><button>Go back</button></a>
        <a href="/quizzes/${id}/play?response=${response}"><button>Try again</button></a>
    </body>
</html>`;

const quizForm =(msg, method, action, question, answer) => `<!-- HTML view -->
<html>
    <head><title>MVC Example</title><meta charset="utf-8"></head>
    <body>
        <h1>MVC: Quizzes</h1>
        <form   method="${method}"   action="${action}">
            ${msg}: <p>
            <input  type="text"  name="question" value="${question}" placeholder="Question" />
            <input  type="text"  name="answer"   value="${answer}"   placeholder="Answer" />
            <input  type="submit" value="Save"/> <br>
        </form>
        </p>
        <a href="/quizzes"><button>Go back</button></a>
    </body>
</html>`;


   // CONTROLLER

// GET /, GET /quizzes
const indexController = (req, res, next) => {

    quizzes.findAll()
    .then((quizzes) => res.send(index(quizzes)))
    .catch((error) => `DB Error:\n${error}`);
}

//  GET  /quizzes/1/play
const playController = (req, res, next) => {
    let id = Number(req.params.id);
    let response = req.query.response || "";

    quizzes.findById(id)
    .then((quiz) => res.send(play(id, quiz.question, response)))
    .catch((error) => `A DB Error has occurred:\n${error}`);
 };

//  GET  /quizzes/1/check
const checkController = (req, res, next) => {
    let response = req.query.response, msg;
    let id = Number(req.params.id);

    quizzes.findById(id)
    .then((quiz) => {
        msg = (quiz.answer===response) ?
              `Yes, "${response}" is the ${quiz.question}`
            : `No, "${response}" is not the ${quiz.question}`;
        return res.send(check(id, msg, response));
    })
    .catch((error) => `A DB Error has occurred:\n${error}`);
};

//  GET /quizzes/1/edit
const editController = (req, res, next) => {
  // .... introducir código
  let id = Number(req.params.id); // Recuperamos parámetro id desde la ruta del formulario enviado ...

  quizzes.findById(id) // ... buscamos registro a modificar ...
  .then((quiz) => { // ... y creamos petición de formulario del quizz en modo edición
    res.send(quizForm("Edit Quiz", "post", `/quizzes/${id}?_method=PUT`, `${quiz.question}`, `${quiz.answer}`));
  })
  .catch((error) => `A DB Error has occurred:\n${error}`);
};

//  PUT /quizzes/1
const updateController = (req, res, next) => {
     // .... introducir código
     let {question, answer} = req.body; // Recuperamos datos del formulario enviado
     let id = Number(req.params.id);    // Recuperamos parámetro id desde la ruta del formulario enviado

     quizzes.update(
       { question: question, answer: answer }, // Asignamos valores para el update ...
       { where: { id : id } } // ... sólo se modifica el registro con valor id
     )
     .then(() => res.redirect('/quizzes')) // ... si fue bien redirigimos al form principal
     .catch((error) => `Quiz not updated:\n${error}`);
};

// GET /quizzes/new
const newController = (req, res, next) => {
    res.send(quizForm("Create new Quiz", "post", "/quizzes", "", ""));
 };

// POST /quizzes
const createController = (req, res, next) => {
    let {question, answer} = req.body;

    quizzes.build({question, answer})
    .save()
    .then((quiz) => res.redirect('/quizzes'))
    .catch((error) => `Quiz not created:\n${error}`);
 };

// DELETE /quizzes/1
const destroyController = (req, res, next) => {
     // .... introducir código
     let id = Number(req.params.id);    // Recuperamos parámetro id desde la ruta del formulario enviado ...

     console.log(`req.params.id => ${req.params.id}`);

     quizzes.destroy(
       { where: { id : id } } // ... sólo se elimina el registro con valor id
     )
     .then(() => res.redirect('/quizzes')) // ... si fue bien redirigimos al form principal
     .catch((error) => `Quiz not delete:\n${error}`);
 };



   // ROUTER

app.get(['/', '/quizzes'],    indexController);
app.get('/quizzes/:id/play',  playController);
app.get('/quizzes/:id/check', checkController);
app.get('/quizzes/new',       newController);
app.post('/quizzes',          createController);

// ..... instalar los MWs asociados a
//   GET  /quizzes/:id/edit,   PUT  /quizzes/:id y  DELETE  /quizzes/:id
app.get('/quizzes/:id/edit',  editController);    // GET  /quizzes/:id/edit
app.put('/quizzes/:id',       updateController);  // PUT  /quizzes/:id
app.delete('/quizzes/:id',    destroyController); // DELETE  /quizzes/:id

app.all('*', (req, res) =>
    res.send(`Error: resource not found or method not supported.
      <br/>   req.app => ${req.app}
      <br/>   req.baseUrl => ${req.baseUrl}
      <br/>   req.body => ${JSON.stringify(req.body)}
      <br/>   req.cookies => ${req.cookies}
      <br/>   req.fresh => ${req.fresh}
      <br/>   req.hostname => ${req.hostname}
      <br/>   req.ip => ${req.ip}
      <br/>   req.ips => ${req.ips}
      <br/>   req.method => ${req.method}
      <br/>   req.originalUrl => ${req.originalUrl}
      <br/>   req.params => ${JSON.stringify(req.params)}
      <br/>   req.params.id => ${JSON.stringify(req.params.id)}
      <br/>   req.path => ${req.path}
      <br/>   req.protocol => ${req.protocol}
      <br/>   req.query => ${JSON.stringify(req.query)}
      <br/>   req.route => ${JSON.stringify(req.route)}
      <br/>   req.secure => ${req.secure}
      <br/>   req.signedCookies => ${req.signedCookies}
      <br/>   req.stale => ${req.stale}
      <br/>   req.subdomains => ${req.subdomains}
      <br/>   req.xhr  => ${req.xhr}`
  )
);


   // Server started at port 8000

app.listen(8000);
