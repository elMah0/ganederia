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

async function exportDatabase(format = 'json') {
    const animals = await getAllAnimals();
    const treatments = await getAllTreatments();
    const dateStr = new Date().toISOString().split('T')[0];
    
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
    else if (format === 'xml') {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<GanadoData>\n';
        xml += '  <Animals>\n';
        animals.forEach(a => {
            xml += '    <Animal>\n';
            for (let key in a) {
                if (key !== 'image') { // Exclude base64 image from XML to save space
                    xml += `      <${key}>${a[key] !== null ? a[key] : ''}</${key}>\n`;
                }
            }
            xml += '    </Animal>\n';
        });
        xml += '  </Animals>\n';
        
        xml += '  <Treatments>\n';
        treatments.forEach(t => {
            xml += '    <Treatment>\n';
            for (let key in t) {
                xml += `      <${key}>${t[key] !== null ? t[key] : ''}</${key}>\n`;
            }
            xml += '    </Treatment>\n';
        });
        xml += '  </Treatments>\n';
        xml += '</GanadoData>';

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ganado_datos_${dateStr}.xml`;
        a.click();
        URL.revokeObjectURL(url);
    }
    else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("Reporte de Ganado", 14, 22);
        doc.setFontSize(11);
        doc.text(`Fecha: ${dateStr}`, 14, 30);
        
        // Animals Table
        doc.text("Inventario de Animales", 14, 40);
        const animalRows = animals.map(a => [
            a.tagNumber, 
            a.name || '-', 
            a.breed || '-', 
            a.ageMonths ? `${a.ageMonths}m` : (a.birthDate || '-'), 
            a.weightKg ? `${a.weightKg} kg` : '-'
        ]);
        
        doc.autoTable({
            startY: 45,
            head: [['N° Placa', 'Nombre', 'Raza', 'Edad/Nacimiento', 'Peso']],
            body: animalRows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }
        });
        
        // Treatments Table
        let finalY = doc.lastAutoTable.finalY || 45;
        doc.text("Historial de Tratamientos", 14, finalY + 15);
        
        const treatmentRows = treatments.map(t => [
            t.date,
            t.tagNumber,
            t.diagnosis,
            t.treatmentText,
            t.vetName || '-'
        ]);
        
        doc.autoTable({
            startY: finalY + 20,
            head: [['Fecha', 'N° Placa', 'Diagnóstico', 'Tratamiento', 'Veterinario']],
            body: treatmentRows,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });
        
        doc.save(`ganado_reporte_${dateStr}.pdf`);
    }
}

async function importDatabase(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        
        let animals = [];
        let treatments = [];
        
        // Backward compatibility: if array, it's just animals from v1
        if (Array.isArray(parsed)) {
            animals = parsed;
        } else if (parsed && typeof parsed === 'object') {
            animals = parsed.animals || [];
            treatments = parsed.treatments || [];
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
