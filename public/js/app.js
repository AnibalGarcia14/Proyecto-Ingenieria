// ================================
// 1) DATA MANAGER (Persistencia)
// ================================

class DataManager {
  constructor() {
    // Cargar desde localStorage o inicializar vacío
    this.products = JSON.parse(localStorage.getItem('products')) || [];
    this.sales = JSON.parse(localStorage.getItem('sales')) || [];
    this.feedback = JSON.parse(localStorage.getItem('feedback')) || [];
    this.backups = JSON.parse(localStorage.getItem('backups')) || [];
    this.faults = JSON.parse(localStorage.getItem('faults')) || [];
    this.users = JSON.parse(localStorage.getItem('users')) || [];
    this.meta = JSON.parse(localStorage.getItem('meta')) || {}; // para lastBackupUrl u otros metadatos
  }

  // Persiste todo el estado relevante en localStorage
  save() {
    localStorage.setItem('products', JSON.stringify(this.products));
    localStorage.setItem('sales', JSON.stringify(this.sales));
    localStorage.setItem('feedback', JSON.stringify(this.feedback));
    localStorage.setItem('backups', JSON.stringify(this.backups));
    localStorage.setItem('faults', JSON.stringify(this.faults));
    localStorage.setItem('users', JSON.stringify(this.users));
    localStorage.setItem('meta', JSON.stringify(this.meta));
  }

  // ----------------------
  // Productos / ventas
  // ----------------------
  addProduct(name, category, price, qty) {
    const product = {
      id: Date.now(),
      name,
      category,
      price: Number(price),
      qty: Number(qty),
      dateAdded: new Date().toLocaleDateString()
    };
    this.products.push(product);
    this.save();
    return product;
  }

  editProduct(id, patch) {
    const p = this.products.find(x => x.id === id);
    if (!p) return false;
    Object.assign(p, patch);
    this.save();
    return true;
  }

  deleteProduct(id) {
    this.products = this.products.filter(p => p.id !== id);
    this.save();
  }

  addSale(productId, qty, price) {
    qty = Number(qty);
    price = Number(price);
    const product = this.products.find(p => p.id === productId);
    if (!product || product.qty < qty) return false;

    product.qty -= qty;
    const sale = {
      id: Date.now(),
      productId,
      productName: product.name,
      qty,
      price,
      total: qty * price,
      date: new Date().toLocaleString()
    };
    this.sales.push(sale);
    this.save();
    return true;
  }

  deleteSale(id) {
    const sale = this.sales.find(s => s.id === id);
    if (!sale) return false;
    const product = this.products.find(p => p.id === sale.productId);
    if (product) product.qty += sale.qty;
    this.sales = this.sales.filter(s => s.id !== id);
    this.save();
    return true;
  }

  // ----------------------
  // Consultas / resumen
  // ----------------------
  getTotalSales() {
    return this.sales.reduce((sum, s) => sum + (s.total || 0), 0);
  }

  getTopProduct() {
    if (!this.sales.length) return null;
    const counts = {};
    this.sales.forEach(s => counts[s.productName] = (counts[s.productName] || 0) + s.qty);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  getLowStockProducts(threshold = 10) {
    return this.products.filter(p => Number(p.qty) < threshold);
  }

  // ----------------------
  // Feedback
  // ----------------------
  addFeedback(type, msg) {
    this.feedback.push({
      id: Date.now(),
      type,
      msg,
      date: new Date().toLocaleString()
    });
    this.save();
  }

  // ----------------------
  // Faults (Mantenimiento - evidencias)
  // ----------------------
  addFault(description, imageBase64 = null) {
    const f = {
      id: Date.now(),
      description,
      image: imageBase64,
      date: new Date().toLocaleString()
    };
    this.faults.push(f);
    this.save();
    return f;
  }

  deleteFault(id) {
    this.faults = this.faults.filter(f => f.id !== id);
    this.save();
  }

  clearFaults() {
    this.faults = [];
    this.save();
  }

  // ----------------------
  // Backups locales
  // ----------------------
  addLocalBackup() {
    const backup = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      products: JSON.parse(JSON.stringify(this.products)),
      sales: JSON.parse(JSON.stringify(this.sales)),
      feedback: JSON.parse(JSON.stringify(this.feedback)),
      faults: JSON.parse(JSON.stringify(this.faults)),
      users: JSON.parse(JSON.stringify(this.users))
    };
    this.backups.push(backup);
    this.save();
    return backup;
  }

