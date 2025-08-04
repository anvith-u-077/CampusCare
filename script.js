// DOM Elements
const elements = {
  authContainer: document.getElementById('auth-container'),
  mainContainer: document.getElementById('main-container'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  showRegister: document.getElementById('show-register'),
  showLogin: document.getElementById('show-login'),
  registerCard: document.getElementById('register-card'),
  logoutBtn: document.getElementById('logout-btn'),
  userEmail: document.getElementById('user-email'),
  adminNav: document.getElementById('admin-nav'),
  homePage: document.getElementById('home-page'),
  complaintsPage: document.getElementById('complaints-page'),
  newComplaintPage: document.getElementById('new-complaint-page'),
  adminDashboard: document.getElementById('admin-dashboard'),
  homeNav: document.getElementById('home-nav'),
  complaintsNav: document.getElementById('complaints-nav'),
  newComplaintNav: document.getElementById('new-complaint-nav'),
  complaintForm: document.getElementById('complaint-form'),
  complaintImage: document.getElementById('complaint-image'),
  imagePreview: document.getElementById('image-preview'),
  previewImage: document.getElementById('preview-image'),
  removeImage: document.getElementById('remove-image'),
  complaintModal: new bootstrap.Modal(document.getElementById('complaintModal')),
  adminComplaintModal: new bootstrap.Modal(document.getElementById('adminComplaintModal')),
  toastEl: document.getElementById('liveToast'),
  toast: new bootstrap.Toast(document.getElementById('liveToast'))
};

// Global variables
const state = {
  currentUser: null,
  currentPage: 'home',
  currentComplaintPage: 1,
  currentAdminComplaintPage: 1,
  complaintsPerPage: 5,
  selectedComplaintId: null,
  selectedFile: null,
  categoryChart: null,
  statusChart: null
};

// Initialize the app
function init() {
  setupEventListeners();
  checkAuthState();
}

// Set up event listeners
function setupEventListeners() {
  // Auth related
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.registerForm.addEventListener('submit', handleRegister);
  elements.showRegister.addEventListener('click', showRegisterForm);
  elements.showLogin.addEventListener('click', showLoginForm);
  elements.logoutBtn.addEventListener('click', handleLogout);
  
  // Navigation
  elements.homeNav.addEventListener('click', () => navigateTo('home'));
  elements.complaintsNav.addEventListener('click', () => navigateTo('complaints'));
  elements.newComplaintNav.addEventListener('click', () => navigateTo('new-complaint'));
  elements.adminNav.addEventListener('click', () => navigateTo('admin'));
  
  // Complaint related
  elements.complaintForm.addEventListener('submit', handleComplaintSubmit);
  elements.complaintImage.addEventListener('change', handleImageUpload);
  elements.removeImage.addEventListener('click', removeUploadedImage);
  document.getElementById('new-complaint-btn').addEventListener('click', () => navigateTo('new-complaint'));
  
  // Admin filters
  document.getElementById('filter-status').addEventListener('change', loadAdminComplaints);
  document.getElementById('filter-category').addEventListener('change', loadAdminComplaints);
  
  // Admin modal save
  document.getElementById('save-complaint-status').addEventListener('click', saveComplaintStatus);
}

// Check auth state
function checkAuthState() {
  auth.onAuthStateChanged(async user => {
    if (user) {
      state.currentUser = user;
      user.role = await getUserRole(user.uid);
      setupUI(user);
    } else {
      state.currentUser = null;
      setupUI(null);
    }
  });
}

// Get user role from Firestore
async function getUserRole(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? doc.data().role : 'student';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'student';
  }
}

