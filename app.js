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
    // Ordenar animales por número de placa (orden natural alfanumérico)
    currentAnimals.sort((a, b) => a.tagNumber.localeCompare(b.tagNumber, undefined, { numeric: true, sensitivity: 'base' }));
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

    renderCalendar();
    renderReminders();
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
        const nextAppt = t.nextAppointment ? t.nextAppointment : '-';
        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.tagNumber}</td>
            <td><button class="btn-icon view-treatment-btn" data-id="${t.id}" title="Previsualizar"><i data-lucide="eye"></i></button></td>
            <td>${t.diagnosis}</td>
            <td>${t.vetName || '-'}</td>
            <td>${nextAppt}</td>
            <td class="actions">
                <button class="btn-icon" onclick="editTreatment(${t.id})" title="Editar"><i data-lucide="edit-2"></i></button>
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
    document.getElementById('t_nextAppointment').value = '';
    document.getElementById('treatmentModalTitle').innerText = 'Registrar Tratamiento';
    
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

async function editTreatment(id) {
    const treatment = currentTreatments.find(t => t.id === Number(id));
    if (!treatment) return;

    openTreatmentModal();

    document.getElementById('treatmentId').value = treatment.id;
    document.getElementById('treatmentModalTitle').innerText = 'Editar Tratamiento';
    document.getElementById('t_animalId').value = treatment.animalId;
    autoFillAnimalData();

    document.getElementById('t_date').value = treatment.date;
    document.getElementById('t_diagnosis').value = treatment.diagnosis;
    document.getElementById('t_treatment').value = treatment.treatmentText;
    document.getElementById('t_vetName').value = treatment.vetName || '';
    document.getElementById('t_vetContact').value = treatment.vetContact || '';
    document.getElementById('t_nextAppointment').value = treatment.nextAppointment || '';
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
    
    const id = document.getElementById('treatmentId').value;
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
        nextAppointment: document.getElementById('t_nextAppointment').value || null,
        appointmentStatus: null,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        treatment.id = Number(id);
        const existing = currentTreatments.find(t => t.id === treatment.id);
        treatment.createdAt = existing ? existing.createdAt : new Date().toISOString();
        if (existing && existing.nextAppointment === treatment.nextAppointment) {
            treatment.appointmentStatus = existing.appointmentStatus || null;
        } else {
            treatment.appointmentStatus = null;
        }
        await updateTreatment(treatment);
    } else {
        treatment.createdAt = new Date().toISOString();
        await addTreatment(treatment);
    }

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
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');

    reader.onload = async function(event) {
        try {
            if (isXlsx) {
                // Parse XLSX using the loaded SheetJS library
                const wb = XLSX.read(event.target.result, { type: 'array' });
                
                // Prefer sheets named "Animals" and "Treatments", fallback to first two sheets
                const animalsSheet = wb.Sheets['Animals'] || wb.Sheets[wb.SheetNames[0]];
                const treatmentsSheet = wb.Sheets['Treatments'] || wb.Sheets[wb.SheetNames[1]] || null;

                const animals = animalsSheet ? XLSX.utils.sheet_to_json(animalsSheet) : [];
                const treatments = treatmentsSheet ? XLSX.utils.sheet_to_json(treatmentsSheet) : [];

                await importDatabase({ animals, treatments });
            } else {
                // JSON backup
                await importDatabase(event.target.result);
            }
            alert("Datos importados exitosamente.");
            await loadData();
        } catch (err) {
            alert(err.message);
        }
        e.target.value = ''; // reset
    };

    if (isXlsx) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
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

    // Default to PDF + completo when opening
    const formatSelect = document.getElementById('exportFormat');
    const completoRadio = document.querySelector('input[name="reportType"][value="completo"]');
    if (completoRadio) completoRadio.checked = true;

    // Attach visibility listeners (safe to call multiple times)
    if (formatSelect) {
        formatSelect.onchange = updateExportOptionsVisibility;
    }

    const radios = document.querySelectorAll('input[name="reportType"]');
    radios.forEach(r => {
        r.onchange = updateExportOptionsVisibility;
    });

    updateExportOptionsVisibility();
}

