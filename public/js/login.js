function login(event) {
  event.preventDefault();

  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();

  let users = JSON.parse(localStorage.getItem("users")) || [];

  const valid = users.find(u => u.user === user && u.pass === pass);

  if (valid) {
    localStorage.setItem("logged", "true");
    localStorage.setItem("currentUser", valid.user);
    localStorage.setItem("currentRole", valid.role);
    window.location.href = "/index.html";

  } else {
    const errorBox = document.getElementById("loginError");
    errorBox.style.display = "block";
    errorBox.textContent = "Usuario o contraseña incorrectos";
  }
}