// Setup UI based on auth state
function setupUI(user) {
  if (user) {
    elements.authContainer.classList.add('d-none');
    elements.mainContainer.classList.remove('d-none');
    elements.userEmail.textContent = user.email;
    
    // Show/hide admin nav based on role
    elements.adminNav.classList.toggle('d-none', user.role !== 'admin');
    navigateTo(user.role === 'admin' ? 'admin' : 'home');
    
    // Load initial data
    loadQuickStats();
    loadRecentActivity();
    loadComplaints();
    if (user.role === 'admin') {
      loadAdminComplaints();
      loadAdminStats();
    }
  } else {
    elements.authContainer.classList.remove('d-none');
    elements.mainContainer.classList.add('d-none');
    elements.registerCard.classList.add('d-none');
    elements.loginForm.reset();
    elements.registerForm.reset();
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Success', 'Logged in successfully!');
  } catch (error) {
    showToast('Error', error.message, 'danger');
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const role = document.getElementById('register-role').value;
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(userCredential.user.uid).set({
      name,
      email,
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Success', 'Account created successfully!');
    showLoginForm();
  } catch (error) {
    showToast('Error', error.message, 'danger');
  }
}

// Handle logout
async function handleLogout() {
  try {
    await auth.signOut();
    showToast('Success', 'Logged out successfully!');
  } catch (error) {
    showToast('Error', error.message, 'danger');
  }
}

// Show register form
function showRegisterForm(e) {
  e.preventDefault();
  elements.registerCard.classList.remove('d-none');
}

// Show login form
function showLoginForm(e) {
  if (e) e.preventDefault();
  elements.registerCard.classList.add('d-none');
}

// Navigation
function navigateTo(page) {
  state.currentPage = page;
  
  // Hide all pages
  elements.homePage.classList.add('d-none');
  elements.complaintsPage.classList.add('d-none');
  elements.newComplaintPage.classList.add('d-none');
  elements.adminDashboard.classList.add('d-none');
  
  // Update active nav
  elements.homeNav.classList.remove('active');
  elements.complaintsNav.classList.remove('active');
  elements.newComplaintNav.classList.remove('active');
  elements.adminNav.classList.remove('active');
  
  // Show selected page and update nav
  switch (page) {
    case 'home':
      elements.homePage.classList.remove('d-none');
      elements.homeNav.classList.add('active');
      loadQuickStats();
      loadRecentActivity();
      break;
    case 'complaints':
      elements.complaintsPage.classList.remove('d-none');
      elements.complaintsNav.classList.add('active');
      loadComplaints();
      break;
    case 'new-complaint':
      elements.newComplaintPage.classList.remove('d-none');
      elements.newComplaintNav.classList.add('active');
      elements.complaintForm.reset();
      elements.imagePreview.classList.add('d-none');
      state.selectedFile = null;
      break;
    case 'admin':
      elements.adminDashboard.classList.remove('d-none');
      elements.adminNav.classList.add('active');
      loadAdminComplaints();
      loadAdminStats();
      break;
  }
}

// Handle complaint submission
async function handleComplaintSubmit(e) {
  e.preventDefault();
  
  const category = document.getElementById('complaint-category').value;
  const description = document.getElementById('complaint-description').value;
  
  if (!category || !description) {
    showToast('Error', 'Please fill all required fields', 'danger');
    return;
  }
  
  const complaintData = {
    userId: state.currentUser.uid,
    userEmail: state.currentUser.email,
    category,
    description,
    status: 'Pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    if (state.selectedFile) {
      const storageRef = storage.ref(`complaints/${state.currentUser.uid}/${Date.now()}_${state.selectedFile.name}`);
      const snapshot = await storageRef.put(state.selectedFile);
      complaintData.imageUrl = await snapshot.ref.getDownloadURL();
    }
    
    await saveComplaint(complaintData);
  } catch (error) {
    console.error('Error submitting complaint:', error);
    showToast('Error', error.message, 'danger');
  }
}

// Save complaint to Firestore
async function saveComplaint(data) {
  try {
    await db.collection('complaints').add(data);
    showToast('Success', 'Complaint submitted successfully!');
    elements.complaintForm.reset();
    elements.imagePreview.classList.add('d-none');
    state.selectedFile = null;
    navigateTo('complaints');
  } catch (error) {
    throw error;
  }
}

// Handle image upload
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Error', 'Image size should be less than 2MB', 'danger');
    e.target.value = '';
    return;
  }
  
  state.selectedFile = file;
  const reader = new FileReader();
  reader.onload = event => {
    elements.previewImage.src = event.target.result;
    elements.imagePreview.classList.remove('d-none');
  };
  reader.readAsDataURL(file);
}

