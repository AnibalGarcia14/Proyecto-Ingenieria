// ===== GESTIÓN DE DATOS =====
    class DataManager {
      constructor() {
        this.products = JSON.parse(localStorage.getItem('products')) || [];
        this.sales = JSON.parse(localStorage.getItem('sales')) || [];
        this.feedback = JSON.parse(localStorage.getItem('feedback')) || [];
        this.backups = JSON.parse(localStorage.getItem('backups')) || [];
      }

      save() {
        localStorage.setItem('products', JSON.stringify(this.products));
        localStorage.setItem('sales', JSON.stringify(this.sales));
        localStorage.setItem('feedback', JSON.stringify(this.feedback));
        localStorage.setItem('backups', JSON.stringify(this.backups));
      }

      addProduct(name, category, price, qty) {
        this.products.push({
          id: Date.now(),
          name, category, price, qty,
          dateAdded: new Date().toLocaleDateString()
        });
        this.save();
      }

      addSale(productId, qty, price) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.qty < qty) return false;
        
        product.qty -= qty;
        this.sales.push({
          id: Date.now(),
          productId,
          productName: product.name,
          qty, price, total: qty * price,
          date: new Date().toLocaleString()
        });
        this.save();
        return true;
      }

      deleteProduct(id) {
        this.products = this.products.filter(p => p.id !== id);
        this.save();
      }

      deleteSale(id) {
        const sale = this.sales.find(s => s.id === id);
        if (sale) {
          const product = this.products.find(p => p.id === sale.productId);
          if (product) product.qty += sale.qty;
          this.sales = this.sales.filter(s => s.id !== id);
          this.save();
        }
      }

      getTotalSales() {
        return this.sales.reduce((sum, s) => sum + s.total, 0);
      }

      getTopProduct() {
        if (!this.sales.length) return null;
        const counts = {};
        this.sales.forEach(s => {
          counts[s.productName] = (counts[s.productName] || 0) + s.qty;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      }

      getLowStockProducts() {
        return this.products.filter(p => p.qty < 10);
      }
    }

    const db = new DataManager();

    // ===== INTERFAZ =====
    function switchSection(target) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(target).classList.add('active');
    }

    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        switchSection(this.dataset.target);
      });
    });

    function logout() {
      localStorage.removeItem("logged");
      location.href = "/login/login.html";

    }


    // ===== ENTRADA =====
    function addProduct() {
      const name = document.getElementById('prodName').value.trim();
      const category = document.getElementById('prodCategory').value;
      const price = parseFloat(document.getElementById('prodPrice').value);
      const qty = parseInt(document.getElementById('prodQty').value);

      if (!name || !category || !price || !qty) {
        alert('Por favor completa todos los campos');
        return;
      }

      db.addProduct(name, category, price, qty);
      loadProducts();
      loadSaleProductsSelect();
      
      document.getElementById('prodName').value = '';
      document.getElementById('prodPrice').value = '';
      document.getElementById('prodQty').value = '';
      alert('✅ Producto registrado exitosamente');
    }

    function loadProducts() {
      if (!db.products.length) {
        document.getElementById('productsTable').innerHTML = '<div class="empty-state">No hay productos registrados</div>';
        return;
      }

      let html = '<table><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr>';
      db.products.forEach(p => {
        html += `<tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td><strong>${p.qty}</strong></td>
          <td class="actions">
            <button class="btn secondary" onclick="editProduct(${p.id})">Editar</button>
            <button class="btn danger" onclick="deleteProductConfirm(${p.id})">Eliminar</button>
          </td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('productsTable').innerHTML = html;
    }

    function deleteProductConfirm(id) {
      if (confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
        db.deleteProduct(id);
        loadProducts();
        loadSaleProductsSelect();
      }
    }

    function loadSaleProductsSelect() {
      const select = document.getElementById('saleProduct');
      select.innerHTML = '<option value="">Seleccionar...</option>';
      db.products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (${p.qty} disponibles)</option>`;
      });
    }

    function recordSale() {
      const productId = parseInt(document.getElementById('saleProduct').value);
      const qty = parseInt(document.getElementById('saleQty').value);
      const price = parseFloat(document.getElementById('salePrice').value);

      if (!productId || !qty || !price) {
        alert('Por favor completa todos los campos');
        return;
      }

      if (db.addSale(productId, qty, price)) {
        loadSales();
        loadInventory();
        updateStats();
        
        document.getElementById('saleQty').value = '';
        document.getElementById('salePrice').value = '';
        alert('✅ Venta registrada exitosamente');
      } else {
        alert('❌ Stock insuficiente o producto inválido');
      }
    }

    function loadSales() {
      if (!db.sales.length) {
        document.getElementById('salesTable').innerHTML = '<div class="empty-state">No hay ventas registradas</div>';
        return;
      }

      let html = '<table><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Valor Unitario</th><th>Total</th><th>Acciones</th></tr>';
      db.sales.forEach(s => {
        html += `<tr>
          <td>${s.date}</td>
          <td>${s.productName}</td>
          <td>${s.qty}</td>
          <td>$${s.price.toFixed(2)}</td>
          <td><strong>$${s.total.toFixed(2)}</strong></td>
          <td class="actions">
            <button class="btn danger" onclick="deleteSaleConfirm(${s.id})">Eliminar</button>
          </td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('salesTable').innerHTML = html;
    }

    function deleteSaleConfirm(id) {
      if (confirm('¿Deseas eliminar esta venta?')) {
        db.deleteSale(id);
        loadSales();
        loadInventory();
        updateStats();
      }
    }

    // ===== PROCESOS =====
    function updateStats() {
      const stats = [
        { label: 'Total de Ingresos', value: `$${db.getTotalSales().toFixed(2)}` },
        { label: 'Transacciones', value: db.sales.length },
        { label: 'Productos', value: db.products.length },
        { label: 'Stock Total', value: db.products.reduce((s, p) => s + p.qty, 0) }
      ];

      let html = '';
      stats.forEach(s => {
        html += `<div class="card">
          <h4>${s.label}</h4>
          <div class="card-value">${s.value}</div>
        </div>`;
      });
      document.getElementById('statsGrid').innerHTML = html;
    }

    function loadInventory() {
      if (!db.products.length) {
        document.getElementById('inventoryTable').innerHTML = '<div class="empty-state">No hay productos</div>';
        return;
      }

      let html = '<table><tr><th>Producto</th><th>Categoría</th><th>Stock Actual</th><th>Valor Unitario</th><th>Valor Total</th><th>Estado</th></tr>';
      db.products.forEach(p => {
        const status = p.qty < 5 ? '🔴 Crítico' : p.qty < 10 ? '🟡 Bajo' : '🟢 Normal';
        html += `<tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${p.qty}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>$${(p.qty * p.price).toFixed(2)}</td>
          <td>${status}</td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('inventoryTable').innerHTML = html;
    }

    function filterInventory() {
      const search = document.getElementById('searchProduct').value.toLowerCase();
      const filtered = db.products.filter(p => p.name.toLowerCase().includes(search));
      
      if (!filtered.length) {
        document.getElementById('inventoryTable').innerHTML = '<div class="empty-state">No se encontraron productos</div>';
        return;
      }

      let html = '<table><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Valor Unitario</th><th>Valor Total</th></tr>';
      filtered.forEach(p => {
        html += `<tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${p.qty}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>$${(p.qty * p.price).toFixed(2)}</td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('inventoryTable').innerHTML = html;
    }

    function loadCashFlow() {
      if (!db.sales.length) {
        document.getElementById('cashFlowTable').innerHTML = '<div class="empty-state">Sin movimientos</div>';
        return;
      }

      let html = '<table><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Monto</th></tr>';
      db.sales.forEach(s => {
        html += `<tr>
          <td>${s.date}</td>
          <td>${s.productName}</td>
          <td>Venta</td>
          <td>${s.qty}</td>
          <td>$${s.total.toFixed(2)}</td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('cashFlowTable').innerHTML = html;
    }

    // ===== SALIDAS =====
    function updateAlerts() {
      let html = '';
      const lowStock = db.getLowStockProducts();

      if (lowStock.length) {
        lowStock.forEach(p => {
          html += `<div class="alert warning">⚠️ ${p.name}: Solo ${p.qty} unidades en stock</div>`;
        });
      } else {
        html += '<div class="alert success">✅ Todos los productos tienen buen nivel de stock</div>';
      }

      document.getElementById('alertsContainer').innerHTML = html;
    }

    function updateSalesStats() {
      const total = db.getTotalSales();
      const topProduct = db.getTopProduct() || 'N/A';
      const topQty = topProduct === 'N/A' ? 0 : db.sales.filter(s => s.productName === topProduct).reduce((sum, s) => sum + s.qty, 0);
      const lowStock = db.getLowStockProducts().length;

      document.getElementById('totalSales').textContent = `${total.toFixed(2)}`;
      document.getElementById('totalSalesCount').textContent = `${db.sales.length} transacciones`;
      document.getElementById('topProduct').textContent = topProduct;
      document.getElementById('topProductCount').textContent = `${topQty} unidades vendidas`;
      document.getElementById('lowStockCount').textContent = lowStock;
    }

    function loadReports() {
      if (!db.sales.length) {
        document.getElementById('reportsTable').innerHTML = '<div class="empty-state">No hay datos para mostrar</div>';
        return;
      }

      let html = '<table><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Ingreso</th><th>Margen</th></tr>';
      db.sales.forEach(s => {
        const product = db.products.find(p => p.id === s.productId);
        const margin = product ? ((s.price - product.price) * s.qty).toFixed(2) : 0;
        html += `<tr>
          <td>${s.date}</td>
          <td>${s.productName}</td>
          <td>${s.qty}</td>
          <td>${s.total.toFixed(2)}</td>
          <td>${margin}</td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('reportsTable').innerHTML = html;
    }

    // ===== CONTROL =====
    function validateData() {
      let errors = [];
      let warnings = [];

      db.products.forEach(p => {
        if (p.qty < 0) errors.push(`❌ ${p.name}: Stock negativo`);
        if (p.price <= 0) errors.push(`❌ ${p.name}: Precio inválido`);
      });

      db.products.forEach(p => {
        if (p.qty < 10) warnings.push(`⚠️ ${p.name}: Stock bajo`);
      });

      let html = '';
      if (errors.length === 0 && warnings.length === 0) {
        html = '<div class="alert success">✅ Validación completada: Todos los datos son correctos</div>';
      } else {
        errors.forEach(e => html += `<div class="alert error">${e}</div>`);
        warnings.forEach(w => html += `<div class="alert warning">${w}</div>`);
      }

      document.getElementById('validationResult').innerHTML = html;
    }

    function backupData() {
      const backup = {
        date: new Date().toLocaleString(),
        products: JSON.parse(JSON.stringify(db.products)),
        sales: JSON.parse(JSON.stringify(db.sales)),
        feedback: JSON.parse(JSON.stringify(db.feedback))
      };

      db.backups.push(backup);
      db.save();
      updateBackupInfo();
      alert('✅ Respaldo creado exitosamente');
    }

    function restoreData() {
      if (!db.backups.length) {
        alert('❌ No hay respaldos disponibles');
        return;
      }

      if (confirm('¿Restaurar el último respaldo? Se sobrescribirán los datos actuales.')) {
        const lastBackup = db.backups[db.backups.length - 1];
        db.products = JSON.parse(JSON.stringify(lastBackup.products));
        db.sales = JSON.parse(JSON.stringify(lastBackup.sales));
        db.feedback = JSON.parse(JSON.stringify(lastBackup.feedback));
        db.save();
        
        loadProducts();
        loadSales();
        loadInventory();
        updateStats();
        alert('✅ Datos restaurados exitosamente');
      }
    }

    function updateBackupInfo() {
      if (!db.backups.length) {
        document.getElementById('backupInfo').innerHTML = '<div class="alert warning">⚠️ No hay respaldos realizados</div>';
        return;
      }

      const last = db.backups[db.backups.length - 1];
      let html = `<div class="alert success">✅ Último respaldo: ${last.date}</div>`;
      html += `<table><tr><th>Fecha</th><th>Productos</th><th>Ventas</th><th>Acción</th></tr>`;
      
      db.backups.forEach((b, i) => {
        html += `<tr>
          <td>${b.date}</td>
          <td>${b.products.length}</td>
          <td>${b.sales.length}</td>
          <td><button class="btn secondary" onclick="db.backups.splice(${i}, 1); db.save(); updateBackupInfo()">Eliminar</button></td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('backupInfo').innerHTML = html;
    }

    function sendFeedback() {
      const type = document.getElementById('feedbackType').value;
      const msg = document.getElementById('feedbackMsg').value.trim();

      if (!msg) {
        alert('Por favor escribe tu mensaje');
        return;
      }

      db.feedback.push({
        id: Date.now(),
        type, msg,
        date: new Date().toLocaleString()
      });
      db.save();

      document.getElementById('feedbackMsg').value = '';
      alert('✅ Feedback enviado. ¡Gracias por tu opinión!');
    }

    function clearAllData() {
      if (confirm('⚠️ ADVERTENCIA: Esta acción eliminará TODOS los datos del sistema de forma permanente e irreversible.\n\n¿Estás completamente seguro?')) {
        if (confirm('Confirmar última vez: ¿ELIMINAR TODO?')) {
          localStorage.clear();
          db.products = [];
          db.sales = [];
          db.feedback = [];
          db.backups = [];
          
          loadProducts();
          loadSales();
          loadInventory();
          updateStats();
          alert('✅ Todos los datos han sido eliminados');
        }
      }
    }

    function exportReport() {
      if (!db.sales.length) {
        alert('❌ No hay datos para exportar');
        return;
      }

      let csv = 'Fecha,Producto,Cantidad,Precio Unitario,Total\n';
      db.sales.forEach(s => {
        csv += `"${s.date}","${s.productName}",${s.qty},${s.price},${s.total}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${new Date().toLocaleDateString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    // ===== INICIALIZACIÓN =====
    window.addEventListener('DOMContentLoaded', () => {

      document.getElementById("headerUser").textContent = localStorage.getItem("currentUser") || "Usuario";

      loadProducts();
      loadSales();
      loadSaleProductsSelect();
      updateStats();
      loadInventory();
      loadCashFlow();
      updateAlerts();
      updateSalesStats();
      loadReports();
      updateBackupInfo();
      loadUsers();
    });

    // Actualizar datos cada 5 segundos
    setInterval(() => {
      updateStats();
      updateAlerts();
      updateSalesStats();
    }, 5000);

    //====== Cragar usuarios
    function loadUsers() {
      let users = JSON.parse(localStorage.getItem("users")) || [];

      if (!users.length) {
        document.getElementById("usersTable").innerHTML =
          '<div class="empty-state">No hay usuarios registrados</div>';
        return;
      }

      let html = `
        <table>
          <tr>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
      `;

      users.forEach((u, i) => {
        html += `
          <tr>
            <td>${u.user}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td class="actions">
              <button class="btn secondary" onclick="editUser(${i})">Editar</button>
              <button class="btn danger" onclick="deleteUser(${i})">Eliminar</button>
            </td>
          </tr>
        `;
      });

      html += "</table>";
      document.getElementById("usersTable").innerHTML = html;
    }


    // ====== Crear Usuario ======

    function createUser() {
      const user = document.getElementById("newUser").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const pass = document.getElementById("newPass").value.trim();
      const role = document.getElementById("newRole").value;

      if (!user || !email || !pass) {
        alert("Completa todos los campos");
        return;
      }

      let users = JSON.parse(localStorage.getItem("users")) || [];

      if (users.some(u => u.user === user)) {
        alert("El usuario ya existe");
        return;
      }

      users.push({ user, email, pass, role });
      localStorage.setItem("users", JSON.stringify(users));

      loadUsers();
      alert("Usuario creado correctamente");
    }


    //====== Eliminar usuarios
    function deleteUser(index) {
      const role = localStorage.getItem("currentRole");
      if (role !== "admin") {
        alert("No tienes permisos para eliminar usuarios");
        return;
      }

      let users = JSON.parse(localStorage.getItem("users")) || [];
      if (!confirm("¿Eliminar este usuario?")) return;

      users.splice(index, 1);
      localStorage.setItem("users", JSON.stringify(users));

      loadUsers();
    }

    // ===== Editar Usuario

    function editUser(index) {
    const role = localStorage.getItem("currentRole");
    if (role !== "admin") {
      alert("No tienes permisos para editar usuarios");
      return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    let u = users[index];

    const newEmail = prompt("Nuevo correo:", u.email);
    const newPass = prompt("Nueva contraseña:", u.pass);
    const newRole = prompt("Rol (admin/user):", u.role);

    if (newEmail && newPass && newRole) {
      users[index] = {
        user: u.user,
        email: newEmail,
        pass: newPass,
        role: newRole
      };

      localStorage.setItem("users", JSON.stringify(users));
      loadUsers();
    }
  }

    document.getElementById("headerUser").textContent = localStorage.getItem("currentUser") || "Usuario";