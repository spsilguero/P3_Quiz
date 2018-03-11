const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require('./out');
const {models} = require('./model');

/**
*
*/
exports.helpCmd = rl => {
  console.log('Comandos:');
  console.log('h|help - Muestra esta ayuda.');
  console.log('list - Listar los quizzes existentes.');
  console.log('show <id> - Muestra la pregunta y la respuesta el quiz indicado.');
  console.log('add - Añadir un nuevo quiz interactivamente.');
  console.log('delete <id> - Borrar el quiz indicado.');
  console.log('edit <id> - Editar el quiz indicado.');
  console.log('test <id> - Probar el quiz indicado.');
  console.log('p|play - Jugar a preguntar aleatoriamente todos los quizzes.');
  console.log('credits - Créditos.');
  console.log('q|quit - Salir del programa.');
  rl.prompt();
};

/**
*
*/
exports.listCmd = rl => {
  
  models.quiz.findAll()
  .each(quiz => {
      log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} `);
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};

/**
* Funcion que devuelve una promesa que:
*   -Valida que se ha introducido un valor para el parametro
*   -Convierte el parametro a numero entero
*/
const validateId = id => {

  return new Sequelize.Promise ((resolve,reject) => {
    if (typeof id === "undefined") {
      reject(new Error(`Falta el parametro <id>.`));
    } else {
      id = parseInt(id);
      if (Number.isNaN(id)) {
        reject(new Error(`El valor del parametro <id> no es un numero.`));
      } else {
        resolve(id);
      }
    }
  });
};



/**
*
*/
exports.showCmd = (rl, id) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz) {
      throw new Error(`No existe un quiz asociado al id=${id}`);
    }
    log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};

/**
*
*/
const makeQuestion = (rl,text) => {
 
  return new Sequelize.Promise((resolve,reject) =>{
    rl.question(colorize(text, 'red'), answer => {
      resolve(answer.trim());
    });
  });

};

/**
*
*/
exports.addCmd = rl => {
  makeQuestion(rl, ' Introduzca una pregunta: ')
  .then(q => {
    return makeQuestion(rl, ' Introduzca la respuesta: ')
    .then(a => {
      return {question:q, answer:a};
    });
  })
  .then(quiz => {
    return models.quiz.create(quiz);
  })
   .then(quiz => {
    log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog('El quiz es erroneo');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};

/**
*
*/
exports.deleteCmd = (rl, id) => {

  validateId(id)
  .then(id => models.quiz.destroy({where: {id}}))
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};

/**
*
*/
exports.editCmd = (rl, id) => {
 
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz) {
      throw new Error(`No existe un quiz asociado al id=${id}`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    return makeQuestion(rl, ' Introduzca la pregunta: ')
    .then(q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
      return makeQuestion(rl, ' Introduzca la respuesta: ')
      .then(a => {
        quiz.question= q;
        quiz.answer = a;
        return quiz;
      });
    });
  })
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz => {
    log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog('El quiz es erroneo');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};

/**
*
*/
exports.testCmd = (rl, id) => {

  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz) {
      throw new Error(`No existe un quiz asociado al id=${id}`);
    }
    return makeQuestion(rl, colorize(` ${quiz.question} `, 'red'))
    .then(a => {
      a = a.toLowerCase().trim();
      if (a === quiz.answer.toLowerCase()) {
        log(` Respuesta ${colorize('correcta', 'green')}`);
      }else{
        log(` Respuesta ${colorize('incorrecta', 'red')}`);
      }
    });
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

};

/**
*
*/
exports.playCmd = rl => {

  let score = 0;
  let toBeResolved = [];

   const playOne = () => {

    if (toBeResolved.length === 0) {
      console.log(` No hay nada que responder. Fin. Puntuacion: ${score}`);
      //log(" No hay nada que responder. Fin.");
      //log(` Puntuacion: ${score} `);
      rl.prompt();
    } else{

      let id = toBeResolved[Math.floor(Math.random() * toBeResolved.length)]; //cogemos una id al azar del array
      let index = toBeResolved.indexOf(id);
      toBeResolved.splice(index, 1); //quitamos la id del array

      models.quiz.findById(id)
      .then(quiz => {
        return makeQuestion(rl, colorize(` ${quiz.question} `, 'red'))
        .then(a => {
          a = a.toLowerCase().trim();
          if (a === quiz.answer.toLowerCase()) {
            score++;
            console.log(` Respuesta correcta. Puntuacion: ${score}`);
            //log(` ${colorize('correct', 'green')}`);
            //log(` Puntuacion: ${score} `);
            playOne();
          }else{
            console.log(` Respuesta incorrecta. Fin del juego. Puntuacion: ${score}`);
            //log(` ${colorize('incorrect', 'red')}`);
            //log(` Fin `);
            //log(` Puntuacion: ${score} `);
            rl.prompt();
          }
        });

      });
    }

  };


  models.quiz.findAll()
  .each(quiz => {
    toBeResolved.push(quiz.id);
  })
  .then(() =>{ 
    playOne();
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });

 
};

/**
*
*/
exports.creditsCmd = rl => {
  console.log('Autor:');
  console.log('Saul perez-Silguero');
  rl.prompt();
};

/**
*
*/
exports.quitCmd = rl => {
  rl.close();
};