// Remove uploaded image
function removeUploadedImage() {
  state.selectedFile = null;
  elements.previewImage.src = '#';
  elements.imagePreview.classList.add('d-none');
  elements.complaintImage.value = '';
}

// Load complaints for student
async function loadComplaints(page = 1) {
  state.currentComplaintPage = page;
  
  try {
    const snapshot = await db.collection('complaints')
      .where('userId', '==', state.currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    const complaints = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toLocaleString()
    }));
    
    displayComplaints(complaints);
    setupPagination(complaints.length, 'pagination', state.currentComplaintPage, loadComplaints);
  } catch (error) {
    console.error('Error loading complaints:', error);
    showToast('Error', 'Failed to load complaints', 'danger');
  }
}

// Display complaints in table
function displayComplaints(complaints) {
  const tableBody = document.getElementById('complaints-table');
  if (complaints.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No complaints found</td></tr>';
    return;
  }
  
  // Calculate start and end index for pagination
  const startIdx = (state.currentComplaintPage - 1) * state.complaintsPerPage;
  const endIdx = Math.min(startIdx + state.complaintsPerPage, complaints.length);
  
  tableBody.innerHTML = complaints.slice(startIdx, endIdx).map(complaint => `
    <tr class="complaint-card">
      <td>${complaint.id.substring(0, 6)}...</td>
      <td>${complaint.category}</td>
      <td>${complaint.description.substring(0, 50)}${complaint.description.length > 50 ? '...' : ''}</td>
      <td>${complaint.createdAt}</td>
      <td><span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary view-complaint" data-id="${complaint.id}">
          <i class="fas fa-eye"></i>
        </button>
        ${complaint.status === 'Pending' ? `
        <button class="btn btn-sm btn-outline-warning edit-complaint" data-id="${complaint.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-complaint" data-id="${complaint.id}">
          <i class="fas fa-trash"></i>
        </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
  
  // Add event listeners to action buttons
  addButtonEventListeners('.view-complaint', viewComplaint);
  addButtonEventListeners('.edit-complaint', editComplaint);
  addButtonEventListeners('.delete-complaint', deleteComplaint);
}

// Helper function to add event listeners to buttons
function addButtonEventListeners(selector, handler) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => handler(btn.dataset.id));
  });
}

// View complaint details
async function viewComplaint(id) {
  try {
    const doc = await db.collection('complaints').doc(id).get();
    if (!doc.exists) return;
    
    const complaint = doc.data();
    const imageHtml = complaint.imageUrl ? `
      <div class="mb-3">
        <h6>Image</h6>
        <img src="${complaint.imageUrl}" alt="Complaint Image" class="img-fluid rounded">
      </div>
    ` : '';
    
    const adminCommentHtml = (complaint.status !== 'Pending' && complaint.adminComment) ? `
      <div class="alert alert-info mt-3">
        <h6>Admin Response</h6>
        <p>${complaint.adminComment}</p>
      </div>
    ` : '';
    
    document.getElementById('complaintModalBody').innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Category:</strong> ${complaint.category}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span></p>
          <p><strong>Submitted:</strong> ${doc.data().createdAt.toDate().toLocaleString()}</p>
          <p><strong>Last Updated:</strong> ${doc.data().updatedAt.toDate().toLocaleString()}</p>
        </div>
        <div class="col-md-6">
          <h6>Description</h6>
          <p>${complaint.description}</p>
        </div>
      </div>
      ${imageHtml}
      ${adminCommentHtml}
    `;
    
    document.getElementById('complaintModalTitle').textContent = `Complaint #${id.substring(0, 6)}...`;
    elements.complaintModal.show();
  } catch (error) {
    console.error('Error viewing complaint:', error);
    showToast('Error', 'Failed to load complaint details', 'danger');
  }
}

