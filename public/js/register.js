function registerUser(event) {
  event.preventDefault();

  const user = document.getElementById("newUser").value.trim();
  const email = document.getElementById("newEmail").value.trim();
  const pass = document.getElementById("newPass").value.trim();
  const msg = document.getElementById("registerMsg");

  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Validar usuario repetido
  if (users.some(u => u.user === user)) {
    msg.style.display = "block";
    msg.textContent = "El usuario ya existe";
    return;
  }

  users.push({ user, email, pass });

  localStorage.setItem("users", JSON.stringify(users));
  msg.style.display = "block";
  msg.style.color = "green";
  msg.textContent = "Usuario creado correctamente";

  setTimeout(() => {
    
    window.location.href = "/index.html";

  }, 1200);
}