  deleteLocalBackup(index) {
    if (index >= 0 && index < this.backups.length) {
      this.backups.splice(index, 1);
      this.save();
    }
  }

  getLastLocalBackup() {
    if (!this.backups.length) return null;
    return this.backups[this.backups.length - 1];
  }

  // ----------------------
  // Backup en meta (ej: url del gist)
  // ----------------------
  setMeta(key, value) {
    this.meta[key] = value;
    this.save();
  }

  getMeta(key) {
    return this.meta[key];
  }

  // ----------------------
  // Usuarios
  // ----------------------
  addUser(userObj) {
    // userObj: { user, email, pass, role }
    this.users.push(userObj);
    this.save();
  }

  updateUsers(usersArray) {
    this.users = usersArray;
    this.save();
  }

  // ----------------------
  // Util (reseteo)
  // ----------------------
  clearAllData() {
    this.products = [];
    this.sales = [];
    this.feedback = [];
    this.backups = [];
    this.faults = [];
    // NOTE: mantener users o no depende de ti; aquí se mantienen.
    this.save();
  }
}

// Crear instancia global (reemplaza la antigua)
const db = new DataManager();



// ================================
// 2) UI NAVIGATION (Menú y Secciones)
// ================================

/**
 * Cambia la vista activa del sistema
 * @param {string} target - ID de la sección a mostrar
 */
function switchSection(target) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(target).classList.add('active');
}

// Activar botones del menú para navegación
document.querySelectorAll('.menu-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const target = this.getAttribute('data-target');
    switchSection(target);
  });
});

/**
 * Cierra sesión de usuario y redirige a login
 */
function logout() {
  localStorage.removeItem("logged");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentRole");
  location.href = "/login/login.html";
}




// ================================
// 3) ENTRADAS (Productos & Ventas)
// ================================

/**
 * Registrar producto
 */
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

  // Limpiar formulario
  document.getElementById('prodName').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodQty').value = '';

  alert('✅ Producto registrado exitosamente');
}

/**
 * Mostrar productos en la tabla
 */
function loadProducts() {
  const table = document.getElementById('productsTable');

  if (!db.products.length) {
    table.innerHTML = '<div class="empty-state">No hay productos registrados</div>';
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>Precio</th>
        <th>Stock</th>
        <th>Acciones</th>
      </tr>
  `;

  db.products.forEach(p => {
    html += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td><strong>${p.qty}</strong></td>
        <td class="actions">
          <button class="btn secondary" onclick="editProduct(${p.id})">Editar</button>
          <button class="btn danger" onclick="deleteProductConfirm(${p.id})">Eliminar</button>
        </td>
      </tr>
    `;
  });

  html += '</table>';
  table.innerHTML = html;
}

/**
 * Confirmación de eliminación de producto
 */
function deleteProductConfirm(id) {
  if (confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
    db.deleteProduct(id);
    loadProducts();
    loadSaleProductsSelect();
  }
}

/**
 * Cargar productos en lista desplegable para registrar ventas
 */
function loadSaleProductsSelect() {
  const select = document.getElementById('saleProduct');
  select.innerHTML = '<option value="">Seleccionar...</option>';

  db.products.forEach(p => {
    select.innerHTML += `
      <option value="${p.id}">
        ${p.name} (${p.qty} disponibles)
      </option>
    `;
  });
}

/**
 * Registrar venta
 */
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

/**
 * Mostrar tabla de ventas
 */
