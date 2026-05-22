const dbName = 'GanadoDB';
const dbVersion = 2;

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => {
            console.error("Error abriendo la base de datos", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('animals')) {
                const objectStore = db.createObjectStore('animals', { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('tagNumber', 'tagNumber', { unique: true });
            }
            if (!db.objectStoreNames.contains('treatments')) {
                const treatmentStore = db.createObjectStore('treatments', { keyPath: 'id', autoIncrement: true });
                treatmentStore.createIndex('animalId', 'animalId', { unique: false });
            }
        };
    });
}

function addAnimal(animal) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['animals'], 'readwrite');
        const objectStore = transaction.objectStore('animals');
        const request = objectStore.add(animal);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function updateAnimal(animal) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['animals'], 'readwrite');
        const objectStore = transaction.objectStore('animals');
        const request = objectStore.put(animal);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAnimal(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['animals'], 'readonly');
        const objectStore = transaction.objectStore('animals');
        const request = objectStore.get(Number(id));

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAllAnimals() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['animals'], 'readonly');
        const objectStore = transaction.objectStore('animals');
        const request = objectStore.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function deleteAnimal(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['animals'], 'readwrite');
        const objectStore = transaction.objectStore('animals');
        const request = objectStore.delete(Number(id));

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

function checkTagUnique(tagNumber, currentId = null) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['animals'], 'readonly');
        const objectStore = transaction.objectStore('animals');
        const index = objectStore.index('tagNumber');
        const request = index.get(tagNumber);

        request.onsuccess = (event) => {
            const result = event.target.result;
            if (result && result.id !== Number(currentId)) {
                resolve(false); // Not unique
            } else {
                resolve(true); // Unique
            }
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

// Treatments CRUD
function addTreatment(treatment) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['treatments'], 'readwrite');
        const objectStore = transaction.objectStore('treatments');
        const request = objectStore.add(treatment);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function updateTreatment(treatment) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['treatments'], 'readwrite');
        const objectStore = transaction.objectStore('treatments');
        const request = objectStore.put(treatment);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAllTreatments() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['treatments'], 'readonly');
        const objectStore = transaction.objectStore('treatments');
        const request = objectStore.getAll();
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function deleteTreatment(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['treatments'], 'readwrite');
        const objectStore = transaction.objectStore('treatments');
        const request = objectStore.delete(Number(id));
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