// Edit complaint
async function editComplaint(id) {
  state.selectedComplaintId = id;
  
  try {
    const doc = await db.collection('complaints').doc(id).get();
    if (!doc.exists) return;
    
    const complaint = doc.data();
    document.getElementById('complaint-category').value = complaint.category;
    document.getElementById('complaint-description').value = complaint.description;
    
    if (complaint.imageUrl) {
      elements.previewImage.src = complaint.imageUrl;
      elements.imagePreview.classList.remove('d-none');
    }
    
    navigateTo('new-complaint');
  } catch (error) {
    console.error('Error loading complaint for edit:', error);
    showToast('Error', 'Failed to load complaint for editing', 'danger');
  }
}

// Delete complaint
async function deleteComplaint(id) {
  if (!confirm('Are you sure you want to delete this complaint?')) return;
  
  try {
    await db.collection('complaints').doc(id).delete();
    showToast('Success', 'Complaint deleted successfully!');
    loadComplaints(state.currentComplaintPage);
  } catch (error) {
    console.error('Error deleting complaint:', error);
    showToast('Error', 'Failed to delete complaint', 'danger');
  }
}

// Load admin complaints
async function loadAdminComplaints(page = 1) {
  state.currentAdminComplaintPage = page;
  
  const statusFilter = document.getElementById('filter-status').value;
  const categoryFilter = document.getElementById('filter-category').value;
  
  let query = db.collection('complaints').orderBy('createdAt', 'desc');
  
  // Apply filters
  if (statusFilter !== 'all') query = query.where('status', '==', statusFilter);
  if (categoryFilter !== 'all') query = query.where('category', '==', categoryFilter);
  
  try {
    const snapshot = await query.get();
    const complaints = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toLocaleString()
    }));
    
    displayAdminComplaints(complaints);
    setupPagination(complaints.length, 'admin-pagination', state.currentAdminComplaintPage, loadAdminComplaints);
  } catch (error) {
    console.error('Error loading admin complaints:', error);
    showToast('Error', 'Failed to load complaints', 'danger');
  }
}

// Display admin complaints
function displayAdminComplaints(complaints) {
  const tableBody = document.getElementById('admin-complaints-table');
  if (complaints.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No complaints found</td></tr>';
    return;
  }
  
  // Calculate start and end index for pagination
  const startIdx = (state.currentAdminComplaintPage - 1) * state.complaintsPerPage;
  const endIdx = Math.min(startIdx + state.complaintsPerPage, complaints.length);
  
  tableBody.innerHTML = complaints.slice(startIdx, endIdx).map(complaint => `
    <tr class="complaint-card">
      <td>${complaint.id.substring(0, 6)}...</td>
      <td>${complaint.userEmail}</td>
      <td>${complaint.category}</td>
      <td>${complaint.description.substring(0, 50)}${complaint.description.length > 50 ? '...' : ''}</td>
      <td>${complaint.createdAt}</td>
      <td><span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary view-admin-complaint" data-id="${complaint.id}">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-success manage-complaint" data-id="${complaint.id}">
          <i class="fas fa-cog"></i>
        </button>
      </td>
    </tr>
  `).join('');
  
  addButtonEventListeners('.view-admin-complaint', viewAdminComplaint);
  addButtonEventListeners('.manage-complaint', manageComplaint);
}

// View complaint as admin
async function viewAdminComplaint(id) {
  try {
    const doc = await db.collection('complaints').doc(id).get();
    if (!doc.exists) return;
    
    const complaint = doc.data();
    const imageHtml = complaint.imageUrl ? `
      <div class="mb-3">
        <h6>Image</h6>
        <img src="${complaint.imageUrl}" alt="Complaint Image" class="img-fluid rounded">
      </div>
    ` : '';
    
    document.getElementById('complaintModalBody').innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Student Email:</strong> ${complaint.userEmail}</p>
          <p><strong>Category:</strong> ${complaint.category}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span></p>
          <p><strong>Submitted:</strong> ${doc.data().createdAt.toDate().toLocaleString()}</p>
          <p><strong>Last Updated:</strong> ${doc.data().updatedAt.toDate().toLocaleString()}</p>
        </div>
        <div class="col-md-6">
          <h6>Description</h6>
          <p>${complaint.description}</p>
        </div>
      </div>
      ${imageHtml}
    `;
    
    document.getElementById('complaintModalTitle').textContent = `Complaint #${id.substring(0, 6)}...`;
    elements.complaintModal.show();
  } catch (error) {
    console.error('Error viewing complaint:', error);
    showToast('Error', 'Failed to load complaint details', 'danger');
  }
}