function loadSales() {
  const table = document.getElementById('salesTable');

  if (!db.sales.length) {
    table.innerHTML = '<div class="empty-state">No hay ventas registradas</div>';
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Valor Unitario</th>
        <th>Total</th>
        <th>Acciones</th>
      </tr>
  `;

  db.sales.forEach(s => {
    html += `
      <tr>
        <td>${s.date}</td>
        <td>${s.productName}</td>
        <td>${s.qty}</td>
        <td>$${s.price.toFixed(2)}</td>
        <td><strong>$${s.total.toFixed(2)}</strong></td>
        <td class="actions">
          <button class="btn danger" onclick="deleteSaleConfirm(${s.id})">Eliminar</button>
        </td>
      </tr>
    `;
  });

  html += '</table>';
  table.innerHTML = html;
}

/**
 * Confirmación de eliminación de venta
 */
function deleteSaleConfirm(id) {
  if (confirm('¿Deseas eliminar esta venta?')) {
    db.deleteSale(id);
    loadSales();
    loadInventory();
    updateStats();
  }
}





// ================================
// 4) PROCESOS, INVENTARIO Y REPORTES
// ================================

/**
 * Actualiza estadísticas generales del sistema
 */
function updateStats() {
  const stats = [
    { label: 'Total de Ingresos', value: `$${db.getTotalSales().toFixed(2)}` },
    { label: 'Transacciones', value: db.sales.length },
    { label: 'Productos', value: db.products.length },
    { label: 'Stock Total', value: db.products.reduce((s, p) => s + Number(p.qty), 0) }
  ];

  let html = '';
  stats.forEach(s => {
    html += `
      <div class="card">
        <h4>${s.label}</h4>
        <div class="card-value">${s.value}</div>
      </div>
    `;
  });

  document.getElementById('statsGrid').innerHTML = html;
}

/**
 * Tabla de inventario actualizado
 */
function loadInventory() {
  const table = document.getElementById('inventoryTable');

  if (!db.products.length) {
    table.innerHTML = '<div class="empty-state">No hay productos</div>';
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>Stock Actual</th>
        <th>Valor Unitario</th>
        <th>Valor Total</th>
        <th>Estado</th>
      </tr>
  `;

  db.products.forEach(p => {
    const status =
      p.qty < 5 ? '🔴 Crítico' :
      p.qty < 10 ? '🟡 Bajo' :
      '🟢 Normal';

    html += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.qty}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>$${(p.qty * p.price).toFixed(2)}</td>
        <td>${status}</td>
      </tr>
    `;
  });

  html += '</table>';
  table.innerHTML = html;
}

/**
 * Búsqueda de inventario
 */
function filterInventory() {
  const search = document.getElementById('searchProduct').value.toLowerCase();
  const results = db.products.filter(p => p.name.toLowerCase().includes(search));

  const table = document.getElementById('inventoryTable');

  if (!results.length) {
    table.innerHTML = '<div class="empty-state">No se encontraron productos</div>';
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>Stock</th>
        <th>Valor Unitario</th>
        <th>Valor Total</th>
      </tr>
  `;

  results.forEach(p => {
    html += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.qty}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>$${(p.qty * p.price).toFixed(2)}</td>
      </tr>
    `;
  });

  html += '</table>';
  table.innerHTML = html;
}

/**
 * Alertas de stock bajo
 */
function updateAlerts() {
  const lowStock = db.getLowStockProducts();
  const container = document.getElementById('alertsContainer');

  let html = '';

  if (lowStock.length) {
    lowStock.forEach(p => {
      html += `
        <div class="alert warning">
          ⚠️ ${p.name}: Solo ${p.qty} unidades en stock
        </div>
      `;
    });
  } else {
    html = `
      <div class="alert success">
        ✅ Todos los productos tienen buen nivel de stock
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Estadísticas de ventas (top product, total, etc.)
 */
function updateSalesStats() {
  const totalSales = db.getTotalSales();
  const topProduct = db.getTopProduct() || 'N/A';
  const topQty =
    topProduct === 'N/A'
      ? 0
      : db.sales
          .filter(s => s.productName === topProduct)
          .reduce((sum, s) => sum + s.qty, 0);

  const lowStockCount = db.getLowStockProducts().length;

  document.getElementById('totalSales').textContent = totalSales.toFixed(2);
  document.getElementById('totalSalesCount').textContent =
    `${db.sales.length} transacciones`;
  document.getElementById('topProduct').textContent = topProduct;
  document.getElementById('topProductCount').textContent =
    `${topQty} unidades vendidas`;
  document.getElementById('lowStockCount').textContent = lowStockCount;
}

/**
 * Flujo de caja (cash flow)
 */
function loadCashFlow() {
  const table = document.getElementById('cashFlowTable');

  if (!db.sales.length) {
    table.innerHTML = '<div class="empty-state">Sin movimientos</div>';
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Producto</th>
        <th>Movimiento</th>
        <th>Cantidad</th>
        <th>Monto</th>
      </tr>
  `;

  db.sales.forEach(s => {
    html += `
      <tr>
        <td>${s.date}</td>
        <td>${s.productName}</td>
        <td>Venta</td>
        <td>${s.qty}</td>
        <td>$${s.total.toFixed(2)}</td>
      </tr>
    `;
  });

  html += '</table>';
  table.innerHTML = html;
}

/**
 * Reporte analítico de ventas
 */
function loadReports() {
  const table = document.getElementById('reportsTable');

  if (!db.sales.length) {
    table.innerHTML = '<div class="empty-state">No hay datos para mostrar</div>';
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Ingreso</th>
        <th>Margen</th>
      </tr>
  `;

  db.sales.forEach(s => {
    const product = db.products.find(x => x.id === s.productId);
    const margin = product ? ((s.price - product.price) * s.qty).toFixed(2) : 0;

    html += `
      <tr>
        <td>${s.date}</td>
        <td>${s.productName}</td>
        <td>${s.qty}</td>
        <td>${s.total.toFixed(2)}</td>
        <td>${margin}</td>
      </tr>
    `;
  });

  html += '</table>';
  table.innerHTML = html;
}





// ================================
// 5) CONTROL DEL SISTEMA (Validación / Auditoría)
// ================================

/**
 * Valida integridad del sistema:
 * - Precios correctos
 * - Stock no negativo
 * - Stock bajo (advertencias)
 */
function validateData() {
  const errors = [];
  const warnings = [];

  // Validaciones de productos
  db.products.forEach(p => {
    if (p.qty < 0)
      errors.push(`❌ ${p.name}: El stock no puede ser negativo`);

    if (p.price <= 0)
      errors.push(`❌ ${p.name}: El precio debe ser mayor a 0`);

    if (p.qty < 10)
      warnings.push(`⚠️ ${p.name}: Stock bajo (${p.qty} unidades)`);
  });

  // Construcción del reporte visual
  let html = '';

  if (errors.length === 0 && warnings.length === 0) {
    html = `
      <div class="alert success">
        ✅ Validación completada: Todos los datos son correctos
      </div>
    `;
  } else {
    // Mostrar errores
    errors.forEach(err => {
      html += `<div class="alert error">${err}</div>`;
    });

    // Mostrar advertencias
    warnings.forEach(warn => {
      html += `<div class="alert warning">${warn}</div>`;
    });
  }

  document.getElementById('validationResult').innerHTML = html;
}





// ================================
// 6) BACKUP LOCAL (Interno del Sistema)
// ================================

/**
 * Crear un nuevo respaldo local
 */
function backupDataLocal() {
  const backup = db.addLocalBackup();

  alert("✅ Respaldo creado exitosamente");

  updateBackupInfo();
}

/**
 * Restaurar último respaldo local
 */
function restoreDataLocal() {
  const lastBackup = db.getLastLocalBackup();

  if (!lastBackup) {
    alert("❌ No hay respaldos disponibles");
    return;
  }

  if (!confirm("¿Restaurar el último respaldo? Esto sobrescribirá los datos actuales.")) {
    return;
  }

  // Restaurar todos los datos de la copia
  db.products = JSON.parse(JSON.stringify(lastBackup.products));
  db.sales = JSON.parse(JSON.stringify(lastBackup.sales));
  db.feedback = JSON.parse(JSON.stringify(lastBackup.feedback));
  db.faults = JSON.parse(JSON.stringify(lastBackup.faults));
  db.users = JSON.parse(JSON.stringify(lastBackup.users));

  db.save();

  // Recargar el sistema
  loadProducts();
  loadSales();
  loadInventory();
  updateStats();
  loadCashFlow();
  updateAlerts();
  updateSalesStats();
  loadReports();
  loadFaults();
  loadUsers();

  alert("✅ Datos restaurados correctamente");
}

/**
 * Mostrar historial de respaldos locales
 */
function updateBackupInfo() {
  const container = document.getElementById("backupInfo");

  if (!db.backups.length) {
    container.innerHTML = `
      <div class="alert warning">
        ⚠️ No hay respaldos realizados
      </div>
    `;
    return;
  }

  let html = `
    <div class="alert success">
      ✅ Último respaldo: ${db.backups[db.backups.length - 1].date}
    </div>

    <table>
      <tr>
        <th>Fecha</th>
        <th>Productos</th>
        <th>Ventas</th>
        <th>Usuarios</th>
        <th>Acciones</th>
      </tr>
  `;

  db.backups.forEach((b, i) => {
    html += `
      <tr>
        <td>${b.date}</td>
        <td>${b.products.length}</td>
        <td>${b.sales.length}</td>
        <td>${b.users.length}</td>
        <td>
          <button class="btn danger" onclick="deleteLocalBackup(${i})">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  container.innerHTML = html;
}

/**
 * Eliminar un respaldo local específico
 */
function deleteLocalBackup(index) {
  if (!confirm("¿Eliminar este respaldo?")) return;

  db.deleteLocalBackup(index);
  updateBackupInfo();
}




// ================================
// 7) BACKUP EN LA NUBE (Firebase Storage - Privado)
// ================================

const FIREBASE_BUCKET = "inventario-sync-97a49.firebasestorage.app";

// Generar nombre del archivo único
function generateBackupFileName() {
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-${date}.json`;
}

/**
 * SUBIR BACKUP PRIVADO A FIREBASE STORAGE
 */
async function backupDataCloud() {
  const fileName = generateBackupFileName();
  const backupData = {
    date: new Date().toLocaleString(),
    products: db.products,
    sales: db.sales,
    faults: db.faults,
    feedback: db.feedback,
    users: db.users
  };

  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o?name=${fileName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(backupData)
      }
    );

    const data = await res.json();

    if (!data.name) {
      console.error(data);
      alert("❌ Error subiendo respaldo");
      return;
    }

    // Guardamos referencia local
    if (!db.cloudBackups) db.cloudBackups = [];
    db.cloudBackups.push({
      date: backupData.date,
      file: data.name,
      url: data.mediaLink // privado, requiere token si se activa
    });

    db.save();
    updateCloudBackupList();

    alert("✅ Respaldo subido correctamente a Firebase Storage");

  } catch (err) {
    console.error(err);
    alert("❌ Error de red subiendo respaldo");
  }
}

/**
 * DESCARGAR BACKUP PRIVADO DESDE FIREBASE STORAGE
 */
async function restoreDataCloud(fileName) {
  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodeURIComponent(fileName)}?alt=media`
    );

    const backup = await res.json();

    if (!confirm("¿Restaurar esta copia desde la nube?")) return;

    db.products = backup.products || [];
    db.sales = backup.sales || [];
    db.faults = backup.faults || [];
    db.feedback = backup.feedback || [];
    db.users = backup.users || [];

    db.save();

    // Recargar todos los módulos
    loadProducts();
    loadSales();
    loadInventory();
    loadFaults();
    loadReports();
    loadCashFlow();
    updateStats();
    updateAlerts();

    alert("✅ Datos restaurados desde la nube");

  } catch (err) {
    console.error(err);
    alert("❌ Error restaurando respaldo");
  }
}

/**
 * LISTAR RESPALDOS EN LA INTERFAZ
 */
function updateCloudBackupList() {
  const container = document.getElementById("backupCloudList");

  if (!db.cloudBackups || db.cloudBackups.length === 0) {
    container.innerHTML = `
      <div class="alert warning">
        No hay respaldos en la nube
      </div>
    `;
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Archivo</th>
        <th>Acción</th>
      </tr>
  `;

  db.cloudBackups.forEach(b => {
    html += `
      <tr>
        <td>${b.date}</td>
        <td>${b.file}</td>
        <td>
          <button class="btn secondary" onclick="restoreDataCloud('${b.file}')">
            Restaurar
          </button>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  container.innerHTML = html;
}






// ================================
// 8) FALLOS DE SISTEMA (Evidencias Visuales)
// ================================

/**
 * Registrar un fallo con descripción + evidencia (imagen)
 */
async function registerFault() {
  const desc = document.getElementById("faultDesc").value.trim();
  const fileInput = document.getElementById("faultImage");
  const file = fileInput.files[0];

  if (!desc) {
    alert("❌ Debes escribir una descripción del fallo");
    return;
  }

  if (!file) {
    alert("❌ Debes adjuntar una imagen como evidencia");
    return;
  }

  // Convertimos la imagen a Base64
  const base64 = await fileToBase64(file);

  db.faults.push({
    id: Date.now(),
    description: desc,
    image: base64,
    date: new Date().toLocaleString()
  });

  db.save();

  // Limpiar UI
  document.getElementById("faultDesc").value = "";
  fileInput.value = "";

  loadFaults();

  alert("✅ Falla registrada correctamente");
}

/**
 * Convertir archivo a Base64 (para guardarlo en LocalStorage y backups)
 */
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Mostrar historial de fallos registrados
 */
function loadFaults() {
  const container = document.getElementById("faultsTable");

  if (!db.faults.length) {
    container.innerHTML = `
      <div class="empty-state">
        No hay fallos registrados
      </div>
    `;
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Descripción</th>
        <th>Evidencia</th>
        <th>Acciones</th>
      </tr>
  `;

  db.faults.forEach(f => {
    html += `
      <tr>
        <td>${f.date}</td>
        <td>${f.description}</td>

        <td>
          <img src="${f.image}" style="width:70px; height:70px; object-fit:cover; border-radius:5px; cursor:pointer"
               onclick="openImageModal('${f.image}')">
        </td>

        <td>
          <button class="btn danger" onclick="deleteFault(${f.id})">Eliminar</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  container.innerHTML = html;
}

/**
 * Eliminar un fallo por ID
 */
function deleteFault(id) {
  if (!confirm("¿Eliminar esta falla?")) return;

  db.faults = db.faults.filter(f => f.id !== id);
  db.save();
  loadFaults();
}

/**
 * Mostrar imagen en un modal grande
 */
function openImageModal(base64) {
  const win = window.open();
  win.document.write(`
    <title>Evidencia</title>
    <img src="${base64}" style="width:100%; height:auto;">
  `);
}





// ================================
// 9) EXPORTACIÓN DE DATOS (CSV / PDF)
// ================================

// ------- EXPORTACIÓN GENÉRICA A CSV -------
function exportCSV(filename, rows) {
  const processRow = row =>
    row.map(v => `"${v}"`).join(",");

  let csvFile = rows.map(processRow).join("\n");
  const blob = new Blob([csvFile], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();

  URL.revokeObjectURL(url);
}

// ------- EXPORTACIÓN GENÉRICA A PDF -------
function exportPDF(title, headers, data, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.autoTable({
    head: [headers],
    body: data,
    startY: 25,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [40, 40, 40] }
  });

  doc.save(filename + ".pdf");
}

// ================================================
// 1) EXPORTAR VENTAS (CSV + PDF)
// ================================================

// CSV
function exportSalesCSV() {
  if (!db.sales.length) return alert("❌ No hay ventas para exportar");

  const rows = [
    ["Fecha", "Producto", "Cantidad", "Precio Unitario", "Total"]
  ];

  db.sales.forEach(s => {
    rows.push([s.date, s.productName, s.qty, s.price, s.total]);
  });

  exportCSV("reporte_ventas", rows);
}

// PDF
function exportSalesPDF() {
  if (!db.sales.length) return alert("❌ No hay ventas para exportar");

  const headers = ["Fecha", "Producto", "Cantidad", "Unitario", "Total"];
  const data = db.sales.map(s => [
    s.date, s.productName, s.qty, s.price, s.total
  ]);

  exportPDF("REPORTE DE VENTAS", headers, data, "reporte_ventas");
}

// ================================================
// 2) EXPORTAR INVENTARIO ACTUAL (CSV + PDF)
// ================================================

// CSV
function exportInventoryCSV() {
  if (!db.products.length) return alert("❌ No hay inventario para exportar");

  const rows = [["Producto", "Categoría", "Stock", "Precio", "Valor Total"]];

  db.products.forEach(p => {
    rows.push([
      p.name,
      p.category,
      p.qty,
      p.price,
      p.qty * p.price
    ]);
  });

  exportCSV("inventario", rows);
}

// PDF
function exportInventoryPDF() {
  if (!db.products.length) return alert("❌ No hay inventario para exportar");

  const headers = ["Producto", "Categoría", "Stock", "Precio", "Valor Total"];
  const data = db.products.map(p => [
    p.name,
    p.category,
    p.qty,
    p.price,
    (p.qty * p.price).toFixed(2)
  ]);

  exportPDF("INVENTARIO GENERAL", headers, data, "inventario_general");
}

// ====================================================
// 3) MOVIMIENTOS DE CAJA
// ====================================================

// CSV
function exportCashFlowCSV() {
  if (!db.sales.length) return alert("❌ Sin movimientos");

  const rows = [["Fecha", "Producto", "Movimiento", "Cantidad", "Monto"]];

  db.sales.forEach(s => {
    rows.push([s.date, s.productName, "Venta", s.qty, s.total]);
  });

  exportCSV("flujo_caja", rows);
}

// PDF
function exportCashFlowPDF() {
  if (!db.sales.length) return alert("❌ Sin movimientos");

  const headers = ["Fecha", "Producto", "Movimiento", "Cant.", "Monto"];
  const data = db.sales.map(s => [
    s.date, s.productName, "Venta", s.qty, s.total
  ]);

  exportPDF("FLUJO DE CAJA", headers, data, "flujo_caja");
}

// ====================================================
// 4) FALLAS Y EVIDENCIAS
// ====================================================

// CSV (sin imágenes obviamente)
function exportFaultsCSV() {
  if (!db.faults.length) return alert("❌ No hay fallas registradas");

  const rows = [["Fecha", "Descripción"]];

  db.faults.forEach(f => {
    rows.push([f.date, f.description]);
  });

  exportCSV("fallas", rows);
}

// PDF (sin imágenes incrustadas; pero con referencia)
function exportFaultsPDF() {
  if (!db.faults.length) return alert("❌ No hay fallas registradas");

  const headers = ["Fecha", "Descripción", "Evidencia"];
  const data = db.faults.map(f => [
    f.date,
    f.description,
    "Incluida (Base64)"
  ]);

  exportPDF("REPORTE DE FALLOS", headers, data, "fallos");
}




// ================================
// 10) SINCRONIZACIÓN EN LA NUBE (Firebase Storage)
// ================================

import {
  ref,
  uploadString,
  listAll,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// NOMBRE DEL ARCHIVO EN LA NUBE
const CLOUD_BACKUP_NAME = "backup_inventario.json";

// ------------------------------
// SUBIR BACKUP A LA NUBE
// ------------------------------
async function uploadCloudBackup() {
  try {
    const backup = {
      date: new Date().toLocaleString(),
      products: db.products,
      sales: db.sales,
      feedback: db.feedback,
      faults: JSON.parse(localStorage.getItem("faults") || "[]")
    };

    const fileRef = ref(window.storage, CLOUD_BACKUP_NAME);

    await uploadString(fileRef, JSON.stringify(backup), "raw");

    alert("☁️ Backup subido a la nube correctamente");

  } catch (err) {
    console.error(err);
    alert("❌ Error al subir el backup a la nube");
  }
}

// ------------------------------
// DESCARGAR Y RESTAURAR DESDE LA NUBE
// ------------------------------
async function downloadCloudBackup() {
  try {
    const fileRef = ref(window.storage, CLOUD_BACKUP_NAME);
    const url = await getDownloadURL(fileRef);

    const response = await fetch(url);
    const cloudBackup = await response.json();

    // Restaurar datos
    db.products = cloudBackup.products || [];
    db.sales = cloudBackup.sales || [];
    db.feedback = cloudBackup.feedback || [];
    localStorage.setItem("faults", JSON.stringify(cloudBackup.faults || []));

    db.save();

    loadProducts();
    loadSales();
    loadInventory();
    updateStats();
    updateSalesStats();
    updateAlerts();
    loadFaults();

    alert("☁️ Datos restaurados desde la nube correctamente");

  } catch (err) {
    console.error(err);
    alert("❌ No se pudo descargar el backup en la nube");
  }
}

// ------------------------------
// LISTAR ARCHIVOS EN LA NUBE (para debug)

async function listCloudBackups() {
  try {
    const root = ref(window.storage);
    const list = await listAll(root);

    console.log("Archivos en la nube:", list.items);

    alert("Revisa la consola: respaldos listados");

  } catch (err) {
    console.error(err);
  }
}

// ------------------------------
// AUTO-SYNC CADA 90 SEGUNDOS
// ------------------------------
setInterval(() => {
  uploadCloudBackup();
}, 90000);



// =========================
// EXPONER FUNCIONES AL WINDOW
// NECESARIO PORQUE SE USA type="module"
// =========================

// Entrada
window.addProduct = addProduct;
window.recordSale = recordSale;
window.loadProducts = loadProducts;
window.loadSales = loadSales;
window.deleteProductConfirm = deleteProductConfirm;
window.deleteSaleConfirm = deleteSaleConfirm;

// Procesos
window.filterInventory = filterInventory;
window.loadInventory = loadInventory;

// Salidas
window.exportReport = exportReport;

// Control
window.validateData = validateData;
window.backupData = backupData;
window.restoreData = restoreData;
window.sendFeedback = sendFeedback;

// Mantenimiento
window.registerFault = registerFault;
window.deleteFault = deleteFault;
window.loadFaults = loadFaults;

// Usuarios
window.createUser = createUser;

// Navegación/Seguridad
window.switchSection = switchSection;
window.logout = logout;
