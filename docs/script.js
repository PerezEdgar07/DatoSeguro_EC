// ---------------------------------------------------------------
// Registro de consentimientos (demostración de privacidad desde el diseño)
// ---------------------------------------------------------------

const CLAVE_ALMACEN = "consentimientos_demo";
const VERSION_POLITICA = "politica_v1";

// Una finalidad = un consentimiento distinto (consentimiento específico)
const FINALIDADES = {
  promociones: "Recibir promociones por correo",
  terceros: "Compartir mis datos con aliados comerciales",
  analitica: "Analizar mi uso para mejorar el servicio"
};

// ----- Almacenamiento (en un sistema real sería una base de datos) -----

function cargarRegistro() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ALMACEN)) || [];
  } catch (error) {
    return [];
  }
}

function guardarRegistro(registro) {
  localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(registro));
}

// ----- Lógica de consentimiento -----

function normalizar(texto) {
  return texto.trim().toLowerCase();
}

function tienePermiso(titular, finalidad) {
  return cargarRegistro().some(function (c) {
    return normalizar(c.titular) === normalizar(titular) &&
           c.finalidad === finalidad &&
           c.revocadoEn === null;
  });
}

function otorgar(titular, finalidad) {
  // Si ya existe un consentimiento vigente, no se duplica
  if (tienePermiso(titular, finalidad)) {
    return false;
  }
  const registro = cargarRegistro();
  registro.push({
    id: Date.now() + Math.random(),
    titular: titular.trim(),
    finalidad: finalidad,
    version: VERSION_POLITICA,
    otorgadoEn: new Date().toISOString(),
    revocadoEn: null
  });
  guardarRegistro(registro);
  return true;
}

function revocar(id) {
  const registro = cargarRegistro();
  registro.forEach(function (c) {
    if (c.id === id && c.revocadoEn === null) {
      c.revocadoEn = new Date().toISOString();
    }
  });
  guardarRegistro(registro);
}

// ----- Interfaz -----

const formulario = document.getElementById("formulario");
const campoTitular = document.getElementById("titular");
const mensajeForm = document.getElementById("mensaje-form");
const cuerpoTabla = document.getElementById("cuerpo-tabla");
const textoVacio = document.getElementById("vacio");
const selectVerificar = document.getElementById("verificar-finalidad");
const campoVerificarTitular = document.getElementById("verificar-titular");
const resultadoVerificacion = document.getElementById("resultado-verificacion");

document.getElementById("version").textContent = VERSION_POLITICA;

// Llenar el selector de finalidades del verificador
Object.keys(FINALIDADES).forEach(function (clave) {
  const opcion = document.createElement("option");
  opcion.value = clave;
  opcion.textContent = FINALIDADES[clave];
  selectVerificar.appendChild(opcion);
});

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-EC");
}

function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensaje " + tipo;
}

function crearCelda(texto, clase) {
  const td = document.createElement("td");
  td.textContent = texto; // textContent evita inyectar HTML
  if (clase) {
    td.className = clase;
  }
  return td;
}

function dibujarTabla() {
  const registro = cargarRegistro();
  cuerpoTabla.innerHTML = "";
  textoVacio.style.display = registro.length === 0 ? "block" : "none";

  registro.forEach(function (c) {
    const fila = document.createElement("tr");
    const vigente = c.revocadoEn === null;

    fila.appendChild(crearCelda(c.titular));
    fila.appendChild(crearCelda(FINALIDADES[c.finalidad] || c.finalidad));
    fila.appendChild(crearCelda(c.version));
    fila.appendChild(crearCelda(formatearFecha(c.otorgadoEn)));
    fila.appendChild(crearCelda(
      vigente ? "Vigente" : "Revocado el " + formatearFecha(c.revocadoEn),
      vigente ? "estado-vigente" : "estado-revocado"
    ));

    const celdaAccion = document.createElement("td");
    if (vigente) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "revocar";
      boton.textContent = "Revocar";
      boton.addEventListener("click", function () {
        revocar(c.id);
        dibujarTabla();
      });
      celdaAccion.appendChild(boton);
    }
    fila.appendChild(celdaAccion);

    cuerpoTabla.appendChild(fila);
  });
}

formulario.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const titular = campoTitular.value;
  if (titular.trim() === "") {
    mostrarMensaje(mensajeForm, "Escribe un nombre o alias.", "error");
    return;
  }

  const marcadas = formulario.querySelectorAll('input[name="finalidad"]:checked');
  if (marcadas.length === 0) {
    mostrarMensaje(mensajeForm, "No marcaste ninguna finalidad: no se guardó nada.", "error");
    return;
  }

  let nuevos = 0;
  marcadas.forEach(function (casilla) {
    if (otorgar(titular, casilla.value)) {
      nuevos++;
    }
  });

  mostrarMensaje(mensajeForm, nuevos + " consentimiento(s) registrado(s).", "ok");
  formulario.reset();
  dibujarTabla();
});

document.getElementById("boton-verificar").addEventListener("click", function () {
  const titular = campoVerificarTitular.value;
  const finalidad = selectVerificar.value;

  if (titular.trim() === "") {
    mostrarMensaje(resultadoVerificacion, "Escribe el nombre o alias a verificar.", "error");
    return;
  }

  if (tienePermiso(titular, finalidad)) {
    mostrarMensaje(resultadoVerificacion,
      "Permiso vigente: se puede tratar el dato para esta finalidad.", "ok");
  } else {
    mostrarMensaje(resultadoVerificacion,
      "Sin permiso vigente: NO se debe usar el dato para esta finalidad.", "error");
  }
});

document.getElementById("boton-borrar").addEventListener("click", function () {
  if (confirm("¿Borrar todo el registro de prueba?")) {
    localStorage.removeItem(CLAVE_ALMACEN);
    dibujarTabla();
  }
});

dibujarTabla();