// Manage complaint (admin)
async function manageComplaint(id) {
  state.selectedComplaintId = id;
  
  try {
    const doc = await db.collection('complaints').doc(id).get();
    if (!doc.exists) return;
    
    const complaint = doc.data();
    const imageHtml = complaint.imageUrl ? `
      <div class="mb-3">
        <label class="form-label">Image</label>
        <img src="${complaint.imageUrl}" alt="Complaint Image" class="img-fluid rounded">
      </div>
    ` : '';
    
    document.getElementById('adminComplaintModalBody').innerHTML = `
      <div class="mb-3">
        <label class="form-label">Status</label>
        <select class="form-select" id="admin-status">
          <option value="Pending" ${complaint.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Admin Comment</label>
        <textarea class="form-control" id="admin-comment" rows="3">${complaint.adminComment || ''}</textarea>
      </div>
      <div class="mb-3">
        <label class="form-label">Submitted By</label>
        <input type="text" class="form-control" value="${complaint.userEmail}" readonly>
      </div>
      <div class="mb-3">
        <label class="form-label">Category</label>
        <input type="text" class="form-control" value="${complaint.category}" readonly>
      </div>
      <div class="mb-3">
        <label class="form-label">Description</label>
        <textarea class="form-control" rows="3" readonly>${complaint.description}</textarea>
      </div>
      ${imageHtml}
    `;
    
    elements.adminComplaintModal.show();
  } catch (error) {
    console.error('Error loading complaint for management:', error);
    showToast('Error', 'Failed to load complaint for management', 'danger');
  }
}