async function exportDatabase(format = 'json', options = {}) {
    const animals = await getAllAnimals();
    // Ordenar animales por número de placa (orden natural alfanumérico)
    animals.sort((a, b) => a.tagNumber.localeCompare(b.tagNumber, undefined, { numeric: true, sensitivity: 'base' }));
    const treatments = await getAllTreatments();
    const dateStr = new Date().toISOString().split('T')[0];

    // Determine filename suffix for PDF and XLSX (completo / compacto)
    let fileSuffix = '';
    if (format === 'pdf' || format === 'xlsx') {
        const reportType = options.reportType || 'completo';
        fileSuffix = reportType === 'compacto' ? '_compacto' : '_completo';
    }
    
    if (format === 'json') {
        const exportData = { animals, treatments };
        const data = JSON.stringify(exportData);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ganado_backup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } 
    else if (format === 'xlsx') {
        const reportType = options.reportType || 'completo';
        const isCompact = reportType === 'compacto';
        const selectedAnimal = isCompact ? (options.animalFields || []) : null;
        const selectedTreatment = isCompact ? (options.treatmentFields || []) : null;

        let animalsForExport;
        let treatmentsForExport = treatments;

        if (isCompact) {
            // Compact export: only selected columns
            animalsForExport = animals.map(a => {
                const row = {};
                if (selectedAnimal.includes('tagNumber')) row.tagNumber = a.tagNumber;
                if (selectedAnimal.includes('name')) row.name = a.name || '';
                if (selectedAnimal.includes('breed')) row.breed = a.breed || '';
                if (selectedAnimal.includes('birthInfo')) {
                    row.birthDate = a.birthDate || '';
                    row.ageMonths = a.ageMonths || '';
                }
                if (selectedAnimal.includes('weightKg')) row.weightKg = a.weightKg || '';
                return row;
            }).filter(r => Object.keys(r).length > 0);

            treatmentsForExport = treatments.map(t => {
                const row = {};
                if (selectedTreatment.includes('date')) row.date = t.date;
                if (selectedTreatment.includes('tagNumber')) row.tagNumber = t.tagNumber;
                if (selectedTreatment.includes('diagnosis')) row.diagnosis = t.diagnosis;
                if (selectedTreatment.includes('treatmentText')) row.treatmentText = t.treatmentText;
                if (selectedTreatment.includes('vetName')) row.vetName = t.vetName || '';
                if (selectedTreatment.includes('nextAppointment')) row.nextAppointment = t.nextAppointment || '';
                return row;
            }).filter(r => Object.keys(r).length > 0);
        } else {
            // Full export (exclude image for size)
            animalsForExport = animals.map(a => {
                const { image, ...rest } = a;
                return rest;
            });
            treatmentsForExport = treatments;
        }

        const wb = XLSX.utils.book_new();
        const wsAnimals = XLSX.utils.json_to_sheet(animalsForExport);
        XLSX.utils.book_append_sheet(wb, wsAnimals, "Animals");

        const wsTreatments = XLSX.utils.json_to_sheet(treatmentsForExport);
        XLSX.utils.book_append_sheet(wb, wsTreatments, "Treatments");

        XLSX.writeFile(wb, `ganado_datos${fileSuffix}_${dateStr}.xlsx`);
    }
    else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Reporte de Ganado", 14, 22);
        doc.setFontSize(11);
        doc.text(`Fecha: ${dateStr}`, 14, 30);
        
        const reportType = options.reportType || 'completo';
        const isCompact = reportType === 'compacto';
        const selectedAnimal = isCompact ? (options.animalFields || []) : ['tagNumber', 'name', 'breed', 'birthInfo', 'weightKg'];
        const selectedTreatment = isCompact ? (options.treatmentFields || []) : ['date', 'tagNumber', 'diagnosis', 'treatmentText', 'vetName', 'nextAppointment'];

        let currentY = 40;

        // Animals Table (only if fields selected)
        if (selectedAnimal.length > 0) {
            doc.text("Inventario de Animales", 14, currentY);

            const animalColumnMap = {
                tagNumber:   { label: 'N° Placa',        get: a => a.tagNumber },
                name:        { label: 'Nombre',          get: a => a.name || '-' },
                breed:       { label: 'Raza',            get: a => a.breed || '-' },
                birthInfo:   { label: 'Edad/Nacimiento', get: a => a.ageMonths ? `${a.ageMonths}m` : (a.birthDate || '-') },
                weightKg:    { label: 'Peso',            get: a => a.weightKg ? `${a.weightKg} kg` : '-' }
            };

            const animalHeaders = selectedAnimal.map(f => animalColumnMap[f]?.label || f);
            const animalRows = animals.map(a => selectedAnimal.map(f => animalColumnMap[f]?.get(a) ?? '-'));

            doc.autoTable({
                startY: currentY + 5,
                head: [animalHeaders],
                body: animalRows,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }
            });

            currentY = (doc.lastAutoTable?.finalY || currentY) + 12;
        }

        // Treatments Table
        if (selectedTreatment.length > 0) {
            doc.text("Historial de Tratamientos", 14, currentY);

            const treatmentColumnMap = {
                date:             { label: 'Fecha',          get: t => t.date },
                tagNumber:        { label: 'N° Placa',       get: t => t.tagNumber },
                diagnosis:        { label: 'Diagnóstico',    get: t => t.diagnosis },
                treatmentText:    { label: 'Tratamiento',    get: t => t.treatmentText },
                vetName:          { label: 'Veterinario',    get: t => t.vetName || '-' },
                nextAppointment:  { label: 'Próxima Cita',   get: t => t.nextAppointment || '-' }
            };

            const treatmentHeaders = selectedTreatment.map(f => treatmentColumnMap[f]?.label || f);
            const treatmentRows = treatments.map(t => selectedTreatment.map(f => treatmentColumnMap[f]?.get(t) ?? '-'));

            doc.autoTable({
                startY: currentY + 5,
                head: [treatmentHeaders],
                body: treatmentRows,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });
        }

        doc.save(`ganado_reporte${fileSuffix}_${dateStr}.pdf`);
    }
}

async function importDatabase(data) {
    try {
        let animals = [];
        let treatments = [];

        if (typeof data === 'string') {
            // JSON backup (string)
            const parsed = JSON.parse(data);
            // Backward compatibility: if array, it's just animals from v1
            if (Array.isArray(parsed)) {
                animals = parsed;
            } else if (parsed && typeof parsed === 'object') {
                animals = parsed.animals || [];
                treatments = parsed.treatments || [];
            } else {
                throw new Error("Formato inválido");
            }
        } else if (data && typeof data === 'object') {
            // Already parsed object (e.g. from XLSX import)
            animals = data.animals || [];
            treatments = data.treatments || [];
        } else {
            throw new Error("Formato inválido");
        }
        
        const transaction = db.transaction(['animals', 'treatments'], 'readwrite');
        const animalStore = transaction.objectStore('animals');
        const treatmentStore = transaction.objectStore('treatments');
        
        // Clear existing
        animalStore.clear();
        treatmentStore.clear();
        
        animals.forEach(animal => animalStore.add(animal));
        treatments.forEach(treatment => treatmentStore.add(treatment));

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        throw new Error("Error procesando el archivo de backup.");
    }
}
