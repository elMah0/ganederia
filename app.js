// Initialize Icons
lucide.createIcons();

let currentAnimals = [];
let currentTreatments = [];

// Navigation
const navDashboard = document.getElementById('nav-dashboard');
const navAnimals = document.getElementById('nav-animals');
const navTreatments = document.getElementById('nav-treatments');
const secDashboard = document.getElementById('section-dashboard');
const secAnimals = document.getElementById('section-animals');
const secTreatments = document.getElementById('section-treatments');

navDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    navDashboard.classList.add('active');
    navAnimals.classList.remove('active');
    navTreatments.classList.remove('active');
    secDashboard.classList.remove('hidden');
    secAnimals.classList.add('hidden');
    secTreatments.classList.add('hidden');
    updateDashboard();
});

navAnimals.addEventListener('click', (e) => {
    e.preventDefault();
    navAnimals.classList.add('active');
    navDashboard.classList.remove('active');
    navTreatments.classList.remove('active');
    secAnimals.classList.remove('hidden');
    secDashboard.classList.add('hidden');
    secTreatments.classList.add('hidden');
    renderTable();
});

navTreatments.addEventListener('click', (e) => {
    e.preventDefault();
    navTreatments.classList.add('active');
    navDashboard.classList.remove('active');
    navAnimals.classList.remove('active');
    secTreatments.classList.remove('hidden');
    secDashboard.classList.add('hidden');
    secAnimals.classList.add('hidden');
    renderTreatmentsTable();
});

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        await loadData();
    } catch (e) {
        alert("Error inicializando la base de datos.");
    }
});

async function loadData() {
    currentAnimals = await getAllAnimals();
    currentTreatments = await getAllTreatments();
    updateDashboard();
    renderTable();
    if (!secTreatments.classList.contains('hidden')) {
        renderTreatmentsTable();
    }
}