function closeExportModal() {
    exportModal.classList.remove('active');
}

function updateExportOptionsVisibility() {
    const format = document.getElementById('exportFormat').value;
    const reportGroup = document.getElementById('reportTypeGroup');
    const compactDiv = document.getElementById('compactOptions');

    const showReportOptions = format === 'pdf' || format === 'xlsx';
    reportGroup.style.display = showReportOptions ? 'block' : 'none';

    const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'completo';
    const showCompact = showReportOptions && reportType === 'compacto';

    compactDiv.style.display = showCompact ? 'block' : 'none';
}

async function executeExport() {
    const format = document.getElementById('exportFormat').value;

    let exportOptions = {
        reportType: 'completo'
    };

    if (format === 'pdf' || format === 'xlsx') {
        const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'completo';
        exportOptions.reportType = reportType;

        if (reportType === 'compacto') {
            const animalFields = Array.from(
                document.querySelectorAll('.compact-field[data-section="animal"]:checked')
            ).map(cb => cb.value);

            const treatmentFields = Array.from(
                document.querySelectorAll('.compact-field[data-section="treatment"]:checked')
            ).map(cb => cb.value);

            exportOptions.animalFields = animalFields;
            exportOptions.treatmentFields = treatmentFields;
        }
    }

    try {
        await exportDatabase(format, exportOptions);
        closeExportModal();
    } catch (err) {
        alert("Error exportando datos: " + err.message);
    }
}

// =============================================
// Backup Modal Logic (Respaldar base de datos)
// =============================================

const backupModal = document.getElementById('backupModal');

function openBackupModal() {
    backupModal.classList.add('active');
    lucide.createIcons();
}

function closeBackupModal() {
    backupModal.classList.remove('active');
}

async function executeBackup() {
    const selected = document.querySelector('input[name="backupType"]:checked')?.value || 'local';

    closeBackupModal();

    if (selected === 'local') {
        await saveBackupToFolder();
    } else if (selected === 'cloud') {
        // Función experimental - aún no implementada
        alert("Función experimental: Exportar a la nube aún no está disponible.\n\nEsta opción se habilitará en futuras actualizaciones.");
    }
}

async function saveBackupToFolder() {
    // Check if the modern File System Access API is available
    if (!window.showDirectoryPicker) {
        alert("Tu navegador no soporta guardar directamente en carpetas.\nSe descargará el archivo en la carpeta de Descargas.");
        await exportDatabase('json');
        return;
    }

    try {
        // Let the user choose the destination folder (they can pick the program's folder)
        const dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents' // Suggests a starting location (user can navigate to the app folder)
        });

        // Get fresh data from IndexedDB
        const animals = await getAllAnimals();
        const treatments = await getAllTreatments();

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `ganado_backup_${dateStr}.json`;

        const exportData = { animals, treatments };
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create or overwrite the file in the chosen folder
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        alert(`✅ Respaldo guardado exitosamente:\n\nCarpeta: ${dirHandle.name}\nArchivo: ${filename}`);

    } catch (err) {
        if (err.name === 'AbortError') {
            // User cancelled the folder picker - do nothing
            return;
        }
        console.error(err);
        alert("Error al guardar el respaldo: " + err.message);
    }
}

// =============================================
// Calendar & Reminders Logic
// =============================================

let calendarDate = new Date(); // tracks the displayed month/year

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('prev-month').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('next-month').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });
});

function getDateAppointmentStatus(dateStr) {
    const relevant = currentTreatments.filter(t => t.nextAppointment === dateStr);
    if (relevant.length === 0) return null;

    const hasFulfilled = relevant.some(t => t.appointmentStatus === 'fulfilled');
    if (hasFulfilled) return 'fulfilled';

    const hasMissed = relevant.some(t => t.appointmentStatus === 'missed');
    if (hasMissed) return 'missed';

    return 'pending';
}