// Save complaint status (admin)
async function saveComplaintStatus() {
  const status = document.getElementById('admin-status').value;
  const comment = document.getElementById('admin-comment').value;
  
  try {
    await db.collection('complaints').doc(state.selectedComplaintId).update({
      status,
      adminComment: comment,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast('Success', 'Complaint updated successfully!');
    elements.adminComplaintModal.hide();
    loadAdminComplaints(state.currentAdminComplaintPage);
    loadAdminStats();
  } catch (error) {
    console.error('Error updating complaint:', error);
    showToast('Error', 'Failed to update complaint', 'danger');
  }
}

// Load admin stats
async function loadAdminStats() {
  try {
    const [allSnap, pendingSnap, inProgressSnap, resolvedSnap] = await Promise.all([
      db.collection('complaints').get(),
      db.collection('complaints').where('status', '==', 'Pending').get(),
      db.collection('complaints').where('status', '==', 'In Progress').get(),
      db.collection('complaints').where('status', '==', 'Resolved').get()
    ]);
    
    document.getElementById('total-complaints').textContent = allSnap.size;
    document.getElementById('pending-complaints').textContent = pendingSnap.size;
    document.getElementById('inprogress-complaints').textContent = inProgressSnap.size;
    document.getElementById('resolved-complaints').textContent = resolvedSnap.size;
    
    loadCategoryChart(allSnap);
    loadStatusChart(allSnap);
  } catch (error) {
    console.error('Error loading admin stats:', error);
    showToast('Error', 'Failed to load dashboard statistics', 'danger');
  }
}

// Load category chart
function loadCategoryChart(snapshot) {
  const categories = {
    'Hostel': 0, 'Mess': 0, 'Wi-Fi': 0, 'Washroom': 0,
    'Electricity': 0, 'Water': 0, 'Other': 0
  };
  
  snapshot.forEach(doc => {
    const category = doc.data().category;
    if (categories.hasOwnProperty(category)) categories[category]++;
  });
  
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  // Destroy previous chart if exists
  if (state.categoryChart) state.categoryChart.destroy();
  
  state.categoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        label: 'Complaints by Category',
        data: Object.values(categories),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

// Load status chart
function loadStatusChart(snapshot) {
  const statuses = { 'Pending': 0, 'In Progress': 0, 'Resolved': 0 };
  
  snapshot.forEach(doc => {
    const status = doc.data().status;
    if (statuses.hasOwnProperty(status)) statuses[status]++;
  });
  
  const ctx = document.getElementById('statusChart').getContext('2d');
  
  // Destroy previous chart if exists
  if (state.statusChart) state.statusChart.destroy();
  
  state.statusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(statuses),
      datasets: [{
        label: 'Complaints by Status',
        data: Object.values(statuses),
        backgroundColor: [
          'rgba(255, 206, 86, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: { responsive: true }
  });
}

// Load quick stats for student dashboard
async function loadQuickStats() {
  if (!state.currentUser) return;
  
  try {
    const snapshot = await db.collection('complaints')
      .where('userId', '==', state.currentUser.uid)
      .get();
    
    const total = snapshot.size;
    const pending = snapshot.docs.filter(doc => doc.data().status === 'Pending').length;
    const inProgress = snapshot.docs.filter(doc => doc.data().status === 'In Progress').length;
    const resolved = snapshot.docs.filter(doc => doc.data().status === 'Resolved').length;
    
    document.getElementById('quick-stats').innerHTML = `
      <div>Total Complaints: ${total}</div>
      <div>Pending: ${pending}</div>
      <div>In Progress: ${inProgress}</div>
      <div>Resolved: ${resolved}</div>
    `;
  } catch (error) {
    console.error('Error loading quick stats:', error);
  }
}

// Load recent activity for student dashboard
async function loadRecentActivity() {
  if (!state.currentUser) return;
  
  try {
    const snapshot = await db.collection('complaints')
      .where('userId', '==', state.currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();
    
    const activityList = document.getElementById('recent-activity');
    if (snapshot.empty) {
      activityList.innerHTML = '<div class="text-muted">No recent activity</div>';
      return;
    }
    
    activityList.innerHTML = snapshot.docs.map(doc => {
      const complaint = doc.data();
      return `
        <div class="mb-2">
          <div class="d-flex justify-content-between">
            <strong>${complaint.category}</strong>
            <span class="badge bg-${getStatusBadgeColor(complaint.status)}">
              ${complaint.status}
            </span>
          </div>
          <div class="text-muted small">${doc.data().createdAt.toDate().toLocaleString()}</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading recent activity:', error);
  }
}

// Get badge color based on status
function getStatusBadgeColor(status) {
  switch (status) {
    case 'Pending': return 'warning';
    case 'In Progress': return 'info';
    case 'Resolved': return 'success';
    default: return 'secondary';
  }
}

// Setup pagination
function setupPagination(totalItems, paginationId, currentPage, callback) {
  const pagination = document.getElementById(paginationId);
  const totalPages = Math.ceil(totalItems / state.complaintsPerPage);
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  pagination.innerHTML = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#">&laquo;</a>
    </li>
    ${Array.from({ length: totalPages }, (_, i) => `
      <li class="page-item ${i + 1 === currentPage ? 'active' : ''}">
        <a class="page-link" href="#">${i + 1}</a>
      </li>
    `).join('')}
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#">&raquo;</a>
    </li>
  `;
  
  // Add event listeners
  pagination.querySelectorAll('.page-link').forEach((link, index) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      if (index === 0 && currentPage > 1) {
        callback(currentPage - 1);
      } else if (index === totalPages + 1 && currentPage < totalPages) {
        callback(currentPage + 1);
      } else if (index > 0 && index <= totalPages) {
        callback(index);
      }
    });
  });
}

// Show toast notification
function showToast(title, message, type = 'success') {
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  // Set background color based on type
  const toastHeader = elements.toastEl.querySelector('.toast-header');
  const colors = {
    success: 'var(--success-color)',
    error: 'var(--danger-color)',
    danger: 'var(--danger-color)',
    warning: 'var(--warning-color)',
    default: 'var(--primary-color)'
  };
  
  toastHeader.style.backgroundColor = colors[type] || colors.default;
  toastHeader.style.color = type === 'warning' ? 'black' : 'white';
  
  elements.toast.show();
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);