function updateDashboard() {
    document.getElementById('stat-total').innerText = currentAnimals.length;
    
    const validWeights = currentAnimals.filter(a => a.weightKg).map(a => Number(a.weightKg));
    const avgWeight = validWeights.length > 0 ? (validWeights.reduce((a,b)=>a+b,0) / validWeights.length).toFixed(1) : 0;
    document.getElementById('stat-weight').innerText = avgWeight;

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const addedThisMonth = currentAnimals.filter(a => {
        const d = new Date(a.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    document.getElementById('stat-month').innerText = addedThisMonth;
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    const filtered = currentAnimals.filter(a => 
        a.tagNumber.toLowerCase().includes(query) || 
        (a.name && a.name.toLowerCase().includes(query))
    );

    filtered.forEach(animal => {
        const tr = document.createElement('tr');
        
        // Image
        const imgTd = document.createElement('td');
        if (animal.image) {
            imgTd.innerHTML = `<img src="${animal.image}" class="table-avatar">`;
        } else {
            imgTd.innerHTML = `<div class="table-avatar" style="display:flex; align-items:center; justify-content:center"><i data-lucide="beef" style="width:20px; color:var(--text-secondary)"></i></div>`;
        }

        // Age logic
        let ageStr = '-';
        if (animal.birthDate) {
            ageStr = `${animal.birthDate} (${animal.ageMonths}m)`;
        } else if (animal.ageMonths) {
            ageStr = `${animal.ageMonths} meses (aprox)`;
        }

        tr.innerHTML += `
            <td><button class="btn-icon view-btn" data-id="${animal.id}" title="Previsualizar"><i data-lucide="eye"></i></button></td>
            <td>${animal.tagNumber}</td>
            <td>${animal.name || '-'}</td>
            <td>${animal.breed || '-'}</td>
            <td>${ageStr}</td>
            <td>${animal.weightKg || '-'}</td>
            <td class="actions">
                <button class="btn-icon" onclick="editAnimal(${animal.id})" title="Editar"><i data-lucide="edit-2"></i></button>
                <button class="btn-icon delete" onclick="removeAnimal(${animal.id})" title="Eliminar"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tr.insertBefore(imgTd, tr.firstChild);
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Treatments Rendering
function renderTreatmentsTable() {
    const tbody = document.getElementById('treatments-table-body');
    const query = document.getElementById('searchTreatmentInput').value.toLowerCase();
    
    tbody.innerHTML = '';
    
    const filtered = currentTreatments.filter(t => 
        t.tagNumber.toLowerCase().includes(query) || 
        (t.diagnosis && t.diagnosis.toLowerCase().includes(query))
    );

    // Sort by date desc
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.tagNumber}</td>
            <td>${t.diagnosis}</td>
            <td>${t.vetName || '-'}</td>
            <td class="actions">
                <button class="btn-icon view-treatment-btn" data-id="${t.id}" title="Previsualizar"><i data-lucide="eye"></i></button>
                <button class="btn-icon delete" onclick="removeTreatment(${t.id})" title="Eliminar"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Form & Modal Logic
const modal = document.getElementById('animalModal');
const form = document.getElementById('animalForm');
const imgPreview = document.getElementById('imagePreview');
const imgDataInput = document.getElementById('imageDataUrl');

function openModal() {
    form.reset();
    document.getElementById('animalId').value = '';
    imgDataInput.value = '';
    imgPreview.innerHTML = '<i data-lucide="camera"></i>';
    imgPreview.style.backgroundImage = 'none';
    document.getElementById('modalTitle').innerText = 'Registrar Animal';
    modal.classList.add('active');
    lucide.createIcons();
}

function closeModal() {
    modal.classList.remove('active');
}

async function editAnimal(id) {
    const animal = await getAnimal(id);
    if (!animal) return;

    document.getElementById('modalTitle').innerText = 'Editar Animal';
    document.getElementById('animalId').value = animal.id;
    document.getElementById('tagNumber').value = animal.tagNumber;
    document.getElementById('name').value = animal.name || '';
    document.getElementById('birthDate').value = animal.birthDate || '';
    document.getElementById('ageMonths').value = animal.ageMonths || '';
    document.getElementById('acquisitionDate').value = animal.acquisitionDate || '';
    document.getElementById('breed').value = animal.breed || '';
    document.getElementById('motherTag').value = animal.motherTag || '';
    document.getElementById('fatherTag').value = animal.fatherTag || '';
    document.getElementById('weightKg').value = animal.weightKg || '';

    if (animal.image) {
        imgDataInput.value = animal.image;
        imgPreview.style.backgroundImage = `url(${animal.image})`;
        imgPreview.innerHTML = '';
    } else {
        imgDataInput.value = '';
        imgPreview.style.backgroundImage = 'none';
        imgPreview.innerHTML = '<i data-lucide="camera"></i>';
        lucide.createIcons();
    }

    modal.classList.add('active');
}

async function removeAnimal(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este animal?')) {
        await deleteAnimal(id);
        await loadData();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('animalId').value;
    const tagNumber = document.getElementById('tagNumber').value.trim();
    
    // Check uniqueness
    const isUnique = await checkTagUnique(tagNumber, id);
    if (!isUnique) {
        alert("El N° de placa ya está registrado.");
        return;
    }

    const animal = {
        tagNumber,
        name: document.getElementById('name').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        ageMonths: parseInt(document.getElementById('ageMonths').value) || null,
        acquisitionDate: document.getElementById('acquisitionDate').value,
        breed: document.getElementById('breed').value.trim(),
        motherTag: document.getElementById('motherTag').value.trim(),
        fatherTag: document.getElementById('fatherTag').value.trim(),
        weightKg: parseFloat(document.getElementById('weightKg').value) || null,
        image: document.getElementById('imageDataUrl').value || null,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        animal.id = Number(id);
        // keep original createdAt if possible, but we don't fetch it here for simplicity
        // ideally fetch existing and merge.
        const existing = await getAnimal(animal.id);
        animal.createdAt = existing.createdAt;
        await updateAnimal(animal);
    } else {
        animal.createdAt = new Date().toISOString();
        await addAnimal(animal);
    }

    closeModal();
    await loadData();
}

// Treatments Form & Logic
const treatmentModal = document.getElementById('treatmentModal');
const treatmentForm = document.getElementById('treatmentForm');

function openTreatmentModal() {
    treatmentForm.reset();
    document.getElementById('treatmentId').value = '';
    document.getElementById('t_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('t_animalName').value = '';
    document.getElementById('t_animalAge').value = '';
    
    // Populate select
    const select = document.getElementById('t_animalId');
    select.innerHTML = '<option value="">-- Seleccione un animal --</option>';
    currentAnimals.forEach(a => {
        const option = document.createElement('option');
        option.value = a.id;
        option.innerText = a.tagNumber + (a.name ? ` (${a.name})` : '');
        select.appendChild(option);
    });

    treatmentModal.classList.add('active');
    lucide.createIcons();
}

function closeTreatmentModal() {
    treatmentModal.classList.remove('active');
}

function autoFillAnimalData() {
    const id = document.getElementById('t_animalId').value;
    const animal = currentAnimals.find(a => a.id === Number(id));
    if (animal) {
        document.getElementById('t_animalName').value = animal.name || 'Sin nombre';
        let ageStr = animal.birthDate ? `${animal.birthDate} (${animal.ageMonths}m)` : (animal.ageMonths ? `${animal.ageMonths}m` : '-');
        document.getElementById('t_animalAge').value = ageStr;
    } else {
        document.getElementById('t_animalName').value = '';
        document.getElementById('t_animalAge').value = '';
    }
}

async function handleTreatmentSubmit(e) {
    e.preventDefault();
    
    const animalId = document.getElementById('t_animalId').value;
    const animal = currentAnimals.find(a => a.id === Number(animalId));
    if (!animal) return;

    const treatment = {
        animalId: Number(animalId),
        tagNumber: animal.tagNumber,
        date: document.getElementById('t_date').value,
        diagnosis: document.getElementById('t_diagnosis').value.trim(),
        treatmentText: document.getElementById('t_treatment').value.trim(),
        vetName: document.getElementById('t_vetName').value.trim(),
        vetContact: document.getElementById('t_vetContact').value.trim(),
        createdAt: new Date().toISOString()
    };

    await addTreatment(treatment);
    closeTreatmentModal();
    await loadData();
}

async function removeTreatment(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este tratamiento?')) {
        await deleteTreatment(id);
        await loadData();
    }
}

// Age Calculation
function calculateAge() {
    const birthStr = document.getElementById('birthDate').value;
    if (birthStr) {
        const birth = new Date(birthStr);
        const now = new Date();
        let months = (now.getFullYear() - birth.getFullYear()) * 12;
        months -= birth.getMonth();
        months += now.getMonth();
        if (months < 0) months = 0;
        document.getElementById('ageMonths').value = months;
    }
}

// Image Handling
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        // Resize image via canvas to save DB space
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            imgDataInput.value = dataUrl;
            imgPreview.style.backgroundImage = `url(${dataUrl})`;
            imgPreview.innerHTML = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Import handler
async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            await importDatabase(event.target.result);
            alert("Datos importados exitosamente.");
            await loadData();
        } catch (err) {
            alert(err.message);
        }
        e.target.value = ''; // reset
    };
    reader.readAsText(file);
}

// Tooltip Logic
document.getElementById('table-body').addEventListener('mouseover', (e) => {
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
        const id = Number(viewBtn.getAttribute('data-id'));
        const animal = currentAnimals.find(a => a.id === id);
        if (animal) showTooltip(animal, viewBtn);
    }
});

document.getElementById('table-body').addEventListener('mouseout', (e) => {
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
        hideTooltip();
    }
});

function showTooltip(animal, btnElement) {
    const tooltip = document.getElementById('animalTooltip');
    
    let imgHtml = animal.image ? `<img src="${animal.image}" class="tooltip-img">` : '';
    let ageStr = animal.birthDate ? `${animal.birthDate} (${animal.ageMonths}m)` : (animal.ageMonths ? `${animal.ageMonths}m` : '-');

    tooltip.innerHTML = `
        ${imgHtml}
        <div class="tooltip-info">
            <p>Placa: <span>${animal.tagNumber}</span></p>
            <p>Nombre: <span>${animal.name || '-'}</span></p>
            <p>Raza: <span>${animal.breed || '-'}</span></p>
            <p>Edad: <span>${ageStr}</span></p>
            <p>Peso: <span>${animal.weightKg ? animal.weightKg + ' Kg' : '-'}</span></p>
            <p>Adquisición: <span>${animal.acquisitionDate || '-'}</span></p>
            <p>Madre: <span>${animal.motherTag || '-'}</span></p>
            <p>Padre: <span>${animal.fatherTag || '-'}</span></p>
        </div>
    `;

    const btnRect = btnElement.getBoundingClientRect();
    const tooltipWidth = 250;
    
    // Position slightly left and above the button
    let top = btnRect.top + window.scrollY - 50;
    let left = btnRect.left + window.scrollX - tooltipWidth - 15;
    
    if (left < 10) left = btnRect.right + 15; // fallback to right side if not enough space

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    
    tooltip.classList.remove('hidden');
    setTimeout(() => tooltip.classList.add('visible'), 10);
}

function hideTooltip() {
    const tooltip = document.getElementById('animalTooltip');
    tooltip.classList.remove('visible');
    tooltip.classList.add('hidden');
}

// Treatment Tooltip Logic
document.getElementById('treatments-table-body').addEventListener('mouseover', (e) => {
    const viewBtn = e.target.closest('.view-treatment-btn');
    if (viewBtn) {
        const id = Number(viewBtn.getAttribute('data-id'));
        const treatment = currentTreatments.find(t => t.id === id);
        if (treatment) showTreatmentTooltip(treatment, viewBtn);
    }
});

document.getElementById('treatments-table-body').addEventListener('mouseout', (e) => {
    const viewBtn = e.target.closest('.view-treatment-btn');
    if (viewBtn) {
        hideTreatmentTooltip();
    }
});

function showTreatmentTooltip(treatment, btnElement) {
    const tooltip = document.getElementById('treatmentTooltip');
    
    const animal = currentAnimals.find(a => a.id === treatment.animalId);
    const animalName = animal && animal.name ? animal.name : '';
    const animalStr = animalName ? `${treatment.tagNumber} (${animalName})` : treatment.tagNumber;

    tooltip.innerHTML = `
        <div class="tooltip-info">
            <p style="text-align: center; font-weight: bold; font-size: 1rem; color: var(--accent); margin-bottom: 0.5rem; justify-content: center; display: block;">Historial Clínico</p>
            <p>Placa: <span>${animalStr}</span></p>
            <p>Fecha: <span>${treatment.date}</span></p>
            <p>Diagnóstico: <span style="text-align: right; max-width: 150px; white-space: normal;">${treatment.diagnosis}</span></p>
            <p style="margin-top: 0.5rem; margin-bottom: 0.25rem;">Tratamiento:</p>
            <div style="background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; color: var(--text-primary); margin-bottom: 0.5rem; white-space: pre-wrap;">${treatment.treatmentText}</div>
            <p>Veterinario: <span>${treatment.vetName || '-'}</span></p>
            <p>Contacto: <span>${treatment.vetContact || '-'}</span></p>
        </div>
    `;

    const btnRect = btnElement.getBoundingClientRect();
    const tooltipWidth = 260;
    
    let top = btnRect.top + window.scrollY - 50;
    let left = btnRect.left + window.scrollX - tooltipWidth - 15;
    
    if (left < 10) left = btnRect.right + 15;

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    
    tooltip.classList.remove('hidden');
    setTimeout(() => tooltip.classList.add('visible'), 10);
}

function hideTreatmentTooltip() {
    const tooltip = document.getElementById('treatmentTooltip');
    tooltip.classList.remove('visible');
    tooltip.classList.add('hidden');
}

// Export Modal Logic
const exportModal = document.getElementById('exportModal');

function openExportModal() {
    exportModal.classList.add('active');
    lucide.createIcons();
}

function closeExportModal() {
    exportModal.classList.remove('active');
}

async function executeExport() {
    const format = document.getElementById('exportFormat').value;
    try {
        await exportDatabase(format);
        closeExportModal();
    } catch (err) {
        alert("Error exportando datos: " + err.message);
    }
}