function getAppointmentsForDate(dateStr) {
    return currentTreatments.filter(t => t.nextAppointment === dateStr);
}

function showCalendarDayTooltip(dayElement) {
    const dateStr = dayElement.dataset.date;
    if (!dateStr) return;

    const appts = getAppointmentsForDate(dateStr);
    if (!appts.length) return;

    const tooltip = document.getElementById('calendar-tooltip');
    if (!tooltip) return;

    const [y, mo, d] = dateStr.split('-');
    const monthShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const formatted = `${parseInt(d)} ${monthShort[parseInt(mo)-1]} ${y}`;

    let html = `<strong>${formatted}</strong>`;

    html += `<div style="margin-top: 0.2rem; font-size: 0.75rem;">`;
    const maxShow = 3;
    appts.slice(0, maxShow).forEach(t => {
        const animal = currentAnimals.find(a => a.id === t.animalId);
        const animalLabel = animal && animal.name ? `${t.tagNumber} (${animal.name})` : t.tagNumber;
        const shortDiag = t.diagnosis ? (t.diagnosis.length > 32 ? t.diagnosis.substring(0, 29) + '...' : t.diagnosis) : '';
        html += `• ${animalLabel} — ${shortDiag}<br>`;
    });
    if (appts.length > maxShow) {
        html += `+ ${appts.length - maxShow} más`;
    }
    html += `</div>`;

    tooltip.innerHTML = html;

    // Position the tooltip below the day cell, relative to the calendar-widget
    const widget = dayElement.closest('.calendar-widget');
    if (!widget) return;

    const cellRect = dayElement.getBoundingClientRect();
    const widgetRect = widget.getBoundingClientRect();

    const tooltipWidth = 230;
    let left = cellRect.left - widgetRect.left + (cellRect.width / 2) - (tooltipWidth / 2);
    let top = cellRect.bottom - widgetRect.top + 8;

    // Keep inside the widget bounds
    if (left < 8) left = 8;
    if (left + tooltipWidth > widgetRect.width - 8) {
        left = widgetRect.width - tooltipWidth - 8;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
}

function hideCalendarDayTooltip() {
    const tooltip = document.getElementById('calendar-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

function renderCalendar() {
    hideCalendarDayTooltip();

    const container = document.getElementById('calendar-days-container');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!container || !monthYearLabel) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    monthYearLabel.textContent = `${monthNames[month]} ${year}`;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // First day of month (0=Sun, 6=Sat)
    const firstDay = new Date(year, month, 1).getDay();
    // Total days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    container.innerHTML = '';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.classList.add('calendar-day', 'empty');
        container.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cell = document.createElement('div');
        cell.classList.add('calendar-day');
        cell.textContent = d;

        if (dateStr === todayStr) cell.classList.add('today');

        const status = getDateAppointmentStatus(dateStr);
        if (status) {
            cell.classList.add('has-appointment', `appointment-${status}`);
            cell.dataset.date = dateStr;
        }

        container.appendChild(cell);
    }

    // Attach hover tooltips to days that have appointments
    const daysWithAppointments = container.querySelectorAll('.calendar-day[data-date]');
    daysWithAppointments.forEach(day => {
        day.addEventListener('mouseenter', () => showCalendarDayTooltip(day));
        day.addEventListener('mouseleave', hideCalendarDayTooltip);
    });

    lucide.createIcons();
}

function renderReminders() {
    const container = document.getElementById('reminders-list-container');
    if (!container) return;

    // Collect all treatments with a nextAppointment that are not yet marked as fulfilled/missed
    const reminders = currentTreatments
        .filter(t => t.nextAppointment && !t.appointmentStatus)
        .map(t => {
            const animal = currentAnimals.find(a => a.id === t.animalId);
            return { ...t, animalName: animal ? animal.name : null };
        })
        .sort((a, b) => new Date(a.nextAppointment) - new Date(b.nextAppointment));

    container.innerHTML = '';

    if (reminders.length === 0) {
        container.innerHTML = `
            <div class="no-reminders">
                <i data-lucide="calendar-check" style="width:36px;height:36px;color:var(--text-secondary);opacity:0.5;"></i>
                <span>Sin citas programadas</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    reminders.forEach(t => {
        const apptDate = new Date(t.nextAppointment + 'T00:00:00');
        const diffDays = Math.round((apptDate - today) / (1000 * 60 * 60 * 24));

        let urgencyColor = '#60a5fa'; // default blue
        let urgencyLabel = '';
        if (diffDays < 0) {
            urgencyColor = '#ef4444'; // overdue - red
            urgencyLabel = ` · <span style="color:#ef4444;font-weight:600;">Vencida (hace ${Math.abs(diffDays)} día${Math.abs(diffDays)!==1?'s':''})</span>`;
        } else if (diffDays === 0) {
            urgencyColor = '#f59e0b'; // today - amber
            urgencyLabel = ` · <span style="color:#f59e0b;font-weight:600;">Hoy</span>`;
        } else if (diffDays <= 7) {
            urgencyColor = '#f59e0b'; // soon - amber
            urgencyLabel = ` · <span style="color:#f59e0b;font-weight:600;">En ${diffDays} día${diffDays!==1?'s':''}</span>`;
        } else {
            urgencyLabel = ` · <span style="color:var(--text-secondary);">En ${diffDays} días</span>`;
        }

        // Format date nicely
        const [y, mo, day] = t.nextAppointment.split('-');
        const monthNamesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const formattedDate = `${parseInt(day)} ${monthNamesShort[parseInt(mo)-1]} ${y}`;

        const animalLabel = t.animalName ? `${t.tagNumber} <span style="color:var(--text-secondary);">(${t.animalName})</span>` : t.tagNumber;

        let statusHTML = '';
        if (diffDays < 0) {
            // Past unmarked appointment: show action tickets to mark outcome
            statusHTML = `
                <div class="reminder-ticket">
                    <span class="ticket-label vencida">Vencida</span>
                    <button class="ticket-btn fulfilled" data-id="${t.id}">✅ Cumplida</button>
                    <button class="ticket-btn missed" data-id="${t.id}">❌ No cumplida</button>
                </div>
            `;
        } else {
            // Future or today: show pending ticket
            statusHTML = `
                <div class="reminder-ticket">
                    <span class="ticket-label pending">Pendiente</span>
                </div>
            `;
        }

        const item = document.createElement('div');
        item.classList.add('reminder-item');
        item.innerHTML = `
            <div class="reminder-date" style="color:${urgencyColor};">
                <i data-lucide="calendar"></i>
                ${formattedDate}${urgencyLabel}
            </div>
            <div class="reminder-details">
                🐄 Placa: ${animalLabel}
            </div>
            <div class="reminder-meta">
                <i data-lucide="stethoscope" style="width:12px;height:12px;"></i>
                ${t.diagnosis}${t.vetName ? ` · ${t.vetName}` : ''}
            </div>
            ${statusHTML}
        `;
        container.appendChild(item);

        if (diffDays < 0) {
            item.classList.add('overdue');
        }

        // Wire up click handlers for the ticket buttons (only for past dates)
        if (diffDays < 0) {
            const fBtn = item.querySelector('.ticket-btn.fulfilled');
            const mBtn = item.querySelector('.ticket-btn.missed');
            if (fBtn) fBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAppointmentStatus(t.id, 'fulfilled');
            });
            if (mBtn) mBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAppointmentStatus(t.id, 'missed');
            });
        }
    });

    lucide.createIcons();
}

// Mark appointment status from reminders (fulfilled or missed)
async function markAppointmentStatus(id, status) {
    const treatment = currentTreatments.find(t => t.id === id);
    if (!treatment) return;
    treatment.appointmentStatus = status;
    await updateTreatment(treatment);
    await loadData();
}
